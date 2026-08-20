import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { readPreferences } from '@/lib/preferences'
import {
  sendEmail,
  dailyReminderEmail,
  streakAtRiskEmail,
  weeklyRecapEmail,
  localWeekday,
  localDateKey,
} from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily notification cron. Triggered once a day by Vercel Cron (see vercel.json).
 *
 * For each user it decides — in THEIR timezone — whether ONE email is due:
 *   1. Weekly recap   — Sunday, if they were active this week.
 *   2. Streak at risk — live streak, haven't practised today.
 *   3. Comeback nudge — lapsed 2–3 days, no active streak.
 * Highest priority wins; we send AT MOST ONE email per user per local day
 * (enforced by the `lastNotifiedOn` marker), so nobody gets buried in mail.
 *
 * The logic is day-based (not hour-based) so a single daily run is correct in
 * every timezone. Because we run once a day, we can't honour a per-user reminder
 * HOUR — that's the deliberate trade for "never spammy".
 *
 * Protected by CRON_SECRET: Vercel Cron sends it as a Bearer token when the
 * CRON_SECRET env var is set; we reject anything else.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Pull the users who might need something. At pre-launch scale this is a small
  // table; we filter each user in code by their local time. (When the base grows
  // large, switch to a targeted query or a queue.)
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email, preferences')
    .not('email', 'is', null)

  if (error) {
    console.error('cron: profile fetch failed', error.message)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }

  const now = new Date()
  const sent = { daily: 0, streak: 0, weekly: 0 }

  for (const p of profiles ?? []) {
    const email = p.email as string | null
    if (!email) continue

    const prefs = readPreferences(p.preferences)
    const tz = prefs.timezone
    const todayKey = localDateKey(tz, now)

    // Hard cap: at most one email per user per local day.
    if (prefs.lastNotifiedOn === todayKey) continue

    // Skip anyone who has every relevant toggle off — no reason to load sessions.
    if (!prefs.dailyReminder && !prefs.streakAtRisk && !prefs.weeklyEmail) continue

    const firstName = String(p.full_name ?? '').split(' ')[0] || 'there'

    const { data: sessions } = await admin
      .from('sessions')
      .select('created_at, feedback')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(200)

    const timestamps = (sessions ?? []).map((s) => s.created_at as string)
    const days = new Set(timestamps.map((t) => localDateKey(tz, new Date(t))))
    const practicedToday = days.has(todayKey)
    const streak = streakFromDays(days, todayKey)
    const lastPracticeKey = days.size ? [...days].sort().at(-1)! : null
    const daysSince = lastPracticeKey
      ? Math.round((Date.parse(todayKey) - Date.parse(lastPracticeKey)) / 864e5)
      : Infinity

    // Choose ONE email, highest priority first.
    let chosen: { kind: keyof typeof sent; subject: string; html: string } | null = null

    // 1) Weekly recap — Sunday, opted in, and actually active this week.
    if (prefs.weeklyEmail && localWeekday(tz) === 0) {
      const weekAgoMs = now.getTime() - 7 * 864e5
      const weekSessions = (sessions ?? []).filter((s) => new Date(s.created_at as string).getTime() >= weekAgoMs)
      if (weekSessions.length > 0) {
        const weekScores = weekSessions
          .map((s) => Number((s.feedback as { overall_score?: number })?.overall_score ?? 0))
          .filter((n) => n > 0)
        const stats = {
          sessions: weekSessions.length,
          avgScore: weekScores.length ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length) : 0,
          bestScore: weekScores.length ? Math.max(...weekScores) : 0,
        }
        chosen = { kind: 'weekly', ...weeklyRecapEmail(firstName, stats) }
      }
    }

    // 2) Streak at risk — live streak, nothing logged today yet.
    if (!chosen && prefs.streakAtRisk && streak > 0 && !practicedToday) {
      chosen = { kind: 'streak', ...streakAtRiskEmail(firstName, streak) }
    }

    // 3) Comeback nudge — a fresh 2–3 day lapse (no active streak). We don't
    //    nag never-active users or long-gone accounts.
    if (!chosen && prefs.dailyReminder && !practicedToday && streak === 0 && daysSince >= 2 && daysSince <= 3) {
      chosen = { kind: 'daily', ...dailyReminderEmail(firstName) }
    }

    if (!chosen) continue

    if (await sendEmail(email, chosen.subject, chosen.html)) {
      sent[chosen.kind]++
      await admin
        .from('profiles')
        .update({ preferences: { ...(p.preferences as object), lastNotifiedOn: todayKey } })
        .eq('id', p.id)
    }
  }

  console.log(`cron notifications: daily=${sent.daily} streak=${sent.streak} weekly=${sent.weekly}`)
  return NextResponse.json({ ok: true, ...sent })
}

/**
 * Consecutive-day streak from a set of local day keys, counted in the user's
 * timezone. A streak stays alive through today: anchor on today if practised,
 * else yesterday, then walk backwards.
 */
function streakFromDays(days: Set<string>, todayKey: string): number {
  let cursor = days.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1)
  if (!days.has(cursor)) return 0
  let n = 0
  while (days.has(cursor)) {
    n++
    cursor = shiftDayKey(cursor, -1)
  }
  return n
}

/** Shift a YYYY-MM-DD key by whole days (UTC math — keys are calendar dates). */
function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}
