import { resolveTone } from '@/lib/tones'

// Shape of the profiles.preferences JSONB blob. Everything optional — a fresh
// user has {} and we fall back to sane defaults.
export interface UserPreferences {
  defaultTone?: string
  dailyReminder?: boolean
}

export function readPreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return {}
  const p = raw as Record<string, unknown>
  return {
    defaultTone: typeof p.defaultTone === 'string' ? p.defaultTone : undefined,
    dailyReminder: typeof p.dailyReminder === 'boolean' ? p.dailyReminder : undefined,
  }
}

/**
 * The tone to use when the user hasn't explicitly chosen one for this session.
 * Priority: saved default preference → their last-used tone → Normal.
 * This is what Practice-resume and Paths call so a saved preference wins.
 */
export function preferredTone(prefsRaw: unknown, lastUsedTone?: string | null): string {
  const prefs = readPreferences(prefsRaw)
  if (prefs.defaultTone) return resolveTone(prefs.defaultTone)
  return resolveTone(lastUsedTone ?? undefined)
}
