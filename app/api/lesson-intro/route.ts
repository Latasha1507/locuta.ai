import { createClient } from '@/lib/supabase/server'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { introPath, greetingPath, uploadAudio, audioExists, publicUrl } from '@/lib/audio-storage'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazily constructed. Building the client at module scope throws during
// import if OPENAI_API_KEY is missing, which turns a config problem into a
// 500 on every request to the whole route (including the auth check).
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const CATEGORY_MAP: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'fable',
  'Funny': 'onyx',
  'Diplomatic': 'nova',
  'Bossy': 'echo'
}

const TONE_CHARACTERISTICS: Record<string, { goal: string; style: string; delivery: string }> = {
  'Normal': {
    goal: 'Clear, simple, everyday conversational style',
    style: 'Speak in a neutral, natural tone like a friendly everyday person—neither too formal nor too casual',
    delivery: 'Use clear words, steady pacing, and straightforward delivery'
  },
  'Supportive': {
    goal: 'Soft, kind, reassuring',
    style: 'Speak gently and empathetically, like a supportive friend or mentor',
    delivery: 'Use a slower pace, softer intonation, and warmth in your voice. Emphasize comfort and reassurance, making the listener feel safe and cared for. Provide comfort and warmth while maintaining a normal pitch'
  },
  'Inspiring': {
    goal: 'Energize, lift confidence, sound passionate',
    style: 'Speak with passion and energy, like a motivational coach',
    delivery: 'Use an uplifting tone, slightly faster pacing, and emphasize positive words. Add warmth and confidence, making the listener feel capable and empowered'
  },
  'Funny': {
    goal: 'Entertaining, playful, casual',
    style: 'Speak in a playful and humorous way, like a friend cracking light-hearted jokes',
    delivery: 'Use lively intonation, slight exaggeration, and occasional pauses for comedic timing. Keep it friendly and engaging'
  },
  'Diplomatic': {
    goal: 'Calm, professional, trustworthy',
    style: 'Speak in a balanced, professional, and respectful tone, like a skilled diplomat',
    delivery: 'Use moderate pacing, steady intonation, and avoid extremes. Sound thoughtful, fair, and neutral while keeping a friendly undertone'
  },
  'Bossy': {
    goal: 'Commanding, no-nonsense, authoritative',
    style: 'Speak with firmness and authority, like a confident leader giving instructions',
    delivery: 'Use direct words and faster pacing. Sound assertive and commanding, but not rude'
  }
}

// ⭐ NEW: Generate personalized greeting separately
async function generatePersonalGreeting(
  userName: string | null,
  tone: string,
  supabaseAdmin: SupabaseClient,
) {
  if (!userName) {
    return { text: '', audio: '', audioUrl: '' }
  }

  const greetingText = `Hello, ${userName}.`
  const path = greetingPath(userName, tone)

  // Two people called "Latasha" on the Supportive coach share one object.
  // A ~50ms existence check beats a ~700ms TTS call we've already paid for.
  if (await audioExists(supabaseAdmin, path)) {
    return { text: greetingText, audio: '', audioUrl: publicUrl(supabaseAdmin, path) }
  }

  const voice = VOICE_MAP[tone] || 'shimmer'
  const mp3Response = await getOpenAI().audio.speech.create({
    model: 'tts-1',
    voice: voice,
    input: greetingText,
    speed: tone === 'Inspiring' ? 1.05 : tone === 'Bossy' ? 1.1 : tone === 'Supportive' ? 0.95 : 1.0,
  })

  const buffer = Buffer.from(await mp3Response.arrayBuffer())
  const audioUrl = await uploadAudio(supabaseAdmin, path, buffer)

  return {
    text: greetingText,
    // Only fall back to base64 if the upload failed.
    audio: audioUrl ? '' : buffer.toString('base64'),
    audioUrl: audioUrl ?? '',
  }
}


