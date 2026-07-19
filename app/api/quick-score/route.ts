import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  promptById,
  wordCount,
  countFillers,
  countRestarts,
  computeWpm,
  paceScore,
  fluencyScore,
  flowScore,
  overallScore,
  paceFeedback,
  fluencyFeedback,
  flowFeedback,
  pickLines,
  PAUSE_THRESHOLD_SEC,
  SCORE_VERSION,
  type QuickScore,
} from '@/lib/quick-score'
import { signScore } from '@/lib/quick-score-token'
import { recordResult, percentileFor } from '@/lib/quick-score-stats'

// PUBLIC endpoint — no auth. Scores a ~30s anonymous recording and returns a
// signed token ONLY. The number itself is never returned here: the reveal is
// gated behind signup. IP-throttled and size-capped.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Best-effort in-memory throttle. On serverless this is per-instance and resets
// on cold start — enough to blunt casual hammering. A durable limiter (Upstash)
// is the follow-up if this is actually abused.
const hits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 6

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

/** Whisper word-level timing. The SDK's verbose type doesn't always declare
    `words`, so we read it defensively. */
interface WhisperWord {
  word: string
  start: number
  end: number
}

interface SpeechTiming {
  /** Seconds of actual speaking, first word to last — excludes dead air. */
  speechSec: number
  /** Silences longer than PAUSE_THRESHOLD_SEC between consecutive words. */
  longPauses: number
  /** True when we had real word timings rather than a fallback. */
  measured: boolean
}

/**
 * Derive speech time and hesitation pauses from word timestamps.
 *
 * This is why the route asks Whisper for verbose_json: the old version computed
 * wpm as words ÷ the *recording* length taken from the browser. Someone who
 * recorded 30s but spoke for 12 was scored as a slow speaker, and long silences
 * — the clearest hesitation signal there is — were invisible.
 */
function timingFrom(words: WhisperWord[] | undefined, fallbackSec: number): SpeechTiming {
  if (!words || words.length < 2) {
    return { speechSec: Math.max(1, fallbackSec), longPauses: 0, measured: false }
  }
  const first = words[0].start
  const last = words[words.length - 1].end
  let longPauses = 0
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].end > PAUSE_THRESHOLD_SEC) longPauses++
  }
  const speechSec = Math.max(1, last - first)
  return { speechSec, longPauses, measured: true }
}

/**
 * The one model call. It now judges exactly ONE thing — whether the answer had
 * substance and structure for the task — instead of inventing separate
 * "clarity" and "confidence" numbers that were 60% of the old score and not
 * reproducible between runs. Everything else is measured.
 */
