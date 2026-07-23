// The scoring engine for lesson feedback.
//
// WHY THIS EXISTS: the old scoring asked GPT to return an `overall_score` /
// `weighted_overall_score` and trusted it. Because the prompt showed example
// numbers (84, 85…), the model parroted them and almost every session scored
// ~84 regardless of how the person actually spoke. The score wasn't a function
// of the speech at all.
//
// THE FIX: score is COMPUTED here, in code, from two sources:
//   1. An OBJECTIVE, deterministic core measured straight from the transcript +
//      clip length — pace, filler density, repetition, lexical diversity,
//      completeness. These cannot be hand-waved and vary genuinely per person.
//   2. Model-judged SEMANTIC components (grammar / vocabulary / coherence /
//      content) scored against a strict rubric with NO anchor numbers.
// The two are blended with level-adjusted weights. The model never sees or
// returns the aggregate — only its component judgements feed the math.

// Self-contained on purpose: this engine must not depend on the micro-tool's
// quick-score module, which changes independently.

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

const FILLER_WORDS = [
  'um', 'uh', 'er', 'erm', 'ah', 'hmm', 'umm', 'uhh', 'mmm',
  'like', 'basically', 'literally', 'you know', 'i mean', 'sort of', 'kind of',
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function wordCount(transcript: string): number {
  const t = transcript.trim()
  return t ? t.split(/\s+/).filter(Boolean).length : 0
}

export function countFillers(transcript: string): number {
  const text = ` ${transcript.toLowerCase()} `
  let total = 0
  for (const filler of FILLER_WORDS) {
    const matches = text.match(new RegExp(`\\b${escapeRegExp(filler)}\\b`, 'g'))
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

/** Penalises filler density (per 100 words), with a floor. */
export function fillerScore(fillerCount: number, words: number): number {
  if (words <= 0) return 60
  const ratePer100 = (fillerCount / words) * 100
  return clamp(Math.round(100 - ratePer100 * 3.5), 35, 100)
}

// Common function words excluded from repetition analysis (repeating "the" is
// not a vocabulary problem; repeating "keys" five times is).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'as', 'is', 'am',
  'are', 'was', 'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'do', 'does',
  'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'not', 'no',
  'if', 'then', 'there', 'here', 'what', 'when', 'where', 'who', 'how', 'why', 'which', 'about', 'just', 'very',
  'really', 'also', 'too', 'some', 'any', 'from', 'by', 'up', 'out', 'get', 'got',
])

function tokenize(t: string): string[] {
  return t.toLowerCase().match(/[a-z']+/g) ?? []
}

function splitSentences(t: string): string[] {
  return t
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Lexical diversity → 0–100. Type-token ratio, mapped to reward variety.
    Kept a MINOR input (see composeScore) because TTR is length-sensitive. */
export function diversityScore(tokens: string[]): number {
  if (tokens.length < 8) return 45
  const ratio = new Set(tokens).size / tokens.length
  return clamp(Math.round((ratio - 0.4) * 300 + 35), 20, 100)
}

/** Penalise heavy repetition of the same content words → 0–100. */
export function repetitionScore(tokens: string[]): number {
  const content = tokens.filter((w) => w.length > 2 && !STOPWORDS.has(w))
  if (content.length < 4) return 75
  const counts = new Map<string, number>()
  for (const w of content) counts.set(w, (counts.get(w) ?? 0) + 1)
  let extra = 0
  for (const c of counts.values()) if (c > 1) extra += c - 1
  const rate = extra / content.length
  return clamp(Math.round(100 - rate * 170), 30, 100)
}

/** Did they actually say enough to complete the task? → 0–100. A two-sentence
    answer to a 45-second prompt should not score like a full one. */
export function completenessScore(words: number, expectedWords: number): number {
  if (!expectedWords || expectedWords <= 0) return 100
  const ratio = words / expectedWords
  if (ratio >= 0.8) return 100
  return clamp(Math.round((ratio / 0.8) * 100), 15, 100)
}

// CONFIDENCE cannot be truly measured from a transcript. We APPROXIMATE it from
// delivery, which is the honest, defensible proxy: a steady, unhurried pace,
// few filler words and little backtracking read as confident; a slow/hesitant,
// filler-filled or repetitive delivery reads as unsure. All objective signals.
function paceConfidence(wpm: number): number {
  if (wpm <= 0) return 60 // unknown clip length → neutral
  if (wpm >= 110 && wpm <= 175) return 100 // steady, assured band
  if (wpm < 110) return clamp(Math.round(100 - (110 - wpm) * 1.3), 40, 100) // slow = hesitant
  return clamp(Math.round(100 - (wpm - 175) * 0.9), 60, 100) // very fast = nervy
}

export function confidenceFromDelivery(fillerScoreVal: number, wpm: number, repetitionScoreVal: number): number {
  return clamp(Math.round(fillerScoreVal * 0.4 + paceConfidence(wpm) * 0.35 + repetitionScoreVal * 0.25), 30, 100)
}

export interface SpeechMetrics {
  words: number
  wpm: number
  fillerCount: number
  sentenceCount: number
  uniqueRatio: number
  paceScore: number
  fillerScore: number
  diversityScore: number
  repetitionScore: number
  /** Objective delivery/fluency composite (pace + filler + repetition). */
  deliveryScore: number
  completenessScore: number
  /** Delivery-derived confidence proxy (0–100). */
  confidenceScore: number
}

/** Measure everything we can compute directly from the words + clip length. */
export function analyzeSpeech(transcript: string, durationSec: number, expectedWords: number): SpeechMetrics {
  const tokens = tokenize(transcript)
  const words = wordCount(transcript)
  const wpm = durationSec > 0 ? computeWpm(words, durationSec) : 0
  const fillerCount = countFillers(transcript)
  const pace = wpm > 0 ? paceScore(wpm) : 60 // no clip length → neutral, don't punish
  const filler = fillerScore(fillerCount, words)
  const diversity = diversityScore(tokens)
  const repetition = repetitionScore(tokens)
  const delivery = Math.round(pace * 0.4 + filler * 0.35 + repetition * 0.25)
  return {
    words,
    wpm,
    fillerCount,
    sentenceCount: splitSentences(transcript).length,
    uniqueRatio: tokens.length ? new Set(tokens).size / tokens.length : 0,
    paceScore: pace,
    fillerScore: filler,
    diversityScore: diversity,
    repetitionScore: repetition,
    deliveryScore: delivery,
    completenessScore: completenessScore(words, expectedWords),
    confidenceScore: confidenceFromDelivery(filler, wpm, repetition),
  }
}

/** How much task / content / language / delivery matter, by level. Beginners are
    judged more on doing the task and delivering it; advanced learners more on
    linguistic precision. Each set sums to 1.0. */
export function overallWeights(
  level: number,
): { task: number; content: number; linguistic: number; delivery: number } {
  if (level <= 10) return { task: 0.3, content: 0.2, linguistic: 0.2, delivery: 0.3 }
  if (level <= 30) return { task: 0.28, content: 0.2, linguistic: 0.32, delivery: 0.2 }
  return { task: 0.25, content: 0.2, linguistic: 0.38, delivery: 0.17 }
}

/** The model's semantic component judgements (0–100 each). */
export interface ModelScores {
  grammar: number
  vocabulary: number
  coherence: number
  content: number
  /** How fully they did what the task actually asked. */
  task: number
}

export interface ScoreResult {
  overall: number
  task: number
  content: number
  linguistic: number
  delivery: number
  /** Delivery-derived confidence proxy. */
  confidence: number
  grammar: number
  vocabulary: number
  coherence: number
}

/**
 * Combine the model's component scores with the objective metrics into the
 * final, real number. This is the ONLY place the overall score is decided.
 */
export function composeScore(
  model: ModelScores,
  metrics: SpeechMetrics,
  level: number,
  isEnglish: boolean,
): ScoreResult {
  const w = overallWeights(level)
  // Displayed scores are floored at 30 — a learner should never see a
  // demoralising single-digit number. Range is 30–100.
  const FLOOR = 30
  const out = (n: number) => clamp(Math.round(n), FLOOR, 100)

  // Vocabulary = mostly the model's judgement, nudged by objective diversity.
  const vocabulary = out(model.vocabulary * 0.8 + metrics.diversityScore * 0.2)
  // Language sub-score: grammar 30% + coherence/structure 35% + vocabulary 35%.
  const linguistic = out(model.grammar * 0.3 + model.coherence * 0.35 + vocabulary * 0.35)
  const content = out(model.content)
  // Task completion: the model's judgement of whether they did what was asked,
  // grounded by whether they actually said ENOUGH (objective completeness).
  const task = out(model.task * 0.65 + metrics.completenessScore * 0.35)
  const delivery = out(metrics.deliveryScore)
  // Confidence is inferred from delivery (see confidenceFromDelivery), NOT the model.
  const confidence = out(metrics.confidenceScore)

  let base = task * w.task + content * w.content + linguistic * w.linguistic + delivery * w.delivery
  // English-only platform: non-English content is a hard miss.
  if (!isEnglish) base *= 0.5

  return {
    overall: out(base),
    task,
    content,
    linguistic,
    delivery,
    confidence,
    grammar: out(model.grammar),
    vocabulary,
    coherence: out(model.coherence),
  }
}
