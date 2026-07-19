// Public "30-second speaking test" — the hero widget on the landing page.
// Anyone (no account) records ~30s against a simple task and gets ONE number
// back, gated behind signup, then a link they can share.
//
// This module is ISOMORPHIC — imported by the client recorder (prompt list) AND
// by the server (API route, share page, OG image). It must NOT import node-only
// APIs. HMAC sign/verify lives in the server-only `lib/quick-score-token.ts`.
//
// SCORING PHILOSOPHY (v2 — rewritten):
// 65% of the score comes from things we can actually MEASURE from the audio
// (pace over real speech time, filler density, restarts, hesitation pauses).
// Only 35% comes from the model, judging one thing: whether the answer had
// substance and structure. v1 put 60% of the weight on two model-invented
// numbers ("clarity"/"confidence"), so the same recording could score 65 on one
// run and 78 on the next. A number people are invited to compete over has to be
// reproducible.

export const SCORE_VERSION = 2

export interface PromptDef {
  id: number
  /** Short, shareable name shown with the result: "I scored 68 on <topic>". */
  topic: string
  /** The task the user speaks to. Easy, everyday, doable in 30 seconds. */
  prompt: string
}

// 20 tasks anyone can talk to for 30 seconds — everyday life + workplace.
// IDs are stable and go into the signed token; never renumber, only append.
export const PROMPTS: PromptDef[] = [
  { id: 1, topic: 'Your Morning Routine', prompt: 'Walk us through your morning — from waking up to right now.' },
  { id: 2, topic: 'The Weekend Recap', prompt: 'Tell us about your last weekend. What did you get up to?' },
  { id: 3, topic: 'Your Go-To Meal', prompt: 'Describe a meal you cook or order all the time, and why you love it.' },
  { id: 4, topic: 'Handling Interruptions', prompt: "You're mid-sentence in a meeting and someone cuts you off. Take back the floor." },
  { id: 5, topic: 'The 30-Second Intro', prompt: 'Introduce yourself the way you would to a new team on day one.' },
  { id: 6, topic: 'Sell Your Favourite App', prompt: 'Convince us to download an app you open every single day.' },
  { id: 7, topic: 'Giving Directions', prompt: 'Explain how to get from your home to the nearest coffee shop.' },
  { id: 8, topic: 'The Small Win', prompt: 'Share one small thing that went well for you this week.' },
  { id: 9, topic: 'Running Late', prompt: "You're 10 minutes late to a meeting. Give the quick apology and jump in." },
  { id: 10, topic: 'Your Dream Day Off', prompt: 'Describe your perfect day off, from morning to night.' },
  { id: 11, topic: 'The Quick Update', prompt: 'Give your manager a 30-second update on what you are working on.' },
  { id: 12, topic: 'Recommend a Show', prompt: 'Get a friend to watch a series or movie you loved.' },
  { id: 13, topic: 'Saying No Politely', prompt: "A coworker asks for help but you're swamped. Turn them down kindly." },
  { id: 14, topic: 'Your Hometown', prompt: 'Tell us about the place you grew up in.' },
  { id: 15, topic: 'The Coffee Order', prompt: 'Order your usual coffee like you are at the counter — and say why it is your go-to.' },
  { id: 16, topic: 'Asking for a Day Off', prompt: 'Ask your manager for Friday off. Keep it short and confident.' },
  { id: 17, topic: 'The Idea Pitch', prompt: 'Pitch one idea to make your workplace or class a little better.' },
  { id: 18, topic: 'Introducing a Friend', prompt: "Introduce two friends who've never met, at a party." },
  { id: 19, topic: 'Delivering Bad News', prompt: 'Tell a customer their order will be a day late. Stay calm and clear.' },
  { id: 20, topic: 'What You Do', prompt: 'Explain what you do for work or study to someone outside your field.' },
]

export function promptById(id: number): PromptDef | undefined {
  return PROMPTS.find((p) => p.id === id)
}

export type MascotMoodName = 'happy' | 'shy' | 'cheer' | 'oops'

/** The result carried in the signed share token. Numbers + SHORT coaching lines
    only — never the transcript or audio (those are personal and must not travel
    in a URL). Feedback lines render only to the signed-in owner. */
