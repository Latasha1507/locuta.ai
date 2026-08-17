// Word-level timings for the coach's lesson audio, so the practice page can
// highlight each word as it's spoken (karaoke read-along).
//
// The coach voice is TTS — it has no inherent word timings. Whisper, however,
// reads clean TTS audio near-perfectly, so we run the generated mp3 back through
// Whisper ONCE with word timestamps and cache the result. Cheap (a fraction of a
// cent per lesson×tone) and one-time, exactly like the audio caching itself.
//
// Whisper's word timestamps come back as BARE words (no punctuation), so we
// merge them back onto the original, punctuated transcript — the displayed
// caption keeps its commas and full stops while each token carries a real time.

import type OpenAI from 'openai'

export interface WordTiming {
  /** The display word, including punctuation from the original transcript. */
  word: string
  /** Seconds from the start of THIS clip. */
  start: number
  end: number
}

function normalizeWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Re-attach the original transcript's punctuation to Whisper's bare, timed
 * words. We walk the punctuated tokens and, for each, consume as many Whisper
 * words as it takes to cover that token's letters — so a token that Whisper
 * split (e.g. "Three—a" → "three","a") still gets one display token with the
 * first fragment's start time. Robust to punctuation-only differences; degrades
 * gracefully if the two sequences drift.
 */
function mergeCanonicalPunctuation(canonicalText: string, words: WordTiming[]): WordTiming[] {
  const tokens = canonicalText.split(/\s+/).filter(Boolean)
  if (tokens.length === 0 || words.length === 0) return words

  const out: WordTiming[] = []
  let wi = 0
  for (const tok of tokens) {
    const norm = normalizeWord(tok)
    if (!norm) {
      // Pure-punctuation token — hang it on the previous word's timing.
      const prev = out[out.length - 1]
      out.push({ word: tok, start: prev?.start ?? words[wi]?.start ?? 0, end: prev?.end ?? words[wi]?.end ?? 0 })
      continue
    }
    const first = words[wi]
    const start = first?.start ?? out[out.length - 1]?.end ?? 0
    let end = first?.end ?? start
    let acc = ''
    while (wi < words.length && acc.length < norm.length) {
      acc += normalizeWord(words[wi].word)
      end = words[wi].end
      wi++
    }
    out.push({ word: tok, start, end })
  }
  return out
}

/**
 * Align an audio buffer to word-level start/end times via Whisper. Pass
 * `canonicalText` (the exact text fed to TTS) to keep punctuation in the output.
 * Returns [] if alignment produced nothing — callers treat that as "no
 * highlighting", never as a hard failure.
 */
export async function alignWordTimings(
  openai: OpenAI,
  audio: Buffer,
  canonicalText = '',
  filename = 'intro.mp3',
): Promise<WordTiming[]> {
  // Wrap in a fresh Uint8Array so it's a valid BlobPart (a bare Buffer is typed
  // over ArrayBufferLike, which the File/Blob constructor rejects).
  const file = new File([new Uint8Array(audio)], filename, { type: 'audio/mpeg' })
  const res = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
    // Word timestamps require verbose_json + this granularity.
    timestamp_granularities: ['word'],
  })

  // The SDK's return type is a union across response formats; narrow to the
  // verbose shape that carries `words`.
  const words = (res as { words?: { word: string; start: number; end: number }[] }).words
  if (!Array.isArray(words)) return []

  const clean: WordTiming[] = words
    .filter((w) => w && typeof w.word === 'string' && Number.isFinite(w.start) && Number.isFinite(w.end))
    .map((w) => ({ word: w.word, start: w.start, end: w.end }))

  return canonicalText.trim() ? mergeCanonicalPunctuation(canonicalText, clean) : clean
}

/**
 * Fetch an audio file (e.g. a cached intro's Storage URL) and align it. Used to
 * lazily backfill timings for lessons cached before this feature existed.
 * Returns [] on any failure — highlighting is a nice-to-have, never a blocker.
 */
export async function alignWordTimingsFromUrl(
  openai: OpenAI,
  url: string,
  canonicalText = '',
): Promise<WordTiming[]> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return []
    const buffer = Buffer.from(await resp.arrayBuffer())
    return await alignWordTimings(openai, buffer, canonicalText)
  } catch (e) {
    console.error('⚠️ Word-timing backfill fetch/align failed (non-critical):', e)
    return []
  }
}
