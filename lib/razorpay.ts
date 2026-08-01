import Razorpay from 'razorpay'
import { getPlanPricing, getPlanPricingByRazorpayId, type PlanPricing } from '@/lib/pricing'

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
  amount: number // smallest currency unit, e.g. 1699 = $16.99
  currency: string
  /** Number of billing cycles Razorpay should run before completing. */
  totalCount: number
}

// All amounts/plan ids now come from lib/pricing.ts — the single source of
// truth. This keeps the charged amount (and therefore commission) exactly in
// step with what the pricing UI shows.
function toConfig(p: PlanPricing): PlanConfig {
  return {
    planKey: p.planKey,
    planType: p.planType,
    planId: p.planId,
    amount: p.amountCents,
    currency: p.currency,
    totalCount: p.totalCount,
  }
}

export function getPlan(planKey: string): PlanConfig | null {
  const p = getPlanPricing(planKey)
  return p ? toConfig(p) : null
}

/** Map a Razorpay plan id back to our config (used by the webhook). */
export function getPlanByRazorpayId(planId: string): PlanConfig | null {
  const p = getPlanPricingByRazorpayId(planId)
  return p ? toConfig(p) : null
}
