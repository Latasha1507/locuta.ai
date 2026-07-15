// Generates a MODEL ANSWER for the user's own attempt.
//
// This is not a template. It takes what the user actually said (their topic,
// their ideas, their words), then rewrites it the way a strong speaker would
// have delivered it: correct grammar, richer vocabulary, the framework the
// lesson teaches, and the voice of the coach they chose. The point is
// "here is YOUR answer, done well" — not "here is A answer".

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { uploadAudio, AUDIO_BUCKET } from '@/lib/audio-storage'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const VOICE_MAP: Record<string, string> = {
  Normal: 'shimmer',
  Supportive: 'nova',
  Inspiring: 'fable',
  Funny: 'onyx',
  Diplomatic: 'nova',
  Bossy: 'echo',
}

// How the model answer should *sound*, per coach. Same content, different voice.
const TONE_STYLE: Record<string, string> = {
  Normal: 'clear, plain and conversational',
  Supportive: 'warm, gentle and encouraging',
  Inspiring: 'energetic and passionate, building to a strong finish',
  Funny: 'light and playful, with a touch of humour, but still on task',
  Diplomatic: 'calm, measured and professional',
  Bossy: 'direct, punchy and commanding, no hedging',
}

export async function POST(request: NextRequest) {
  const started = Date.now()

  try {
    const { sessionId, tone } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session } = await supabase
      .from('sessions')
      .select(
        'id, user_id, ai_example_text, ai_example_audio, ai_example_audio_url, user_transcript, category, module_number, level_number, tone',
      )
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Already generated — hand it straight back.
    if (session.ai_example_text && (session.ai_example_audio_url || session.ai_example_audio)) {
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        text: session.ai_example_text,
        audioUrl: session.ai_example_audio_url || '',
        audio: session.ai_example_audio_url ? '' : session.ai_example_audio,
        processingTime: Date.now() - started,
      })
    }

    // The lesson itself — this is what the model answer must demonstrate.
    const { data: lesson } = await supabase
      .from('lessons')
      .select('practice_prompt, level_title, lesson_explanation, practice_example, expected_duration_sec, feedback_focus_areas')
      .eq('category', session.category)
      .eq('module_number', session.module_number)
      .eq('level_number', session.level_number)
      .single()

    const practicePrompt = lesson?.practice_prompt || 'Speak clearly and confidently.'
    const lessonExplanation = lesson?.lesson_explanation || ''
    const lessonTips = lesson?.practice_example || ''
    const expectedDuration = lesson?.expected_duration_sec || 60
    // ~130 words per minute of natural speech.
    const targetWords = Math.max(40, Math.round((expectedDuration / 60) * 130))
    const focusAreas = Array.isArray(lesson?.feedback_focus_areas)
      ? lesson.feedback_focus_areas.join(', ')
      : lesson?.feedback_focus_areas || 'Clarity, Confidence, Delivery'

    const chosenTone = tone || session.tone || 'Normal'
    const toneStyle = TONE_STYLE[chosenTone] || TONE_STYLE.Normal

    const transcript = (session.user_transcript || '').trim()
    const hasTranscript = transcript.length > 15

    const systemPrompt = `You are an expert speaking coach writing a MODEL ANSWER for a specific student.

This is the single most valuable moment in the lesson: the student hears their OWN attempt, delivered the way it should have been. So the model answer must be recognisably theirs — same topic, same story, same examples, same ideas — but performed properly.

Rules:
- Keep the student's subject matter, anecdotes, names and specific details. Do NOT invent a different topic.
- Fix grammar. Upgrade weak or repeated vocabulary. Cut filler ("um", "like", "you know", "basically").
- Apply the framework the lesson teaches. This is the point of the exercise.
- Sound like a confident person SPEAKING, not like an essay being read. Contractions, natural rhythm, short sentences where they land harder.
- Deliver it in a ${toneStyle} voice.
- Output ONLY the spoken words. No labels, no headings, no commentary, no quotation marks.`

    const userPrompt = hasTranscript
      ? `LESSON: ${lesson?.level_title || 'Speaking practice'}
WHAT THE LESSON TEACHES: ${lessonExplanation.slice(0, 600)}
${lessonTips ? `COACH'S TIP: ${lessonTips}` : ''}
THE TASK: ${practicePrompt}
SKILLS BEING ASSESSED: ${focusAreas}
LENGTH: about ${targetWords} words (${expectedDuration} seconds spoken)

