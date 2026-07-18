// Public "quick score" micro-tool — the hero recording widget on the landing
// page. Anyone (no account) records 30 seconds against a simple prompt and gets
// ONE number back, gated behind signup, then a shareable card.
//
// This module is ISOMORPHIC — it is imported by the client recorder (for the
// prompt list) AND by the server (API route, share page, OG image). So it must
// NOT import node-only APIs. The HMAC sign/verify lives in the server-only
// companion `lib/quick-score-token.ts`.

export interface PromptDef {
  id: number
  /** Short, shareable name that appears on the card: "I scored 68 on <topic>". */
  topic: string
  /** The task the user speaks to. Easy, everyday, doable in 30 seconds. */
  prompt: string
}

// 20 tasks anyone can talk to for 30 seconds — everyday life + workplace.
// The `topic` is chosen to read well on a shared card. IDs are stable and go
// into the signed token; never renumber an existing prompt, only append.
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

/** The result carried in the signed share token. Numbers + SHORT coaching
    lines only — never the transcript or audio (those can be personal and must
    not travel in a URL). The feedback lines are constructive, ≤~52 chars, and
    are only ever rendered to the signed-in owner, never in the public image. */
export interface QuickScore {
  promptId: number
  /** 0–100 composite — the one big number. */
  overall: number
  /** Raw count of filler words detected. */
  filler: number
  /** Words per minute. */
  wpm: number
  clarity: number
  confidence: number
  /** Up to 2 very short "you nailed this" lines. */
  strengths: string[]
  /** Up to 2 very short "level up" lines. */
  improvements: string[]
}

// Filler set kept deliberately moderate. "so", "well", "right", "okay",
// "actually" are excluded because they're legitimate words far more often than
// they're crutches, and over-counting them would unfairly tank normal speech.
export const FILLER_WORDS = [
  'um', 'uh', 'er', 'erm', 'ah', 'hmm', 'umm', 'uhh', 'mmm',
  'like', 'basically', 'literally', 'you know', 'i mean', 'sort of', 'kind of',
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
  const text = ` ${transcript.toLowerCase()} `
  let total = 0
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(filler)}\\b`, 'g')
    const matches = text.match(re)
    if (matches) total += matches.length
  }
  return total
}

export function computeWpm(words: number, durationSec: number): number {
  const secs = clamp(durationSec, 1, 120)
  return Math.round((words / secs) * 60)
}

/** Ideal clear-speaking band is ~120–160 wpm; falls off outside it. */
export function paceScore(wpm: number): number {
  if (wpm >= 120 && wpm <= 160) return 100
  const dist = wpm < 120 ? 120 - wpm : wpm - 160
  return clamp(Math.round(100 - dist * 1.4), 40, 100)
}

/** Penalises filler density (per 100 words) gently, with a floor. */
export function fillerScore(fillerCount: number, words: number): number {
  if (words <= 0) return 60
  const ratePer100 = (fillerCount / words) * 100
  return clamp(Math.round(100 - ratePer100 * 3.5), 35, 100)
}

/** The composite. Clarity + confidence come from the model; pace + filler are
    computed here. Weighted 30/30/20/20. */
export function overallScore(p: {
  clarity: number
  confidence: number
  wpm: number
  fillerCount: number
  wordCount: number
}): number {
  const pace = paceScore(p.wpm)
  const fill = fillerScore(p.fillerCount, p.wordCount)
  const o = p.clarity * 0.3 + p.confidence * 0.3 + pace * 0.2 + fill * 0.2
  return clamp(Math.round(o), 0, 100)
}

/** The fun "rank" for the result screen: a colour, an encouraging label and an
    emoji, all driven by the one number. Kept positive at every tier — the card
    gets shared, so no tier should feel like a punishment. Hexes mirror the
    design tokens (green / blue / orange / coral). */
export function scoreTier(overall: number): { color: string; label: string; emoji: string } {
  if (overall >= 85) return { color: '#3fce6f', label: 'Outstanding', emoji: '🔥' }
  if (overall >= 75) return { color: '#3fce6f', label: 'Strong', emoji: '💪' }
  if (overall >= 65) return { color: '#1cb0f6', label: 'Solid', emoji: '✨' }
  if (overall >= 50) return { color: '#f5a623', label: 'Getting there', emoji: '🌱' }
  return { color: '#ff6f61', label: 'Rough start', emoji: '🎯' }
}

/** Short verdict word (the tier label). */
export function verdict(overall: number): string {
  return scoreTier(overall).label
}

/** Normalise a coaching line: single-spaced, trimmed, hard length cap. */
export function tidyFeedback(s: string, max = 52): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ').replace(/[.]+$/, '')
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

// Deterministic, metric-grounded feedback. These are always accurate because
// they read the real numbers — the model only adds the content-level line on
// top. Each returns an optional "good" (a strength) and "improve" (a fix).

export function paceFeedback(wpm: number): { good?: string; improve?: string } {
  if (wpm >= 120 && wpm <= 160) return { good: 'Great, steady speaking pace' }
  if (wpm < 105) return { improve: 'Pick up the pace a little' }
  if (wpm > 175) return { improve: 'Slow down — you rushed it' }
  return {}
}

export function fillerFeedback(fillerCount: number, words: number): { good?: string; improve?: string } {
  if (words <= 0) return {}
  const per100 = (fillerCount / words) * 100
  if (fillerCount === 0) return { good: 'Zero filler words — crisp' }
  if (per100 >= 8 || fillerCount >= 4) return { improve: `Trim filler words (you said ${fillerCount})` }
  if (per100 <= 3) return { good: 'Barely any filler words' }
  return {}
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
