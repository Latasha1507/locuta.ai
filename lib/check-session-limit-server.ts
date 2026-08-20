import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { isAdmin } from '@/lib/admin'
import { getCoachStatus } from '@/lib/coach-account'

// Server-side trial / daily-limit enforcement.
//
// WHY THIS EXISTS: lib/check-session-limit.ts runs in the browser. A browser
// check is a UX affordance, not a control — anyone can POST straight to
// /api/feedback and skip it entirely, which means unlimited Whisper + GPT-4
// calls on our bill and expired trials that never convert. The limit must be
// enforced on the server, before we spend a cent on OpenAI.

export const TRIAL_DAYS = 14
export const TRIAL_SESSIONS_PER_DAY = 10

export type LimitReason =
  | 'ok'
  | 'trial_expired'
  | 'daily_limit'
  | 'explore'
  | 'coach_expired'
  | 'coach_revoked'

export interface ServerLimit {
  allowed: boolean
  reason: LimitReason
  daysRemaining: number
  sessionsRemainingToday: number
  planType: string
}

const PAID_PLANS = ['pro', 'paid', 'premium', 'founder', 'lifetime', 'monthly', 'yearly']

function sameLocalDay(a: string | null, b: string): boolean {
  return !!a && a.slice(0, 10) === b.slice(0, 10)
}

/**
 * Once a coach_complimentary account's 30 days or 100 sessions run out, flip
 * it into the SAME expired-trial state a regular user hits — reason
 * 'trial_expired', existing paywall copy, existing upgrade flow. Zero new UI:
 * the coach lands on the exact "your trial ended, upgrade" screen that
 * already exists.
 *
 * Back-dating trial_started_at (rather than leaving it null) is deliberate:
 * it means this account can never click "Start free trial" and get a second
 * free 14-day run — /api/start-trial's `already_started` check fires
 * immediately, and checkSessionLimitServer's own trial math already reads
 * daysRemaining=0 the instant this lands.
 *
 * Non-fatal: the caller has already blocked THIS request using the fresh
 * read regardless of whether this write succeeds — the write only saves the
 * next call from recomputing the same result.
 */
async function convertExpiredCoachAccount(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({
        plan_type: 'trial',
        trial_started_at: new Date(Date.now() - (TRIAL_DAYS + 1) * 864e5).toISOString(),
      })
      .eq('id', userId)
      .eq('plan_type', 'coach_complimentary') // never touch a row that changed under us
  } catch (e) {
    console.error('⚠️ Failed to convert expired coach account (non-fatal):', e)
  }
}

/**
 * The authoritative answer to "may this user run another session right now?".
 * Call this in any route that costs money BEFORE doing the work.
 */
export async function checkSessionLimitServer(userId: string): Promise<ServerLimit> {
  const supabase = await createClient()

  // Admins are never limited (needed for testing). This uses the SERVER admin
  // check (app_metadata), not a user-writable flag.
  if (await isAdmin()) {
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: 9999,
      sessionsRemainingToday: 9999,
      planType: 'admin',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'plan_type, trial_started_at, last_session_date, daily_sessions_used, ' +
        'coach_started_at, coach_session_cap, coach_sessions_used, coach_revoked_at',
    )
    .eq('id', userId)
    .maybeSingle()

  const planType = String(profile?.plan_type ?? 'trial').toLowerCase()

  // Coach complimentary accounts are their own plan_type, checked BEFORE the
  // paid-plan / trial logic below — not a trial variant.
  const coachStatus = getCoachStatus(profile ?? {})
  if (coachStatus.isCoachAccount) {
    if (coachStatus.reason === 'revoked') {
      return { allowed: false, reason: 'coach_revoked', daysRemaining: 0, sessionsRemainingToday: 0, planType }
    }
    if (!coachStatus.active) {
      // days_expired, cap_reached, or the defensive not_started case — all
      // read the same to the caller: complimentary access is over.
      await convertExpiredCoachAccount(userId)
      return { allowed: false, reason: 'coach_expired', daysRemaining: 0, sessionsRemainingToday: 0, planType }
    }
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: coachStatus.daysRemaining,
      sessionsRemainingToday: coachStatus.sessionsRemaining,
      planType,
    }
  }

  // Paying users: unlimited.
  if (PAID_PLANS.includes(planType)) {
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: 9999,
      sessionsRemainingToday: 9999,
      planType,
    }
  }

  // Explore users: signed up but have NOT opted into the trial yet. The trial
  // is opt-in (it starts only when they click "Start free trial"), so we do NOT
  // burn their 14-day clock at signup. Until they start it, lessons are locked
  // — they can browse paths, titles and details, but not practise.
  const startedAt = profile?.trial_started_at as string | null
  if (!startedAt) {
    return {
      allowed: false,
      reason: 'explore',
      daysRemaining: TRIAL_DAYS,
      sessionsRemainingToday: 0,
      planType,
    }
  }

  // Trial users (trial has been explicitly started).
  const daysUsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 864e5)
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysUsed)

  if (daysRemaining <= 0) {
    return { allowed: false, reason: 'trial_expired', daysRemaining: 0, sessionsRemainingToday: 0, planType }
  }

  const today = new Date().toISOString()
  const usedToday = sameLocalDay(profile?.last_session_date as string | null, today)
    ? Number(profile?.daily_sessions_used ?? 0)
    : 0

  const sessionsRemainingToday = Math.max(0, TRIAL_SESSIONS_PER_DAY - usedToday)

  if (sessionsRemainingToday <= 0) {
    return { allowed: false, reason: 'daily_limit', daysRemaining, sessionsRemainingToday: 0, planType }
  }

  return { allowed: true, reason: 'ok', daysRemaining, sessionsRemainingToday, planType }
}
