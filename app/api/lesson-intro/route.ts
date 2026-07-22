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

// Generate a personalized, time-aware greeting, cached separately from the
// (name-free) lesson content so one user's name is never served to another.
async function generatePersonalGreeting(
  userName: string | null,
  tone: string,
  daypart: 'morning' | 'afternoon' | 'evening',
  supabaseAdmin: SupabaseClient,
) {
  if (!userName) {
    return { text: '', audio: '', audioUrl: '' }
  }

  // "Good morning, Latasha. Welcome back." — a real coach opens with the time
  // of day and the person's name; it's the cheapest thing that makes the whole
  // page feel like it's speaking to *them*.
  const timeWord = daypart === 'morning' ? 'Good morning' : daypart === 'evening' ? 'Good evening' : 'Good afternoon'
  const greetingText = `${timeWord}, ${userName}. Welcome back.`
  const path = greetingPath(userName, tone, daypart)

  // Two people called "Latasha" on the Supportive coach, same daypart, share
  // one object. A ~50ms existence check beats a ~700ms TTS call.
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


// Map module number to the learner's proficiency. Module 1 is a beginner; the
// example must be simple enough that a beginner could actually SAY it. Later
// modules can raise the bar. A learning tool whose examples are written at C2
// level teaches nobody — the model answer has to sit just above where the
// learner already is, not far above it.
function proficiencyForModule(moduleNumber: number): { level: string; guidance: string } {
  if (moduleNumber <= 1) {
    return {
      level: 'beginner (CEFR A2-B1)',
      guidance:
        'Use simple, everyday words a beginner English learner would know. Short sentences (8-14 words). ' +
        'NO literary or advanced vocabulary (avoid words like "bustling", "shimmered", "enveloped", "vibrant", "aroma"). ' +
        'Plain concrete details a real person would say out loud. Sound like a confident beginner, not a novelist.',
    }
  }
  if (moduleNumber <= 3) {
    return {
      level: 'intermediate (CEFR B1-B2)',
      guidance:
        'Clear everyday language with a little more variety. Medium sentences. A few descriptive words are fine, ' +
        'but keep it natural and speakable, not literary. Sound like a comfortable intermediate speaker.',
    }
  }
  return {
    level: 'advanced (CEFR B2-C1)',
    guidance:
      'More expressive language and varied sentences are welcome, but it must still sound like natural spoken English ' +
      'a person would actually say — never purple or over-written.',
  }
}

// Short tone brief so the example matches the coach the user picked. Choose the
// Funny coach and the example should be genuinely light; a flat neutral example
// would undercut the vibe they selected.
const EXAMPLE_TONE_BRIEF: Record<string, string> = {
  Funny: 'Make it genuinely light and a bit funny — a small joke or playful aside is good. Still complete the task.',
  Supportive: 'Warm, gentle, encouraging in feel.',
  Inspiring: 'A little uplifting and energised, but not over the top.',
  Bossy: 'Direct, punchy, confident and to the point.',
  Diplomatic: 'Calm, measured, polished.',
  Normal: 'Clear, friendly, everyday.',
}

// Generate a short WORKED EXAMPLE pitched at the learner's LEVEL and in the
// coach's TONE. Task-specific, so it caches per (lesson x tone) — and because
// proficiency comes from the module (part of that key), level and tone are both
// already distinct cache entries.
async function generateWorkedExample(
  lessonTitle: string,
  practicePrompt: string,
  lessonExplanation: string,
  moduleNumber: number,
  tone: string,
): Promise<string> {
  try {
    const prof = proficiencyForModule(moduleNumber)
    const toneBrief = EXAMPLE_TONE_BRIEF[tone] || EXAMPLE_TONE_BRIEF['Normal']
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You write a single short model answer that a LANGUAGE LEARNER could say out loud to complete a speaking task. ' +
            'The learner is here to improve, so the example must be at THEIR level — achievable, not intimidating. ' +
            `Proficiency: ${prof.level}. ${prof.guidance} ` +
            `Tone: ${toneBrief} ` +
            'Write ONLY the spoken answer itself — first person, natural, 40-60 words, no preamble, no quotation marks, ' +
            'no "here is an example", no coaching notes. It must satisfy the task and lightly demonstrate the lesson skill.',
        },
        {
          role: 'user',
          content: `Lesson: ${lessonTitle}\nSkill: ${lessonExplanation}\nTask: ${practicePrompt}\n\nWrite one model spoken answer at the stated level and tone.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 160,
    })
    return completion.choices[0]?.message?.content?.trim() || ''
  } catch (e) {
    console.error('⚠️ Worked-example generation failed (non-critical):', e)
    return ''
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
    // The client sends its local time-of-day; the server can't know the user's
    // timezone. Validated to the three buckets so a bad value can't poison the
    // greeting cache path.
    const daypart: 'morning' | 'afternoon' | 'evening' =
      body.daypart === 'morning' || body.daypart === 'evening' ? body.daypart : 'afternoon'

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

      const greeting = await generatePersonalGreeting(userName, tone, daypart, supabaseAdmin)

      // The worked example is cached on the row. Regenerate if it's missing OR
      // if it predates the proficiency/tone rewrite — old examples were written
      // at one flat (too-high) level. The tag is stored inline so we don't need
      // another column; it's stripped before the example is ever shown.
      const EXAMPLE_VERSION = 'v2'
      const raw: string = cachedIntro.practice_example_ai || ''
      let workedExample = raw.startsWith(`[${EXAMPLE_VERSION}]`) ? raw.slice(`[${EXAMPLE_VERSION}]`.length) : ''
      if (!workedExample) {
        workedExample = await generateWorkedExample(
          cachedIntro.lesson_title || '',
          cachedIntro.practice_prompt || '',
          cachedIntro.intro_text || '',
          parseInt(moduleId),
          tone,
        )
        if (workedExample) {
          await supabaseAdmin
            .from('cached_lesson_intros')
            .update({ practice_example_ai: `[${EXAMPLE_VERSION}]${workedExample}` })
            .eq('id', cachedIntro.id)
        }
      }

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
        practice_example: workedExample,
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

    // ⭐ Run in parallel: lesson content + personalized greeting + worked example
    const [completion, greeting, workedExample] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 300
      }),
      generatePersonalGreeting(userName, tone, daypart, supabaseAdmin),
      generateWorkedExample(
        lesson.level_title || '',
        lesson.practice_prompt || '',
        lesson.lesson_explanation || '',
        parseInt(moduleId),
        tone,
      ),
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
          practice_example_ai: workedExample ? `[v2]${workedExample}` : null,
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
      practice_example: workedExample || lesson.practice_example || ''
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson introduction' },
      { status: 500 }
    )
  }
}