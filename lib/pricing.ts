// ============================================================================
// SINGLE SOURCE OF TRUTH FOR PRICING
//
// Every price shown to a user and every amount charged/recorded comes from
// here. Before, the same numbers were copy-pasted across the pricing page, the
// homepage, the upgrade modal, and lib/razorpay.ts — and they kept drifting.
// Change a price? Change it ONCE, here.
//
// MONEY RULE: `amountCents` is the authoritative charged amount (integer cents)
// and MUST match the price of the matching plan in the Razorpay dashboard. The
// display strings are derived for humans; amountCents is what commission and
// the ledger compute on.
// ============================================================================

export type PlanKey = 'monthly' | 'annual'

export interface PlanPricing {
  planKey: PlanKey
  /** Written to profiles.plan_type on payment — must be in PAID_PLANS. */
  planType: 'monthly' | 'yearly'
  /** Razorpay plan id (env: test vs live differ). */
  planId: string
  /** AUTHORITATIVE charged amount, integer cents. Must equal the Razorpay plan. */
  amountCents: number
  currency: string
  /** Number of billing cycles before Razorpay completes the subscription. */
  totalCount: number
  // --- display ---
  name: string
  /** Promo price shown big, e.g. '$11.99'. */
  price: string
  /** Struck-through anchor, e.g. '$19.99' (omit if no promo). */
  wasPrice?: string
  period: string
  /** One-line billing note under the price. */
  note: string
  badge: string
  features: string[]
}

// --- The promo pricing (early-member). Change numbers HERE only. ------------
export const PRICING: Record<PlanKey, PlanPricing> = {
  annual: {
    planKey: 'annual',
    planType: 'yearly',
    planId: process.env.RAZORPAY_PLAN_ANNUAL ?? '',
    amountCents: 14393, // $143.88/yr ($11.99/mo) — 40% off $239.88
    currency: 'USD',
    totalCount: 10,
    name: 'Annual',
    price: '$11.99',
    wasPrice: '$19.99',
    period: '/mo',
    note: 'Early-member price — 40% off. Billed annually ($143.88/yr).',
    badge: 'BEST VALUE · 40% OFF',
    features: [
      'Unlimited sessions',
      'Full analytics dashboard',
      'Personalized AI coaching',
      'All 6 paths & coaches',
      'Priority support',
      'Early access to new modules',
    ],
  },
  monthly: {
    planKey: 'monthly',
    planType: 'monthly',
    planId: process.env.RAZORPAY_PLAN_MONTHLY ?? '',
    amountCents: 1699, // $16.99/mo — early-member promo
    currency: 'USD',
    totalCount: 120,
    name: 'Monthly',
    price: '$16.99',
    wasPrice: '$21.99',
    period: '/mo',
    note: 'Early-member price — save 23%. Billed monthly. Cancel anytime.',
    badge: '',
    features: [
      'Unlimited sessions',
      'Full analytics dashboard',
      'Personalized AI coaching',
      'All 6 paths & coaches',
    ],
  },
}

// --- The free trial card (display only; not a Razorpay plan). ---------------
export const FREE_TRIAL_CARD = {
  name: 'Free Trial',
  price: '$0',
  period: '',
  note: '14 days, then pick a plan',
  cta: 'START FREE',
  href: '/auth/signup',
  badge: '',
  features: ['Up to 10 sessions a day', 'Communication analysis', 'AI feedback summary', 'Daily streak & stickers'],
}

/** Look up a plan's pricing by key. */
export function getPlanPricing(planKey: string): PlanPricing | null {
  if (planKey === 'monthly' || planKey === 'annual') return PRICING[planKey]
  return null
}

/** Reverse lookup by Razorpay plan id (used by the webhook). */
export function getPlanPricingByRazorpayId(planId: string): PlanPricing | null {
  if (planId && PRICING.monthly.planId === planId) return PRICING.monthly
  if (planId && PRICING.annual.planId === planId) return PRICING.annual
  return null
}
