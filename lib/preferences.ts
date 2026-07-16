import { resolveTone } from '@/lib/tones'

// The profiles.preferences JSONB blob. Everything optional — a fresh user has
// {} and we fall back to sane defaults. One blob keeps this migration-free as
// we add settings.
export interface UserPreferences {
  // Coaching
  defaultTone?: string
  defaultPath?: string
  dailyGoal?: 'Casual' | 'Regular' | 'Serious'
  // Notifications
  dailyReminder?: boolean
  reminderTime?: string
  streakAtRisk?: boolean
  newStickerAlert?: boolean
  weeklyEmail?: boolean
  // Streak rules
  restDays?: boolean
  // Recordings & data
  saveRecordings?: boolean
  shareData?: boolean
  // Practice
  soundEffects?: boolean
}

const BOOL_KEYS: (keyof UserPreferences)[] = [
  'dailyReminder',
  'streakAtRisk',
  'newStickerAlert',
  'weeklyEmail',
  'restDays',
  'saveRecordings',
  'shareData',
  'soundEffects',
]

// Defaults chosen so a brand-new user gets a sensible, non-annoying setup.
export const PREFERENCE_DEFAULTS: Required<Omit<UserPreferences, 'defaultTone' | 'defaultPath'>> = {
  dailyGoal: 'Regular',
  dailyReminder: true,
  reminderTime: '7:00 PM',
  streakAtRisk: true,
  newStickerAlert: true,
  weeklyEmail: false,
  restDays: true,
  saveRecordings: true,
  shareData: false,
  soundEffects: true,
}

export function readPreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return {}
  const p = raw as Record<string, unknown>
  const out: UserPreferences = {}
  if (typeof p.defaultTone === 'string') out.defaultTone = p.defaultTone
  if (typeof p.defaultPath === 'string') out.defaultPath = p.defaultPath
  if (p.dailyGoal === 'Casual' || p.dailyGoal === 'Regular' || p.dailyGoal === 'Serious') out.dailyGoal = p.dailyGoal
  if (typeof p.reminderTime === 'string') out.reminderTime = p.reminderTime
  for (const k of BOOL_KEYS) {
    if (typeof p[k] === 'boolean') (out[k] as boolean) = p[k] as boolean
  }
  return out
}

/** Preferences merged over defaults — safe to read every field directly. */
export function withDefaults(raw: unknown): Required<UserPreferences> {
  const p = readPreferences(raw)
  return {
    defaultTone: p.defaultTone ?? 'Normal',
    defaultPath: p.defaultPath ?? 'Public Speaking',
    dailyGoal: p.dailyGoal ?? PREFERENCE_DEFAULTS.dailyGoal,
    dailyReminder: p.dailyReminder ?? PREFERENCE_DEFAULTS.dailyReminder,
    reminderTime: p.reminderTime ?? PREFERENCE_DEFAULTS.reminderTime,
    streakAtRisk: p.streakAtRisk ?? PREFERENCE_DEFAULTS.streakAtRisk,
    newStickerAlert: p.newStickerAlert ?? PREFERENCE_DEFAULTS.newStickerAlert,
    weeklyEmail: p.weeklyEmail ?? PREFERENCE_DEFAULTS.weeklyEmail,
    restDays: p.restDays ?? PREFERENCE_DEFAULTS.restDays,
    saveRecordings: p.saveRecordings ?? PREFERENCE_DEFAULTS.saveRecordings,
    shareData: p.shareData ?? PREFERENCE_DEFAULTS.shareData,
    soundEffects: p.soundEffects ?? PREFERENCE_DEFAULTS.soundEffects,
  }
}

/** Validate + normalise a partial patch coming from the client before saving. */
export function sanitizePreferencePatch(body: Record<string, unknown>): Partial<UserPreferences> {
  const patch: Partial<UserPreferences> = {}
  if (typeof body.defaultTone === 'string') patch.defaultTone = resolveTone(body.defaultTone)
  if (typeof body.defaultPath === 'string') patch.defaultPath = body.defaultPath.slice(0, 60)
  if (body.dailyGoal === 'Casual' || body.dailyGoal === 'Regular' || body.dailyGoal === 'Serious') {
    patch.dailyGoal = body.dailyGoal
  }
  if (typeof body.reminderTime === 'string') patch.reminderTime = body.reminderTime.slice(0, 20)
  for (const k of BOOL_KEYS) {
    if (typeof body[k] === 'boolean') (patch[k] as boolean) = body[k] as boolean
  }
  return patch
}

/**
 * Tone to use when the user hasn't chosen one for this session.
 * Priority: saved default → last-used → Normal. Practice-resume and Paths call this.
 */
export function preferredTone(prefsRaw: unknown, lastUsedTone?: string | null): string {
  const prefs = readPreferences(prefsRaw)
  if (prefs.defaultTone) return resolveTone(prefs.defaultTone)
  return resolveTone(lastUsedTone ?? undefined)
}
