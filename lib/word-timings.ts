// Word-level timings for the coach's lesson audio, so the practice page can
// highlight each word as it's spoken (karaoke read-along).
//
// The coach voice is TTS — it has no inherent word timings. Whisper, however,
// reads clean TTS audio near-perfectly, so we run the generated mp3 back through
// Whisper ONCE with word timestamps and cache the result. Cheap (a fraction of a
// cent per lesson×tone) and one-time, exactly like the audio caching itself.

import type OpenAI from 'openai'

export interface WordTiming {
  /** The word as heard, including any attached punctuation (e.g. "three,"). */
  word: string
  /** Seconds from the start of THIS clip. */
  start: number
  end: number
}

/**
 * Align an audio buffer to word-level start/end times via Whisper.
 * Returns [] if alignment produced nothing — callers treat that as "no
 * highlighting", never as a hard failure.
 */
export async function alignWordTimings(
  openai: OpenAI,
  audio: Buffer,
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

  return words
    .filter((w) => w && typeof w.word === 'string' && Number.isFinite(w.start) && Number.isFinite(w.end))
    .map((w) => ({ word: w.word, start: w.start, end: w.end }))
}

/**
 * Fetch an audio file (e.g. a cached intro's Storage URL) and align it. Used to
 * lazily backfill timings for lessons cached before this feature existed.
 * Returns [] on any failure — highlighting is a nice-to-have, never a blocker.
 */
export async function alignWordTimingsFromUrl(
  openai: OpenAI,
  url: string,
): Promise<WordTiming[]> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return []
    const buffer = Buffer.from(await resp.arrayBuffer())
    return await alignWordTimings(openai, buffer)
  } catch (e) {
    console.error('⚠️ Word-timing backfill fetch/align failed (non-critical):', e)
    return []
  }
}
