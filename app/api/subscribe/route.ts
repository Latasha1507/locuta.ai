import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getRazorpay, getPlan } from '@/lib/razorpay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Creates a Razorpay subscription for the signed-in user against the chosen
 * plan, records a PENDING row in our subscriptions table (this row is what the
 * webhook uses to attribute the payment to a user), and returns the ids the
 * browser needs to open Razorpay Checkout.
 *
 * IMPORTANT: this route grants NOTHING. It only initiates. Access is granted
 * exclusively by the signature-verified webhook once payment actually succeeds.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Require an authenticated user.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // 2. Validate the requested plan.
    let planKey = ''
    try {
      const body = await request.json()
      planKey = String(body?.planKey ?? '')
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const plan = getPlan(planKey)
    if (!plan) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }
    if (!plan.planId) {
      // Env not configured — fail loudly rather than create a bad subscription.
      return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
    }

    const admin = createAdminClient()

    // 3. Only a GENUINELY ACTIVE subscription should block a new one. A row
    //    left in 'created'/'pending' is an ATTEMPT that never completed (e.g.
    //    the payment failed or the user closed checkout) — it must NOT lock the
    //    user out of trying again. We block only on 'active'/'authenticated'.
    const { data: activeSub } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'authenticated'])
      .maybeSingle()
    if (activeSub) {
      return NextResponse.json(
        { error: 'You already have an active subscription.' },
        { status: 409 },
      )
    }

    // Clean up any stale, never-completed attempts for this user so the ledger
    // doesn't accumulate dead 'created' rows (and so a prior failed attempt —
    // like a declined card — can't wrongly appear to be "in progress").
    await admin
      .from('subscriptions')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('status', ['created', 'pending'])

    // 4. Create the subscription in Razorpay. No discount in Phase 1 — the
    //    charge equals the plan price. (Phase 2 will attach an offer_id here.)
    const razorpay = getRazorpay()
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,
      total_count: plan.totalCount,
      customer_notify: 1,
      // notes are our secondary attribution channel (primary is the DB row).
      notes: { user_id: user.id, plan_key: plan.planKey },
    })

    // 5. Record a PENDING row keyed by the Razorpay subscription id. This is the
    //    authoritative user↔subscription link the webhook reads later.
    const { error: insertErr } = await admin.from('subscriptions').insert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: plan.planId,
      plan_key: plan.planKey,
      status: subscription.status, // 'created'
      base_amount: plan.amount,
      charged_amount: plan.amount, // no discount in Phase 1
      currency: plan.currency,
    })
    if (insertErr) {
      // We created a Razorpay subscription but couldn't record it. Surface an
      // error rather than proceed — the webhook could still attribute via notes,
      // but we prefer to fail visibly and let the user retry.
      console.error('subscribe: failed to record subscription row:', insertErr.message)
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      // short_url lets you complete payment WITHOUT the frontend — used for
      // Test-mode verification before Checkout is wired.
      shortUrl: subscription.short_url,
    })
  } catch (e) {
    console.error('subscribe error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong starting checkout.' }, { status: 500 })
  }
}
