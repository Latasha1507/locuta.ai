import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Audio storage for coach briefings.
//
// WHY: the intro audio used to be stored as base64 inside a Postgres row and
// handed to the browser as a `data:audio/mpeg;base64,...` URI. Two problems:
//
//   1. base64 inflates the payload ~33%, and it travels inside a JSON response
//      that Postgres -> API -> browser all have to hold in memory.
//   2. a data URI CANNOT STREAM. The browser must download and decode the whole
//      clip before it plays a single millisecond. A 40-second briefing is ~600KB,
//      so on a mediocre Indian mobile connection that's several seconds of
//      silence before the coach says anything.
//
// An HTTP URL from Supabase Storage streams: the browser issues range requests
// and starts playing after the first few KB. It's also cached at the CDN edge,
// so the second listener anywhere in the world pays nothing.

export const AUDIO_BUCKET = 'lesson-audio'

/** Deterministic path for a lesson briefing. Same lesson+tone -> same object. */
export function introPath(category: string, moduleNumber: number, levelNumber: number, tone: string): string {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `intros/${slug}/m${moduleNumber}/l${levelNumber}/${tone.toLowerCase()}.mp3`
}

/**
 * Path for a user's own practice recording, so it can be played back on the
 * feedback page next to the coach version. Keyed by session id (unique) under
 * the user's id, so recordings are namespaced per user and never collide.
 */
export function userRecordingPath(userId: string, sessionId: string, ext = 'webm'): string {
  return `recordings/${userId}/${sessionId}.${ext}`
}

/**
 * Path for the AI coach's spoken example for a given session. Per-session
 * because the example is a rewrite of THIS user's answer, not a shared asset.
 */
export function exampleAudioPath(userId: string, sessionId: string): string {
  return `examples/${userId}/${sessionId}.mp3`
}

/**
 * Deterministic path for a personalised greeting ("Hello, Latasha.").
 * Keyed by a hash of the name so we never put a user's name in a public URL,
 * and so two users called Latasha share one object instead of paying for two
 * TTS calls.
 */
export function greetingPath(firstName: string, tone: string, daypart = 'day'): string {
  const key = crypto
    .createHash('sha256')
    .update(firstName.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16)
  // Daypart is part of the path so "Good morning, Latasha" and "Good evening,
  // Latasha" are separate cached objects rather than one overwriting the other.
  return `greetings/${tone.toLowerCase()}/${daypart}/${key}.mp3`
}

/** Public CDN URL for an object already in the bucket. */
export function publicUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl
}

/** True if the object already exists — one cheap metadata call, no download. */
export async function audioExists(supabase: SupabaseClient, path: string): Promise<boolean> {
  const dir = path.slice(0, path.lastIndexOf('/'))
  const file = path.slice(path.lastIndexOf('/') + 1)
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).list(dir, { search: file, limit: 1 })
  if (error) return false
  return !!data?.some((f) => f.name === file)
}

/**
 * Upload an mp3 and return its public URL. Upserts, so a re-generation just
 * overwrites. Never throws: if storage is misconfigured we want the caller to
 * fall back to base64 rather than fail the whole request.
 */
export async function uploadAudio(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer,
  contentType = 'audio/mpeg',
): Promise<string | null> {
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    // Immutable: the object at a given path never changes meaning, so let the
    // CDN and the browser keep it for a year.
    cacheControl: '31536000',
  })
  if (error) {
    console.error('⚠️ Audio upload failed (falling back to base64):', error.message)
    return null
  }
  return publicUrl(supabase, path)
}
