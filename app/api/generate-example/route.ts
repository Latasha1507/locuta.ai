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
import { generateModelAnswerText, synthesizeModelAnswer } from '@/lib/model-answer'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
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
        'id, user_id, ai_example_text, ai_example_audio, ai_example_audio_url, user_transcript, category, module_number, level_number, tone, feedback',
      )
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Already generated — hand it straight back. If this is an old session
    // that only has base64 (from before audio moved to storage), heal it here:
    // upload those bytes once, save the URL, and return a streamable link so
    // the compare player works for old sessions too.
    if (session.ai_example_text && (session.ai_example_audio_url || session.ai_example_audio)) {
      let audioUrl: string = session.ai_example_audio_url || ''
      if (!audioUrl && session.ai_example_audio) {
        try {
          const admin = createAdminClient()
          const healed = await uploadAudio(
            admin,
            `examples/${session.user_id}/${session.id}.mp3`,
            Buffer.from(session.ai_example_audio, 'base64'),
          )
          if (healed) {
            audioUrl = healed
            await admin
              .from('sessions')
              .update({ ai_example_audio_url: healed, ai_example_audio: '' })
              .eq('id', session.id)
          }
        } catch (e) {
          console.error('⚠️ base64->URL backfill failed (non-critical):', e)
        }
      }
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        text: session.ai_example_text,
        audioUrl,
        audio: audioUrl ? '' : session.ai_example_audio,
        processingTime: Date.now() - started,
      })
    }

    // The lesson (the framework the answer must demonstrate) plus the fixes the
    // feedback already surfaced for THIS attempt — so the rewrite applies the
    // exact corrections the learner was told about. Single source of truth for
    // the prompt logic lives in lib/model-answer.ts, shared with /api/feedback.
    const { data: lesson } = await supabase
      .from('lessons')
      .select('practice_prompt, level_title, lesson_explanation, expected_duration_sec, feedback_focus_areas')
      .eq('category', session.category)
      .eq('module_number', session.module_number)
      .eq('level_number', session.level_number)
      .single()

    const focusAreas = Array.isArray(lesson?.feedback_focus_areas)
      ? lesson.feedback_focus_areas.join(', ')
      : lesson?.feedback_focus_areas || 'Clarity, Confidence, Delivery'

    const chosenTone = tone || session.tone || 'Normal'
    const fb = (session.feedback ?? {}) as Record<string, unknown>

    const { text: exampleText, personalised } = await generateModelAnswerText(getOpenAI(), {
      transcript: session.user_transcript || '',
      practicePrompt: lesson?.practice_prompt || 'Speak clearly and confidently.',
      lessonTitle: lesson?.level_title || '',
      lessonExplanation: lesson?.lesson_explanation || '',
      focusAreas,
      expectedDurationSec: Number(lesson?.expected_duration_sec) || 60,
      tone: chosenTone,
      grammarFixes: Array.isArray(fb.grammar_fixes)
        ? (fb.grammar_fixes as { before?: string; after?: string }[])
        : [],
      improvements: Array.isArray(fb.improvements) ? (fb.improvements as string[]) : [],
    })

    if (!exampleText) {
      return NextResponse.json(
        { error: 'Failed to generate the model answer' },
        { status: 500 },
      )
    }

    const buffer = await synthesizeModelAnswer(getOpenAI(), exampleText, chosenTone)

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
      personalised,
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
