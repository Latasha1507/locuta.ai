import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Starts the 14-day free trial for the signed-in user — the explicit opt-in
 * that moves them from EXPLORE to TRIAL. The clock starts NOW (on this click),
 * not at signup, so a user who signs up today and starts the trial next week
 * gets their full 14 days from next week.
 *
 * Idempotent and safe:
 *   • already on a trial  → no-op (don't reset their clock)
 *   • already paid        → no-op (don't downgrade)
 *   • only an EXPLORE user (no trial_started_at, non-paid) actually starts one.
 * A user cannot use this to restart an expired trial — once trial_started_at is
 * set, it is never cleared here.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type, trial_started_at')
    .eq('id', user.id)
    .maybeSingle()

  const planType = String(profile?.plan_type ?? '').toLowerCase()
  const paid = ['monthly', 'yearly', 'pro', 'paid', 'premium', 'founder', 'lifetime'].includes(planType)

  // Already paid, or a trial already exists (active OR expired) → do nothing.
  if (paid) {
    return NextResponse.json({ status: 'already_paid' })
  }
  if (profile?.trial_started_at) {
    return NextResponse.json({ status: 'already_started' })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan_type: 'trial',
      trial_started_at: new Date().toISOString(),
      trial_sessions_used: 0,
    })
    .eq('id', user.id)
    // Guard against a race: only flip if it's still unstarted.
    .is('trial_started_at', null)

  if (error) {
    console.error('start-trial error:', error.message)
    return NextResponse.json({ error: 'Could not start trial. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ status: 'started' })
}
