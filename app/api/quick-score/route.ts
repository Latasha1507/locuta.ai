import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  promptById,
  wordCount,
  countFillers,
  computeWpm,
  overallScore,
  type QuickScore,
} from '@/lib/quick-score'
import { signScore } from '@/lib/quick-score-token'

// PUBLIC endpoint — no auth. Scores a ~30s anonymous recording and returns a
// signed token ONLY. The number itself is never returned here: the reveal is
// gated behind signup (…/s/<token> after account creation). Cost per call is
// ~$0.0035 (Whisper + gpt-4o-mini), and it's IP-throttled + size-capped.

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
// is the follow-up if this actually gets abused.
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

async function judge(
  transcript: string,
  task: string,
): Promise<{ clarity: number; confidence: number }> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 60,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a speaking coach scoring a ~30 second spoken answer. Return STRICT JSON: ' +
            '{"clarity": <0-100>, "confidence": <0-100>}. ' +
            'clarity = how easy the answer is to follow — structure, articulation, staying on task. ' +
            'confidence = how assured and decisive the delivery reads from the words — few hedges, clear stance. ' +
            'Be fair but discriminating; most genuine first attempts land 55–80. No prose, JSON only.',
        },
        { role: 'user', content: `Task: ${task}\n\nTranscript: "${transcript}"` },
      ],
    })
    const raw = res.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { clarity?: unknown; confidence?: unknown }
    const clamp = (x: unknown) => Math.max(0, Math.min(100, Math.round(Number(x) || 0)))
    return { clarity: clamp(parsed.clarity), confidence: clamp(parsed.confidence) }
  } catch {
    // Model or JSON failure shouldn't break the tool — neutral fallback.
    return { clarity: 60, confidence: 60 }
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
    const duration = Number(form.get('duration') ?? 0)

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

    // Whisper, forced English (the product is English-only).
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'en',
    })
    const transcript = (transcription.text ?? '').trim()
    const words = wordCount(transcript)

    // Too little speech to score fairly — ask them to try again rather than
    // hand back a meaningless number.
    if (words < 5) {
      return NextResponse.json(
        { error: 'too_short', message: "We couldn't hear enough — record again and speak up a little." },
        { status: 422 },
      )
    }

    const filler = countFillers(transcript)
    const wpm = computeWpm(words, duration)
    const { clarity, confidence } = await judge(transcript, prompt.prompt)
    const overall = overallScore({ clarity, confidence, wpm, fillerCount: filler, wordCount: words })

    const score: QuickScore = { promptId: prompt.id, overall, filler, wpm, clarity, confidence }

    // Return the SIGNED TOKEN only. No score numbers — the reveal is gated.
    return NextResponse.json({ ok: true, token: signScore(score) })
  } catch (err) {
    console.error('quick-score error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong scoring that. Try again.' },
      { status: 500 },
    )
  }
}
