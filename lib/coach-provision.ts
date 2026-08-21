// lib/coach-provision.ts
//
// The single writer that turns an existing profile into an active
// coach_complimentary account. Shared by BOTH the admin grant route and the
// invite route so provisioning can never drift between them (this repo has a
// history of the same rule reimplemented in two places and diverging).
//
// Caller contract:
//   - MUST pass a SERVICE-ROLE client. These columns are not writable by the
//     authenticated role (see the profiles column-grant lockdown migration),
//     so a user-scoped client would silently update zero rows.
//   - MUST have already verified the caller is an admin (requireAdmin()).

import type { SupabaseClient } from '@supabase/supabase-js'
import { COACH_DEFAULT_SESSION_CAP } from './coach-account'

const PAID_PLANS = ['monthly', 'yearly', 'pro', 'paid', 'premium', 'founder', 'lifetime']

export interface CoachGrantRow {
  id: string
  email: string | null
  plan_type: string
  coach_started_at: string | null
  coach_session_cap: number
}

export type GrantCoachResult =
  | { ok: true; profile: CoachGrantRow }
  /** No profile row for that id (user doesn't exist, or trigger hasn't run). */
  | { ok: false; reason: 'not_found' }
  /** Refused: the account is on a paying plan — we don't silently downgrade a
   *  real customer into a comped coach account. Re-provisioning an existing
   *  coach, or upgrading a trial/explore user, is allowed. */
  | { ok: false; reason: 'paid_plan'; currentPlan: string }

/**
 * Provision (or re-provision) a coach_complimentary account: 30-day clock from
 * now, a fresh session counter, revoke cleared. Idempotent for coaches — call
 * it again to reset a coach's 30 days / cap.
 */
export async function grantCoachAccount(
  admin: SupabaseClient,
  userId: string,
  sessionCap?: number,
): Promise<GrantCoachResult> {
  const cap = Number.isFinite(Number(sessionCap))
    ? Math.max(1, Math.floor(Number(sessionCap)))
    : COACH_DEFAULT_SESSION_CAP

  // Guard against clobbering a paying customer's plan. One extra read, but it
  // turns an irreversible "why did my subscription vanish" incident into a
  // clean 409 the caller can surface.
  const { data: existing, error: readErr } = await admin
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .maybeSingle()

  if (readErr) throw new Error(readErr.message)
  if (!existing) return { ok: false, reason: 'not_found' }

  const currentPlan = String((existing as { plan_type?: string | null }).plan_type ?? '').toLowerCase()
  if (PAID_PLANS.includes(currentPlan)) {
    return { ok: false, reason: 'paid_plan', currentPlan }
  }

  const { data, error } = await admin
    .from('profiles')
    .update({
      plan_type: 'coach_complimentary',
      coach_started_at: new Date().toISOString(),
      coach_session_cap: cap,
      coach_sessions_used: 0,
      coach_revoked_at: null,
      coach_revoked_reason: null,
      // Coaches are partners evaluating the product, not learners — they must
      // NOT be sent through the learner questionnaire (age / skill / speaking
      // level). Marking onboarding complete drops them straight onto the
      // dashboard, where the personalized coach welcome greets them by name.
      onboarding_completed: true,
    })
    .eq('id', userId)
    .select('id, email, plan_type, coach_started_at, coach_session_cap')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return { ok: false, reason: 'not_found' }

  return { ok: true, profile: data[0] as CoachGrantRow }
}