export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // This route calls OpenAI TTS, so it costs real money on every hit — gate
    // it with the same server-side limit as /api/feedback.
    const limit = await checkSessionLimitServer(user.id)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            limit.reason === 'trial_expired'
              ? 'Your free trial has ended. Upgrade to keep practising.'
              : "You've used all your practice sessions for today.",
          reason: limit.reason,
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { tone, categoryId, moduleId, lessonId } = body

    const categoryName = CATEGORY_MAP[categoryId]
    if (!categoryName) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's first name for greeting
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name?.split(' ')[0] || null

    // ⭐ STEP 1: Check cache first (WITHOUT name in lookup)
    const { data: cachedIntro } = await supabaseAdmin
      .from('cached_lesson_intros')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .eq('tone', tone)
      .single()

    // ⭐ STEP 2: Serve from cache the moment we have one.
    //
    // LATENCY FIX: this used to require `generation_count >= 5`, meaning the
    // first FIVE visitors to every (lesson x tone) combination each waited on a
    // full GPT-4o + TTS round trip (~8-15s) — and we paid for all five — even
    // though the audio had already been cached on the very first pass. The
    // intro is identical for a given lesson+tone, so there is nothing to gain
    // by regenerating it. Only the first visitor ever waits now.
    if (cachedIntro?.intro_audio_url || cachedIntro?.intro_audio_base64) {
      const path = introPath(categoryName, parseInt(moduleId), parseInt(lessonId), tone)

      let audioUrl: string = cachedIntro.intro_audio_url ?? ''

      // Legacy rows hold base64 and no URL. Migrate them to Storage the first
      // time they're served, then never again — no separate backfill job needed.
      if (!audioUrl && cachedIntro.intro_audio_base64) {
        const migrated = await uploadAudio(
          supabaseAdmin,
          path,
          Buffer.from(cachedIntro.intro_audio_base64, 'base64'),
        )
        if (migrated) {
          audioUrl = migrated
          await supabaseAdmin
            .from('cached_lesson_intros')
            .update({ intro_audio_url: migrated })
            .eq('id', cachedIntro.id)
          console.log('📦 Migrated cached intro to Storage:', path)
        }
      }

      const greeting = await generatePersonalGreeting(userName, tone, supabaseAdmin)

      return NextResponse.json({
        // Preferred: a streaming URL. base64 stays only as a fallback for rows
        // that failed to migrate.
        audioUrl,
        audioBase64: audioUrl ? '' : cachedIntro.intro_audio_base64,
        greetingAudioUrl: greeting.audioUrl,
        greetingAudio: greeting.audio,
        greetingText: greeting.text,
        transcript: cachedIntro.intro_text,
        lessonTitle: cachedIntro.lesson_title,
        practice_prompt: cachedIntro.practice_prompt,
        practice_example: '',
      })
    }

    // ⭐ STEP 3: Not cached enough, generate fresh (WITHOUT name in prompt)
    console.log(cachedIntro 
      ? `🔄 Generating fresh intro (${cachedIntro.generation_count}/5)...` 
      : '🔄 Generating fresh intro (first time)...'
    )

    // Fetch lesson data
    const { data: lessons, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))

    if (lessonError || !lessons || lessons.length === 0) {
      console.error('Lesson error:', lessonError)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const lesson = lessons[0]
    const levelTitle = lesson.level_title || 'Lesson'
    const practicePrompt = lesson.practice_prompt || 'Speak clearly and confidently'

    const toneChar = TONE_CHARACTERISTICS[tone] || TONE_CHARACTERISTICS['Normal']

    // ⭐ MODIFIED: System prompt WITHOUT name personalization
    const systemPrompt = `You are a speaking coach with a specific personality. Your coaching style is defined as:

**Goal**: ${toneChar.goal}
**Communication Style**: ${toneChar.style}
**Delivery Instructions**: ${toneChar.delivery}

Your job is to introduce a speaking lesson in an engaging way that matches this personality perfectly. Keep the introduction natural, motivating, and about 30-45 seconds when spoken aloud (approximately 90-120 words).

Structure your introduction as follows:
1. Start directly with the lesson topic (NO greeting, NO name - just begin with the content)
2. Briefly explain what the lesson is about and why it matters
3. Clearly state the specific task they'll be practicing
4. Give them a helpful tip or example to guide them
5. End with an encouraging call to action to start recording

CRITICAL: Embody the ${tone} coaching style throughout. ${toneChar.style} ${toneChar.delivery}
Make it conversational and engaging, not robotic. Let your ${tone} personality shine through!
DO NOT include any greeting or user name - start directly with "It's wonderful to have you..." or similar.`

    const userPrompt = `Create an engaging introduction for this speaking lesson in your ${tone} coaching style:
Lesson Title: ${lesson.level_title || 'Speaking Practice'}
Module: ${lesson.module_title || 'Practice Module'}
Basic Explanation: ${lesson.lesson_explanation || 'Practice your speaking skills'}
Practice Task: ${lesson.practice_prompt || 'Speak clearly and confidently'}
Example/Tips: ${lesson.practice_example || 'Focus on clarity and confidence'}
Focus Areas: ${Array.isArray(lesson.feedback_focus_areas) ? lesson.feedback_focus_areas.join(', ') : 'General speaking'}

Remember: You're a ${tone} coach. Start DIRECTLY with the content (no greeting). ${toneChar.goal}. ${toneChar.style}`

    // ⭐ Run in parallel: lesson content generation + personalized greeting
    const [completion, greeting] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 300
      }),
      generatePersonalGreeting(userName, tone, supabaseAdmin)
    ])

    const lessonContent = completion.choices[0].message.content || ''
    const voice = VOICE_MAP[tone] || 'shimmer'

    // Generate TTS for lesson content (without name)
    const mp3Response = await getOpenAI().audio.speech.create({
      model: 'tts-1', // was tts-1-hd: ~2x slower for no meaningful gain on a coaching voice
      voice: voice,
      input: lessonContent,
      speed: tone === 'Inspiring' ? 1.05 : tone === 'Bossy' ? 1.1 : tone === 'Supportive' ? 0.95 : 1.0
    })

    const buffer = Buffer.from(await mp3Response.arrayBuffer())

    // Push the mp3 to Storage so every future listener streams it from the CDN
    // instead of pulling a base64 blob out of Postgres.
    const path = introPath(categoryName, parseInt(moduleId), parseInt(lessonId), tone)
    const audioUrl = await uploadAudio(supabaseAdmin, path, buffer)

    // base64 is now only a fallback for when Storage isn't reachable.
    const audioBase64 = audioUrl ? '' : buffer.toString('base64')

    // ⭐ STEP 4: Save to cache or increment count (NO name in cache)
    if (cachedIntro) {
      await supabaseAdmin
        .from('cached_lesson_intros')
        .update({
          generation_count: cachedIntro.generation_count + 1,
          intro_audio_url: audioUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', cachedIntro.id)
      
      console.log(`📊 Cache count updated: ${cachedIntro.generation_count + 1}/5`)
    } else {
      const { error: cacheError } = await supabaseAdmin
        .from('cached_lesson_intros')
        .insert({
          category: categoryName,
          module_number: parseInt(moduleId),
          level_number: parseInt(lessonId),
          tone: tone,
          intro_text: lessonContent, // WITHOUT name
          intro_audio_url: audioUrl, // streams from the CDN
          intro_audio_base64: audioBase64, // fallback only; '' when the upload worked
          practice_prompt: practicePrompt,
          lesson_title: levelTitle,
          generation_count: 1
        })
      
      if (cacheError) {
        console.error('⚠️ Cache save failed (non-critical):', cacheError)
      } else {
        console.log('💾 Created cache entry')
      }
    }

    return NextResponse.json({
      audioUrl,
      audioBase64: audioBase64,
      greetingAudioUrl: greeting.audioUrl,
      greetingAudio: greeting.audio,
      greetingText: greeting.text,
      transcript: lessonContent,
      lessonTitle: lesson.level_title || 'Lesson',
      moduleTitle: lesson.module_title || 'Module',
      practice_prompt: lesson.practice_prompt || 'Practice speaking clearly and confidently.',
      practice_example: lesson.practice_example || ''
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson introduction' },
      { status: 500 }
    )
  }
}