WHAT THE STUDENT ACTUALLY SAID (verbatim, with all its mistakes):
"""
${transcript.slice(0, 1500)}
"""

Rewrite THIS answer as the student could have delivered it at their best.
Keep their topic and their specific details — the moments, people and examples they chose.
Apply the lesson's framework to it, fix the language, and remove the filler.
They should hear it and think "that's my story, told properly."`
      : // Fallback: they said almost nothing usable, so we can't personalise.
        `LESSON: ${lesson?.level_title || 'Speaking practice'}
WHAT THE LESSON TEACHES: ${lessonExplanation.slice(0, 600)}
THE TASK: ${practicePrompt}
SKILLS BEING ASSESSED: ${focusAreas}
LENGTH: about ${targetWords} words (${expectedDuration} seconds spoken)

The student's recording was too short to build on, so write a strong model answer for this task that clearly demonstrates the lesson's framework.`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o', // 4o-mini was noticeably worse at holding onto the student's own details
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.7,
    })

    const exampleText = completion.choices[0]?.message?.content?.trim() || 'Example not available.'

    const voice = VOICE_MAP[chosenTone] || 'shimmer'
    const speech = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice,
      input: exampleText,
      speed: chosenTone === 'Bossy' ? 1.05 : chosenTone === 'Supportive' ? 0.95 : 1.0,
    })

    const buffer = Buffer.from(await speech.arrayBuffer())

    const admin = createAdminClient()

    // Stream it, don't base64 it into a DB row. Path is per-session, so it is
    // unique to this user's attempt.
    const path = `examples/${session.user_id}/${session.id}.mp3`
    const audioUrl = await uploadAudio(admin, path, buffer)
    const audioBase64 = audioUrl ? '' : buffer.toString('base64')

    // sessions has no UPDATE policy for the user role, so this must go through
    // the service client. We already verified ownership above.
    const { error: updateError } = await admin
      .from('sessions')
      .update({
        ai_example_text: exampleText,
        ai_example_audio_url: audioUrl,
        ai_example_audio: audioBase64,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('❌ Failed to save example:', updateError.message)
      // The content is still good — return it rather than failing the user.
    }

    return NextResponse.json({
      success: true,
      text: exampleText,
      audioUrl: audioUrl || '',
      audio: audioBase64,
      personalised: hasTranscript,
      processingTime: Date.now() - started,
    })
  } catch (error) {
    console.error('❌ generate-example failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate the model answer', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}

// ── GET: poll for a previously generated example ────────────────────────────
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  const wantContent = request.nextUrl.searchParams.get('content') === 'true'
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  // SECURITY: the reference implementation read this with the service-role
  // client and NO auth check, reasoning that "sessionId is unguessable".
  // That is security through obscurity — session ids leak through logs,
  // referrers, screenshots and browser history, and this endpoint returns a
  // rewrite of the user's own speech. Authenticate, then check ownership.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('sessions')
    .select('ai_example_text, ai_example_audio, ai_example_audio_url')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const hasText = !!session.ai_example_text
  const hasAudio = !!(session.ai_example_audio_url || session.ai_example_audio)

  if (wantContent) {
    return NextResponse.json({
      hasText,
      hasAudio,
      text: session.ai_example_text || null,
      audioUrl: session.ai_example_audio_url || '',
      audio: session.ai_example_audio_url ? '' : session.ai_example_audio || null,
    })
  }

  return NextResponse.json({ hasText, hasAudio, bucket: AUDIO_BUCKET })
}
