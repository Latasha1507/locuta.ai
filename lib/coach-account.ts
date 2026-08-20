// lib/coach-account.ts
//
// Pure eligibility logic for `coach_complimentary` accounts — comped accounts
// given to communication-coach partners to evaluate Locuta before a bulk
// purchase or affiliate deal. 30 days OR 100 sessions, whichever comes first,
// plus an admin kill-switch for policy breaches (e.g. sharing one account
// across a coach's students).
//
// Deliberately has ZERO Supabase imports so it's safe to call from a server
// component (modules/page.tsx, category-map.ts — lesson unlock) AND an API
// route (check-session-limit-server.ts — the practice/feedback gate) without
// the two ever drifting apart. That drift already happened once in this repo
// between the module-unlock flags (trial_ends_at) and the session-limit flags
// (trial_started_at + 14d, computed separately) — don't repeat it here.

export const COACH_TRIAL_DAYS = 30
export const COACH_DEFAULT_SESSION_CAP = 100

export interface CoachProfileFields {
  plan_type?: string | null
  coach_started_at?: string | null
  coach_session_cap?: number | null
  coach_sessions_used?: number | null
  coach_revoked_at?: string | null
}

export type CoachStatus =
  | { isCoachAccount: false }
  | {
      isCoachAccount: true
      active: boolean
      reason: 'ok' | 'revoked' | 'days_expired' | 'cap_reached' | 'not_started'
      daysRemaining: number
      sessionsRemaining: number
    }

/**
 * The single authoritative read of a coach_complimentary account's status.
 * Pure — does NOT write anything. Callers decide what to do with an inactive
 * result (block a session, lock lessons, lazily convert the plan_type).
 */
export function getCoachStatus(profile: CoachProfileFields): CoachStatus {
  const planType = String(profile.plan_type ?? '').toLowerCase()
  if (planType !== 'coach_complimentary') {
    return { isCoachAccount: false }
  }

  // Revoke overrides everything else, checked first — a breach cuts access
  // immediately regardless of how many days or sessions were left.
  if (profile.coach_revoked_at) {
    return { isCoachAccount: true, active: false, reason: 'revoked', daysRemaining: 0, sessionsRemaining: 0 }
  }

  if (!profile.coach_started_at) {
    // Provisioned but the clock was never set — a malformed row, not a real
    // flow (the grant route always sets this). Fail closed, not open.
    return { isCoachAccount: true, active: false, reason: 'not_started', daysRemaining: COACH_TRIAL_DAYS, sessionsRemaining: 0 }
  }

  const daysUsed = Math.floor((Date.now() - new Date(profile.coach_started_at).getTime()) / 864e5)
  const daysRemaining = Math.max(0, COACH_TRIAL_DAYS - daysUsed)

  const cap = Number(profile.coach_session_cap ?? COACH_DEFAULT_SESSION_CAP)
  const used = Number(profile.coach_sessions_used ?? 0)
  const sessionsRemaining = Math.max(0, cap - used)

  if (daysRemaining <= 0) {
    return { isCoachAccount: true, active: false, reason: 'days_expired', daysRemaining: 0, sessionsRemaining }
  }
  if (sessionsRemaining <= 0) {
    return { isCoachAccount: true, active: false, reason: 'cap_reached', daysRemaining, sessionsRemaining: 0 }
  }

  return { isCoachAccount: true, active: true, reason: 'ok', daysRemaining, sessionsRemaining }
}
