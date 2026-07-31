import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getPlanByRazorpayId } from '@/lib/razorpay'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * THE ONLY PLACE PAID ACCESS IS GRANTED OR REVOKED.
 *
 * Razorpay calls this after real payment events. We:
 *   1. verify the HMAC signature over the RAW body (reject forgeries),
 *   2. skip events we've already processed (idempotency),
 *   3. apply the change with fully idempotent writes (safe to run twice).
 *
 * Never trust the browser for access — only this route, only after a verified
 * signature, ever sets profiles.plan_type to a paid value.
 */

// Which Razorpay statuses should GRANT vs REVOKE access.
const GRANT_EVENTS = new Set(['subscription.activated', 'subscription.charged'])
const REVOKE_EVENTS = new Set([
  'subscription.halted',
  'subscription.completed',
  'subscription.expired',
])
// 'subscription.cancelled' is handled specially (keep access until period end).

interface RazorpaySubEntity {
  id: string
  status: string
  plan_id: string
  customer_id?: string | null
  current_end?: number | null
  charge_at?: number | null
  notes?: Record<string, string | number> | null
}

export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('webhook: RAZORPAY_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  // --- 1. Read the RAW body (must NOT be parsed before signature check) ---
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const eventId = request.headers.get('x-razorpay-event-id') ?? ''

  // --- 2. Verify signature: HMAC-SHA256(rawBody, secret), constant-time compare ---
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (!signaturesMatch(signature, expected)) {
    console.warn('webhook: invalid signature — rejecting')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  // Signature is valid → safe to parse.
  let event: { event?: string; payload?: { subscription?: { entity?: RazorpaySubEntity } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const eventType = String(event.event ?? '')
  const sub = event.payload?.subscription?.entity

  const admin = createAdminClient()

  // --- 3. Idempotency: if we've already recorded this event id, ack and stop.
  //        (Processing is ALSO idempotent below, so this is defence-in-depth.)
  if (eventId) {
    const { data: seen } = await admin
      .from('webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (seen) {
      return NextResponse.json({ status: 'already_processed' })
    }
  }

  // --- 4. Apply the change (idempotent). Only subscription.* events matter here.
  try {
    if (sub && (GRANT_EVENTS.has(eventType) || REVOKE_EVENTS.has(eventType) || eventType === 'subscription.cancelled')) {
      await applySubscriptionEvent(admin, eventType, sub)
    }
  } catch (e) {
    // Record NOTHING and return 500 so Razorpay retries. Because writes are
    // idempotent, a retry re-applying part of the work is safe.
    console.error('webhook: processing error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  // --- 5. Mark this event processed (best-effort; correctness does not depend
  //        on it because step 4 is idempotent). Unique(event_id) also guards
  //        against a concurrent duplicate.
  if (eventId) {
    await admin
      .from('webhook_events')
      .insert({ event_id: eventId, event_type: eventType, payload: event })
      // ignore duplicate-key errors from a racing delivery
      .then(({ error }) => {
        if (error && !/duplicate key/i.test(error.message)) {
          console.error('webhook: could not record event (non-fatal):', error.message)
        }
      })
  }

  return NextResponse.json({ status: 'ok' })
}

/**
 * Idempotent application of a subscription event. Safe to run multiple times for
 * the same event: setting the same plan_type twice is a no-op, the subscriptions
 * upsert is keyed by the Razorpay id, and the referral insert is guarded by a
 * unique(affiliate,user) constraint.
 */
async function applySubscriptionEvent(
  admin: SupabaseClient,
  eventType: string,
  sub: RazorpaySubEntity,
) {
  // Resolve which of our users owns this subscription. Primary source: the row
  // we wrote in /api/subscribe. Fallback: the note we set at creation.
  const { data: existingRow } = await admin
    .from('subscriptions')
    .select('id, user_id, base_amount')
    .eq('razorpay_subscription_id', sub.id)
    .maybeSingle()

  const noteUserId = sub.notes && typeof sub.notes.user_id === 'string' ? (sub.notes.user_id as string) : null
  const userId = existingRow?.user_id ?? noteUserId
  if (!userId) {
    // We can't attribute this to a user — do not guess. Log and ack (recording
    // the event will stop retries; a missing row is an ops issue, not a charge).
    console.error('webhook: no user for subscription', sub.id)
    return
  }

  const plan = getPlanByRazorpayId(sub.plan_id)
  const periodEnd =
    typeof sub.current_end === 'number'
      ? new Date(sub.current_end * 1000).toISOString()
      : typeof sub.charge_at === 'number'
        ? new Date(sub.charge_at * 1000).toISOString()
        : null

  const grant = GRANT_EVENTS.has(eventType)
  const revoke = REVOKE_EVENTS.has(eventType)

  // 1) Keep our subscriptions ledger in sync (idempotent update by Razorpay id).
  await admin
    .from('subscriptions')
    .update({
      status: sub.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id)

  // 2) Update the profile — this is what gating reads.
  const profileUpdate: Record<string, unknown> = {
    razorpay_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: periodEnd,
  }
  if (sub.customer_id) profileUpdate.razorpay_customer_id = sub.customer_id

  if (grant && plan) {
    // Grant access: plan_type must be a value gating treats as paid.
    profileUpdate.plan_type = plan.planType
  } else if (revoke) {
    // Revoke: a non-paid plan_type falls through to trial logic → no access.
    profileUpdate.plan_type = 'expired'
  }
  // subscription.cancelled: intentionally does NOT change plan_type. The user
  // keeps the access they paid for until the period naturally completes (which
  // arrives as subscription.completed → revoke). To revoke immediately on
  // cancel instead, set profileUpdate.plan_type = 'expired' here.

  await admin.from('profiles').update(profileUpdate).eq('id', userId)

  // 3) Affiliate payout ledger — only on a GRANT, only once per (affiliate,user).
  if (grant) {
    await recordReferralIfNeeded(admin, userId, existingRow?.id ?? null, sub)
  }
}

/**
 * If this user was referred by an affiliate, record ONE referral row for the
 * payout ledger. Idempotent via the unique(affiliate_id, user_id) constraint:
 * a renewal (another subscription.charged) will hit the constraint and be
 * ignored, so an affiliate is never paid twice for the same user.
 */
async function recordReferralIfNeeded(
  admin: SupabaseClient,
  userId: string,
  subscriptionRowId: string | null,
  sub: RazorpaySubEntity,
) {
  const { data: profile } = await admin
    .from('profiles')
    .select('referred_by_affiliate_id')
    .eq('id', userId)
    .maybeSingle()

  const affiliateId = profile?.referred_by_affiliate_id
  if (!affiliateId) return

  const { data: affiliate } = await admin
    .from('affiliates')
    .select('commission_percent')
    .eq('id', affiliateId)
    .maybeSingle()
  if (!affiliate) return

  // Charged amount from our ledger row (integer cents). Commission rounded to
  // the nearest whole cent — integers only, no float drift.
  const { data: subRow } = await admin
    .from('subscriptions')
    .select('charged_amount, currency')
    .eq('razorpay_subscription_id', sub.id)
    .maybeSingle()
  const charged = Number(subRow?.charged_amount ?? 0)
  const currency = String(subRow?.currency ?? 'USD')
  const commissionPct = Number(affiliate.commission_percent ?? 0)
  const commissionAmount = Math.round((charged * commissionPct) / 100)

  const { error } = await admin.from('referrals').insert({
    affiliate_id: affiliateId,
    user_id: userId,
    subscription_id: subscriptionRowId,
    charged_amount: charged,
    currency,
    commission_amount: commissionAmount,
    commission_status: 'pending',
  })
  // Duplicate (already recorded for this affiliate+user) is expected on renewals.
  if (error && !/duplicate key/i.test(error.message)) {
    console.error('webhook: referral insert failed:', error.message)
  }
}

/** Constant-time signature comparison that never throws on length mismatch. */
function signaturesMatch(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  } catch {
    return false
  }
}
