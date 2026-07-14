import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

// Server-side trial / daily-limit enforcement.
//
// WHY THIS EXISTS: lib/check-session-limit.ts runs in the browser. A browser
// check is a UX affordance, not a control — anyone can POST straight to
// /api/feedback and skip it entirely, which means unlimited Whisper + GPT-4
// calls on our bill and expired trials that never convert. The limit must be
// enforced on the server, before we spend a cent on OpenAI.

export const TRIAL_DAYS = 14
export const TRIAL_SESSIONS_PER_DAY = 10

export type LimitReason = 'ok' | 'trial_expired' | 'daily_limit'

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
    .select('plan_type, trial_started_at, last_session_date, daily_sessions_used')
    .eq('id', userId)
    .maybeSingle()

  const planType = String(profile?.plan_type ?? 'trial').toLowerCase()

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

  // Trial users.
  const startedAt = profile?.trial_started_at as string | null
  if (!startedAt) {
    // Trial hasn't been initialised yet — treat as day 1 rather than locking
    // someone out of a product they just signed up for.
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: TRIAL_DAYS,
      sessionsRemainingToday: TRIAL_SESSIONS_PER_DAY,
      planType,
    }
  }

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
