import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { readPreferences } from '@/lib/preferences'
import { computeStreak } from '@/lib/streaks'
import {
  sendEmail,
  dailyReminderEmail,
  streakAtRiskEmail,
  weeklyRecapEmail,
  localHour,
  localWeekday,
  localDateKey,
  reminderHour,
} from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Hourly notification cron. Configure in vercel.json to hit this every hour.
 * For each user it decides — in THEIR timezone — whether a daily reminder,
 * streak-at-risk, or weekly recap is due, respects their toggles, dedupes so a
 * given email is sent at most once per local day, and sends via Resend.
 *
 * Protected by CRON_SECRET: Vercel Cron sends it as a Bearer token; we reject
 * anything else so the endpoint can't be triggered by outsiders.
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

  let dailySent = 0
  let streakSent = 0
  let weeklySent = 0

  for (const p of profiles ?? []) {
    const email = p.email as string | null
    if (!email) continue
    const prefs = readPreferences(p.preferences)
    const tz = prefs.timezone
    const firstName = String(p.full_name ?? '').split(' ')[0] || 'there'
    const today = localDateKey(tz)
    const hour = localHour(tz)
    const patch: Record<string, string> = {}

    // Load this user's sessions once (needed for "practised today?", streak,
    // weekly stats). Cheap per-user; only for users who have a toggle on.
    const wantsAny = prefs.dailyReminder || prefs.streakAtRisk || prefs.weeklyEmail
    if (!wantsAny) continue

    const { data: sessions } = await admin
      .from('sessions')
      .select('created_at, feedback')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(200)

    const timestamps = (sessions ?? []).map((s) => s.created_at as string)
    const practisedToday = timestamps.some((t) => localDateKey(tz) === new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date(t)))
    const streak = computeStreak(timestamps)

    // ── Daily reminder: at their reminder hour, if they haven't practised and
    //    we haven't already sent today. ──────────────────────────────────────
    if (prefs.dailyReminder && !practisedToday && hour === reminderHour(prefs.reminderTime)) {
      if (prefs.lastDailyReminderAt !== today) {
        const { subject, html } = dailyReminderEmail(firstName)
        if (await sendEmail(email, subject, html)) {
          patch.lastDailyReminderAt = today
          dailySent++
        }
      }
    }

    // ── Streak at risk: they have a live streak, haven't practised today, and
    //    it's late in their evening (21:00 local). Once per day. ─────────────
    if (prefs.streakAtRisk && streak > 0 && !practisedToday && hour === 21) {
      if (prefs.lastStreakWarningAt !== today) {
        const { subject, html } = streakAtRiskEmail(firstName, streak)
        if (await sendEmail(email, subject, html)) {
          patch.lastStreakWarningAt = today
          streakSent++
        }
      }
    }

    // ── Weekly recap: Sunday 6pm local, once per that date. ─────────────────
    if (prefs.weeklyEmail && localWeekday(tz) === 0 && hour === 18) {
      if (prefs.lastWeeklyEmailAt !== today) {
        const weekAgo = Date.now() - 7 * 864e5
        const weekScores = (sessions ?? [])
          .filter((s) => new Date(s.created_at as string).getTime() >= weekAgo)
          .map((s) => Number((s.feedback as { overall_score?: number })?.overall_score ?? 0))
          .filter((n) => n > 0)
        const stats = {
          sessions: weekScores.length,
          avgScore: weekScores.length ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length) : 0,
          bestScore: weekScores.length ? Math.max(...weekScores) : 0,
        }
        const { subject, html } = weeklyRecapEmail(firstName, stats)
        if (await sendEmail(email, subject, html)) {
          patch.lastWeeklyEmailAt = today
          weeklySent++
        }
      }
    }

    // Persist any dedupe markers we set (merge into the preferences blob).
    if (Object.keys(patch).length > 0) {
      await admin
        .from('profiles')
        .update({ preferences: { ...(p.preferences as object), ...patch } })
        .eq('id', p.id)
    }
  }

  console.log(`cron notifications: daily=${dailySent} streak=${streakSent} weekly=${weeklySent}`)
  return NextResponse.json({ ok: true, dailySent, streakSent, weeklySent })
}
