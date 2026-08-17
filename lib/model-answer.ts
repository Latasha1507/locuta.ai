// THE "COACH VERSION" — a model answer for the feedback page.
//
// Single source of truth. Two routes need this identical logic:
//   • /api/feedback         — generates it up front, right after scoring, so the
//                             feedback page shows it without a second click.
//   • /api/generate-example — regenerates it on demand for old sessions, or if
//                             the up-front generation failed.
//
// It is NOT a generic template. It takes what the student ACTUALLY said (their
// topic, their ideas, their words) and rewrites it the way a strong speaker
// would have delivered it — correct grammar, richer vocabulary, the framework
// the lesson teaches, in the voice of the coach they chose. The point is
// "here is YOUR answer, done well", not "here is A answer".

import type OpenAI from 'openai'

// OpenAI TTS voice per coach tone.
export const MODEL_ANSWER_VOICE: Record<string, string> = {
  Normal: 'shimmer',
  Supportive: 'nova',
  Inspiring: 'fable',
  Funny: 'onyx',
  Diplomatic: 'nova',
  Bossy: 'echo',
}

// How the model answer should *sound* per coach — same content, different delivery.
const TONE_STYLE: Record<string, string> = {
  Normal: 'clear, plain and conversational',
  Supportive: 'warm, gentle and encouraging',
  Inspiring: 'energetic and passionate, building to a strong finish',
  Funny: 'light and playful, with a touch of humour, but still on task',
  Diplomatic: 'calm, measured and professional',
  Bossy: 'direct, punchy and commanding, no hedging',
}

// Small TTS speed nudges per tone (1.0 = default).
const TONE_SPEED: Record<string, number> = {
  Bossy: 1.05,
  Supportive: 0.95,
}

// A recording must contain at least this many words before we treat it as
// something we can personalise. Below this — they barely spoke, or the
// transcription came back near-empty — we fall back to a clean generic model
// answer for the task rather than "personalise" thin air. (The old bar was a
// 15-CHARACTER string length, so ~2 words of noise counted as a real answer.)
const MIN_WORDS_TO_PERSONALISE = 8

export function hasUsableTranscript(transcript: string): boolean {
  return (transcript || '').trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS_TO_PERSONALISE
}

export interface ModelAnswerInput {
  /** What the student actually said (Whisper transcript). */
  transcript: string
  practicePrompt: string
  lessonTitle?: string
  lessonExplanation?: string
  focusAreas?: string
  expectedDurationSec?: number
  tone: string
  /** The exact fixes the feedback already surfaced, so the rewrite demonstrably
      applies them and "what to fix" stays in sync with "done properly". */
  grammarFixes?: { before?: string; after?: string }[]
  improvements?: string[]
}

/** Builds the system + user messages. Exposed separately so it's unit-testable
    without an OpenAI call. */
export function buildModelAnswerMessages(input: ModelAnswerInput): {
  system: string
  user: string
  personalised: boolean
  targetWords: number
} {
  const tone = input.tone || 'Normal'
  const toneStyle = TONE_STYLE[tone] || TONE_STYLE.Normal
  const expectedDuration = input.expectedDurationSec || 30
  // ~130 words per minute of natural speech.
  const targetWords = Math.max(12, Math.round((expectedDuration / 60) * 130))
  const transcript = (input.transcript || '').trim()
  const personalised = hasUsableTranscript(transcript)
  const focusAreas = input.focusAreas || 'Clarity, Confidence, Delivery'
  const lessonTitle = input.lessonTitle || 'Speaking practice'
  const lessonExplanation = (input.lessonExplanation || '').slice(0, 600)

  const system = `You are an expert speaking coach producing a MODEL ANSWER for one specific student.

This is the most valuable moment in the lesson: the student hears their OWN attempt, delivered the way it should have been. The answer must be recognisably theirs — same topic, same story, same examples, same ideas — but performed properly.

Rules:
- Keep the student's subject matter, anecdotes, names and specific details. Never invent a different topic.
- Fix grammar. Upgrade weak or repeated vocabulary. Cut filler ("um", "like", "you know", "basically").
- Apply the framework the lesson teaches — that is the point of the exercise.
- Sound like a confident person SPEAKING, not an essay being read: contractions, natural rhythm, short sentences where they land harder.
- Deliver it in a ${toneStyle} voice.
- Output ONLY the spoken words. No labels, headings, commentary or quotation marks.`

  const fixes = (input.grammarFixes || []).filter((g) => g && g.before && g.after)
  const fixesBlock = fixes.length
    ? `\nMISTAKES THE COACH FLAGGED (the rewrite must fix each one):\n` +
      fixes.map((g) => `- "${g.before}" → "${g.after}"`).join('\n')
    : ''
  const improvements = (input.improvements || []).filter(Boolean)
  const improveBlock = improvements.length
    ? `\nWHAT TO IMPROVE (demonstrate these in the rewrite):\n` +
      improvements.map((s) => `- ${s}`).join('\n')
    : ''

  const user = personalised
    ? `LESSON: ${lessonTitle}
WHAT THE LESSON TEACHES: ${lessonExplanation}
THE TASK: ${input.practicePrompt}
SKILLS BEING ASSESSED: ${focusAreas}
LENGTH: about ${targetWords} words (${expectedDuration} seconds spoken)${fixesBlock}${improveBlock}

WHAT THE STUDENT ACTUALLY SAID (verbatim, with all its mistakes):
"""
${transcript.slice(0, 1500)}
"""

Rewrite THIS answer as the student could have delivered it at their best.
Keep their topic and their specific details — the moments, people and examples they chose.
Apply the lesson's framework, fix the language, and remove the filler.
They should hear it and think "that's my story, told properly."`
    : // Fallback: they said almost nothing usable, so we can't personalise.
      `LESSON: ${lessonTitle}
WHAT THE LESSON TEACHES: ${lessonExplanation}
THE TASK: ${input.practicePrompt}
SKILLS BEING ASSESSED: ${focusAreas}
LENGTH: about ${targetWords} words (${expectedDuration} seconds spoken)

The student's recording was too short to build on, so write a strong model answer for this task that clearly demonstrates the lesson's framework, delivered in a ${toneStyle} voice.`

  return { system, user, personalised, targetWords }
}

/** Generate the model-answer TEXT.
    Temperature is deliberately LOW: the job is fidelity to the student's own
    content, not creative invention. High temperature made it drift off their
    actual answer and paraphrase a generic one. */
export async function generateModelAnswerText(
  openai: OpenAI,
  input: ModelAnswerInput,
): Promise<{ text: string; personalised: boolean }> {
  const { system, user, personalised } = buildModelAnswerMessages(input)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // 4o-mini was noticeably worse at holding onto the student's own details
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 700,
    temperature: 0.35,
  })
  const text = completion.choices[0]?.message?.content?.trim() || ''
  return { text, personalised }
}

/** Synthesize the model answer to speech, returning the MP3 bytes. */
export async function synthesizeModelAnswer(
  openai: OpenAI,
  text: string,
  tone: string,
): Promise<Buffer> {
  const voice = MODEL_ANSWER_VOICE[tone] || 'shimmer'
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voice: voice as any,
    input: text,
    speed: TONE_SPEED[tone] || 1.0,
  })
  return Buffer.from(await speech.arrayBuffer())
}