async function judgeContent(transcript: string, task: string): Promise<{ content: number; didWell: string; improve: string }> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 140,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You score the CONTENT of a ~30 second spoken answer. Return STRICT JSON: ' +
            '{"content": <0-100>, "did_well": "<text>", "improve": "<text>"}. ' +
            'content = did they actually answer the task, with a clear point and some structure ' +
            '(a beginning, a middle and an end) rather than drifting or trailing off. ' +
            'Do NOT judge delivery, pace, filler words, hesitation or pronunciation — those are ' +
            'measured separately from the audio. Judge only substance and structure. ' +
            'Use the FULL range: 90+ only for a genuinely well-structured, specific answer; ' +
            '70 for a decent answer that rambles a little; 40 for vague or off-task; ' +
            'below 25 for barely addressing the task. ' +
            'did_well = ONE specific thing about their content, max 6 words, no ending period. ' +
            'improve = ONE concrete fix to their content, max 6 words, no ending period. ' +
            'No prose outside the JSON.',
        },
        { role: 'user', content: `Task: ${task}\n\nTranscript: "${transcript}"` },
      ],
    })
    const raw = res.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const clamp = (x: unknown) => Math.max(0, Math.min(100, Math.round(Number(x) || 0)))
    const str = (x: unknown) => (typeof x === 'string' ? x : '')
    return {
      content: clamp(parsed.content),
      didWell: str(parsed.did_well),
      improve: str(parsed.improve),
    }
  } catch {
    // A model failure shouldn't break the tool. 60 is a neutral middle that
    // doesn't flatter or punish, and the measured 65% still does its job.
    return { content: 60, didWell: '', improve: '' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many tries — give it a minute.' },
        { status: 429 },
      )
    }

    const form = await request.formData()
    const audio = form.get('audio')
    const promptId = Number.parseInt(String(form.get('promptId') ?? ''), 10)
    const clientDuration = Number(form.get('duration') ?? 0)

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: 'no_audio', message: 'No recording received.' }, { status: 400 })
    }
    // ~6 MB is far more than 30s of compressed audio; guards against abuse.
    if (audio.size > 6_000_000) {
      return NextResponse.json({ error: 'too_large', message: 'Recording too large.' }, { status: 413 })
    }
    const prompt = promptById(promptId)
    if (!prompt) {
      return NextResponse.json({ error: 'bad_prompt', message: 'Unknown prompt.' }, { status: 400 })
    }

    // Whisper with WORD timestamps — gives real speech time and pause data.
    const transcription = (await getOpenAI().audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })) as unknown as { text?: string; words?: WhisperWord[]; duration?: number }

    const transcript = (transcription.text ?? '').trim()
    const words = wordCount(transcript)

    // Too little speech to score fairly — ask for another go rather than hand
    // back a meaningless number.
    if (words < 5) {
      return NextResponse.json(
        { error: 'too_short', message: "We couldn't hear enough — record again and speak up a little." },
        { status: 422 },
      )
    }

    const timing = timingFrom(transcription.words, transcription.duration ?? clientDuration)
    const filler = countFillers(transcript)
    const restarts = countRestarts(transcript)
    const wpm = computeWpm(words, timing.speechSec)

    const { content, didWell, improve } = await judgeContent(transcript, prompt.prompt)

    const pace = paceScore(wpm)
    const fluency = fluencyScore(filler, restarts, words)
    // Without real word timings we can't see pauses; scoring a 0 there would
    // hand out a free 100. Fall back to a neutral 70 so the dimension neither
    // rewards nor punishes what we couldn't measure.
    const flow = timing.measured ? flowScore(timing.longPauses, timing.speechSec) : 70
    const overall = overallScore({ pace, fluency, flow, content })

    // Metric-grounded lines first — they're always true because they read the
    // real measurements. The model's content line rides on top.
    const paceFb = paceFeedback(wpm)
    const fluFb = fluencyFeedback(filler, restarts, words)
    const flowFb = timing.measured ? flowFeedback(timing.longPauses, timing.speechSec) : {}

    const strengths = pickLines([fluFb.good, paceFb.good, flowFb.good, didWell])
    const improvements = pickLines([fluFb.improve, paceFb.improve, flowFb.improve, improve])
    if (strengths.length === 0) strengths.push('You showed up and spoke')
    if (improvements.length === 0) improvements.push('Keep practising to lock it in')

    // Percentile against PREVIOUS takers, computed before recording this one so
    // the user isn't compared against themselves. Undefined until we have a
    // real sample — we show nothing rather than a made-up number.
    const percentile = await percentileFor(overall)
    void recordResult(overall, prompt.id)

    const score: QuickScore = {
      v: SCORE_VERSION,
      promptId: prompt.id,
      overall,
      pace,
      fluency,
      flow,
      content,
      wpm,
      filler,
      restarts,
      longPauses: timing.longPauses,
      percentile,
      strengths,
      improvements,
    }

    // Return ONLY the signed token. No score, no coaching preview — the reveal
    // is the whole reason someone creates an account.
    return NextResponse.json({ ok: true, token: signScore(score) })
  } catch (err) {
    console.error('quick-score error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong scoring that. Try again.' },
      { status: 500 },
    )
  }
}