export interface QuickScore {
  /** Scoring model version, so old links can be handled gracefully. */
  v?: number
  promptId: number
  /** 0–100 composite — the one big number. */
  overall: number
  // --- the four displayed dimensions, each already a 0–100 sub-score ---
  pace: number
  fluency: number
  flow: number
  content: number
  // --- the raw measurements behind them, for honest captions ---
  wpm: number
  filler: number
  restarts: number
  longPauses: number
  /** Percentile vs real other takers, 1–99. Omitted when we lack real data. */
  percentile?: number
  /** Up to 2 very short "you nailed this" lines. */
  strengths: string[]
  /** Up to 2 very short "work on this" lines. */
  improvements: string[]
}

// --- tunables, exported so the UI can show users what "good" looks like ------

/** The band where speech is easiest to follow. Shown to users as the target. */
export const PACE_TARGET = { min: 125, max: 165 }
/** A silence longer than this mid-answer reads as hesitation. */
export const PAUSE_THRESHOLD_SEC = 0.7
/** Long pauses per minute at or below this are normal breathing, unpenalised. */
export const PAUSE_ALLOWANCE_PER_MIN = 2

// Filler set. DELIBERATELY EXCLUDES bare "like", "so", "well", "right", "okay",
// "actually", "kind of" and "sort of" — they are legitimate words far more often
// than crutches, and flagging them punished normal speech ("I like coffee",
// "that kind of thing"). Only unambiguous hesitation sounds and stock filler
// phrases are counted, so anything we flag is genuinely a filler.
export const FILLER_WORDS = [
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mmm', 'mhm',
  'you know', 'i mean', 'kinda like', 'sorta like',
]

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function wordCount(transcript: string): number {
  const t = transcript.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

export function countFillers(transcript: string): number {
  const text = ` ${transcript.toLowerCase().replace(/[.,!?;:]/g, ' ')} `
  let total = 0
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(filler)}\\b`, 'g')
    total += (text.match(re) ?? []).length
  }
  return total
}

/** Stutters and false starts: the same word twice in a row ("I I think", "the
    the"). A real, measurable hesitation signal that needs no model. */
export function countRestarts(transcript: string): number {
  const words = transcript
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  let n = 0
  for (let i = 1; i < words.length; i++) {
    // No length guard: "I I think" is the single most common English stutter,
    // and skipping one-letter words missed it entirely.
    if (words[i] === words[i - 1]) n++
  }
  return n
}

export function computeWpm(words: number, speechSec: number): number {
  const secs = clamp(speechSec, 1, 300)
  return Math.round((words / secs) * 60)
}

// --- the four sub-scores. Each uses the full range with only a small floor, so
// the composite actually spreads instead of clustering everyone at ~70. -------

/** Pace vs the easy-to-follow band. Honest: 83 wpm really is too slow. */
export function paceScore(wpm: number): number {
  if (wpm >= PACE_TARGET.min && wpm <= PACE_TARGET.max) return 100
  const dist = wpm < PACE_TARGET.min ? PACE_TARGET.min - wpm : wpm - PACE_TARGET.max
  return clamp(Math.round(100 - dist * 1.5), 10, 100)
}

/** Filler + stutter density per 100 words. Zero filler scores 100. */
export function fluencyScore(fillerCount: number, restarts: number, words: number): number {
  if (words <= 0) return 50
  const fillerPer100 = (fillerCount / words) * 100
  const restartPer100 = (restarts / words) * 100
  return clamp(Math.round(100 - fillerPer100 * 4 - restartPer100 * 3), 5, 100)
}

/** Hesitation: long silences per minute beyond a normal breathing allowance. */
export function flowScore(longPauses: number, speechSec: number): number {
  if (speechSec <= 0) return 50
  const perMin = longPauses / (speechSec / 60)
  if (perMin <= PAUSE_ALLOWANCE_PER_MIN) return 100
  return clamp(Math.round(100 - (perMin - PAUSE_ALLOWANCE_PER_MIN) * 9), 10, 100)
}

/** The composite. Measured signals carry 65%, the model's content call 35%.
    Weighted pace 20 / fluency 25 / flow 20 / content 35. */
export function overallScore(p: { pace: number; fluency: number; flow: number; content: number }): number {
  const o = p.pace * 0.2 + p.fluency * 0.25 + p.flow * 0.2 + p.content * 0.35
  return clamp(Math.round(o), 0, 100)
}

/** The rank shown with the number. Every tier is written to be survivable — the
    result gets shared, so no tier should read as humiliating. */
export function scoreTier(overall: number): {
  color: string
  label: string
  emoji: string
  mood: MascotMoodName
} {
  // Thresholds are deliberately high at the top: three of the four dimensions
  // saturate at 100 for competent speech, so without this the "Exceptional"
  // tier would be handed to anyone merely good — and a top tier everyone earns
  // is worth nothing to share.
  if (overall >= 92) return { color: '#3fce6f', label: 'Exceptional', emoji: '🔥', mood: 'cheer' }
  if (overall >= 80) return { color: '#3fce6f', label: 'Sharp', emoji: '💪', mood: 'cheer' }
  if (overall >= 66) return { color: '#1cb0f6', label: 'Solid', emoji: '✨', mood: 'happy' }
  if (overall >= 50) return { color: '#f5a623', label: 'Getting there', emoji: '🌱', mood: 'happy' }
  return { color: '#ff6f61', label: 'Rough start', emoji: '🎯', mood: 'shy' }
}

/** Colour a sub-score by PERFORMANCE, not by category. This is what stops a
    perfect result rendering as a full red bar. */
export function metricColor(value: number): string {
  if (value >= 80) return '#3fce6f'
  if (value >= 60) return '#1cb0f6'
  if (value >= 40) return '#f5a623'
  return '#ff6f61'
}

/** Normalise a coaching line: single-spaced, trimmed, hard length cap. */
export function tidyFeedback(s: string, max = 46): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ').replace(/[.]+$/, '')
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

// Deterministic, metric-grounded feedback. Always true, because it reads the
// real measurements — the model only adds the content line on top.

export function paceFeedback(wpm: number): { good?: string; improve?: string } {
  if (wpm >= PACE_TARGET.min && wpm <= PACE_TARGET.max) return { good: 'Steady, easy-to-follow pace' }
  if (wpm < 100) return { improve: `Speed up — ${wpm} wpm is slow` }
  if (wpm < PACE_TARGET.min) return { improve: 'A touch faster would land better' }
  if (wpm > 190) return { improve: `Slow down — ${wpm} wpm is a sprint` }
  return { improve: 'Ease off the pace slightly' }
}

export function fluencyFeedback(
  fillerCount: number,
  restarts: number,
  words: number,
): { good?: string; improve?: string } {
  if (words <= 0) return {}
  if (fillerCount === 0 && restarts === 0) return { good: 'No filler, no stumbles' }
  if (fillerCount >= 4) return { improve: `Cut the filler — ${fillerCount} of them` }
  if (restarts >= 3) return { improve: 'Fewer restarts mid-sentence' }
  if (fillerCount <= 1) return { good: 'Barely any filler words' }
  return {}
}

export function flowFeedback(longPauses: number, speechSec: number): { good?: string; improve?: string } {
  if (speechSec <= 0) return {}
  const perMin = longPauses / (speechSec / 60)
  if (longPauses === 0) return { good: 'Kept going without stalling' }
  if (perMin > 6) return { improve: `${longPauses} long pauses broke the flow` }
  if (perMin <= PAUSE_ALLOWANCE_PER_MIN) return { good: 'Natural pauses, no stalling' }
  return { improve: 'Fewer long pauses mid-answer' }
}

/** First `n` unique, non-empty, tidied lines. */
export function pickLines(lines: (string | undefined)[], n = 2): string[] {
  const out: string[] = []
  for (const raw of lines) {
    if (!raw) continue
    const t = tidyFeedback(raw)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= n) break
  }
  return out
}

/** Older (v1) tokens lack the v2 fields. Fill them in so old share links keep
    rendering instead of crashing, without inventing precise-looking numbers. */
export function normaliseScore(
  raw: Partial<QuickScore> & { clarity?: number; confidence?: number },
): QuickScore {
  const n = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback)
  const legacyContent = Math.round((n(raw.clarity, 60) + n(raw.confidence, 60)) / 2)
  return {
    v: n(raw.v, 1),
    promptId: n(raw.promptId, 1),
    overall: clamp(n(raw.overall, 0), 0, 100),
    pace: clamp(n(raw.pace, paceScore(n(raw.wpm, 130))), 0, 100),
    fluency: clamp(n(raw.fluency, 70), 0, 100),
    flow: clamp(n(raw.flow, 70), 0, 100),
    content: clamp(n(raw.content, legacyContent), 0, 100),
    wpm: n(raw.wpm, 0),
    filler: n(raw.filler, 0),
    restarts: n(raw.restarts, 0),
    longPauses: n(raw.longPauses, 0),
    percentile: typeof raw.percentile === 'number' ? clamp(Math.round(raw.percentile), 1, 99) : undefined,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 2) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.slice(0, 2) : [],
  }
}
