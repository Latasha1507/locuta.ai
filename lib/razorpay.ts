import Razorpay from 'razorpay'

/**
 * Razorpay client. Keys come from env so TEST and LIVE never mix in code.
 * Throws loudly if unconfigured — we never want a silent half-configured
 * billing client.
 */
export function getRazorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) {
    throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).')
  }
  return new Razorpay({ key_id, key_secret })
}

/**
 * Plan configuration — the single source of truth mapping a plan the user picks
 * to (a) the Razorpay plan id, (b) the price we RECORD (smallest currency unit,
 * integer — never a float), and (c) the `plan_type` our gating already treats as
 * paid (see lib/check-session-limit-server.ts → PAID_PLANS: 'monthly','yearly').
 *
 * Plan ids come from env because TEST-mode and LIVE-mode plans have DIFFERENT
 * ids. Live ids on file: annual plan_TJxdazloieOs5m, monthly plan_TJxetKLx7BwfdI.
 *
 * `amount`/`currency` here MUST match what the plan says in the Razorpay
 * dashboard. They are only used to record what we charged; the actual charge is
 * driven by the Razorpay plan, so a mismatch never overcharges — it would only
 * mislabel our own ledger, which the webhook additionally reconciles.
 */
export type PlanKey = 'monthly' | 'annual'

export interface PlanConfig {
  planKey: PlanKey
  /** Value written to profiles.plan_type — must be in PAID_PLANS to grant access. */
  planType: 'monthly' | 'yearly'
  planId: string
  amount: number // smallest currency unit, e.g. 2199 = $21.99
  currency: string
  /** Number of billing cycles Razorpay should run before completing. */
  totalCount: number
}

export function getPlan(planKey: string): PlanConfig | null {
  if (planKey === 'monthly') {
    return {
      planKey: 'monthly',
      planType: 'monthly',
      planId: process.env.RAZORPAY_PLAN_MONTHLY ?? '',
      amount: 2199, // $21.99
      currency: 'USD',
      totalCount: 120, // ~10 years of monthly cycles; effectively "until cancelled"
    }
  }
  if (planKey === 'annual') {
    return {
      planKey: 'annual',
      planType: 'yearly',
      planId: process.env.RAZORPAY_PLAN_ANNUAL ?? '',
      amount: 23988, // $239.88
      currency: 'USD',
      totalCount: 10, // ~10 years of annual cycles
    }
  }
  return null
}

/** Map a Razorpay plan id back to our config (used by the webhook). */
export function getPlanByRazorpayId(planId: string): PlanConfig | null {
  for (const key of ['monthly', 'annual'] as const) {
    const p = getPlan(key)
    if (p && p.planId && p.planId === planId) return p
  }
  return null
}
