// Streak + weekly sticker logic for Locuta.
//
// DESIGN DECISION: streaks and stickers are DERIVED from `sessions.created_at`,
// not stored in their own table. A `streaks` table would be duplicated state
// that silently drifts from reality (backfills, deleted sessions, timezone
// bugs) and there is no query here that is slow enough to justify it. The
// sessions table is the single source of truth.
//
// All day boundaries use the *user's local* timezone, because "did I practice
// today?" is a human question, not a UTC one. Callers pass ISO timestamps.

export type StickerState = 'done' | 'today' | 'missed' | 'upcoming'

export interface WeekDay {
  /** 'MON' … 'SUN' */
  day: string
  state: StickerState
  /** Local day key, e.g. '2026-07-14' */
  key: string
}

/** Local calendar day key, e.g. '2026-07-14'. Not UTC — see note above. */
export function toDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** Set of local day keys on which the user completed at least one session. */
export function practiceDays(timestamps: string[]): Set<string> {
  const days = new Set<string>()
  for (const ts of timestamps) {
    const d = new Date(ts)
    if (!Number.isNaN(d.getTime())) days.add(toDayKey(d))
  }
  return days
}

/**
 * Consecutive-day streak.
 *
 * IMPORTANT: a streak stays alive until the end of today. If you practiced
 * yesterday but haven't yet today, your streak is still N — it does not reset
 * to 0 at midnight. (The previous implementation showed 0 every morning until
 * you practiced, which punished users for waking up.)
 */
export function computeStreak(timestamps: string[], now: Date = new Date()): number {
  const days = practiceDays(timestamps)
  if (days.size === 0) return 0

  const todayKey = toDayKey(now)
  const yesterdayKey = toDayKey(addDays(now, -1))

  // Anchor: today if practiced today, else yesterday if practiced yesterday.
  let cursor: Date
  if (days.has(todayKey)) cursor = new Date(now)
  else if (days.has(yesterdayKey)) cursor = addDays(now, -1)
  else return 0

  let streak = 0
  while (days.has(toDayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** True when the user has already completed a session today. */
export function practicedToday(timestamps: string[], now: Date = new Date()): boolean {
  return practiceDays(timestamps).has(toDayKey(now))
}

/** Monday-first week containing `now`, with each day's sticker state. */
export function weekStickers(timestamps: string[], now: Date = new Date()): WeekDay[] {
  const days = practiceDays(timestamps)
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  // JS getDay(): 0=Sun … 6=Sat. Shift so Monday is index 0.
  const offsetFromMonday = (now.getDay() + 6) % 7
  const monday = addDays(now, -offsetFromMonday)
  const todayKey = toDayKey(now)

  return labels.map((day, i) => {
    const date = addDays(monday, i)
    const key = toDayKey(date)
    let state: StickerState
    if (days.has(key)) state = 'done'
    else if (key === todayKey) state = 'today'
    else if (i < offsetFromMonday) state = 'missed'
    else state = 'upcoming'
    return { day, state, key }
  })
}

/** Days practiced in the current (Monday-first) week. */
export function stickersThisWeek(timestamps: string[], now: Date = new Date()): number {
  return weekStickers(timestamps, now).filter((d) => d.state === 'done').length
}
