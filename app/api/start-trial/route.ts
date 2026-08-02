import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Starts the 14-day free trial for the signed-in user — the explicit opt-in
 * that moves EXPLORE → TRIAL. The clock starts NOW (on this click).
 *
 * Idempotent: already-paid or already-started → no-op. Only an explore user
 * (no trial_started_at, non-paid) actually starts a trial.
 *
 * Uses the ADMIN client for the write and RETURNS THE UPDATED ROW so the update
 * can never succeed silently with 0 rows changed (the previous failure mode).
 */
export async function POST() {
  // Identify the user with their own session…
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // …but perform the privileged state change with the service role, so RLS on
  // profiles can never cause a silent 0-row update.
  const admin = createAdminClient()

  const { data: profile, error: readErr } = await admin
    .from('profiles')
    .select('plan_type, trial_started_at')
    .eq('id', user.id)
    .maybeSingle()

  if (readErr) {
    console.error('start-trial read error:', readErr.message)
    return NextResponse.json({ error: 'Could not read your account.' }, { status: 500 })
  }

  const planType = String(profile?.plan_type ?? '').toLowerCase()
  const paid = ['monthly', 'yearly', 'pro', 'paid', 'premium', 'founder', 'lifetime'].includes(planType)
  if (paid) return NextResponse.json({ status: 'already_paid' })
  if (profile?.trial_started_at) return NextResponse.json({ status: 'already_started' })

  // Flip to trial. `.select()` returns the changed rows so we can VERIFY the
  // write actually happened rather than trusting a no-error response.
  const { data: updated, error } = await admin
    .from('profiles')
    .update({
      plan_type: 'trial',
      trial_started_at: new Date().toISOString(),
      trial_sessions_used: 0,
    })
    .eq('id', user.id)
    .select('id, plan_type, trial_started_at')

  if (error) {
    // Surface the real DB message so a constraint issue (e.g. valid_plan_type
    // not allowing 'trial') is visible instead of a vague failure.
    console.error('start-trial update error:', error.message)
    return NextResponse.json(
      { error: 'Could not start trial.', detail: error.message },
      { status: 500 },
    )
  }

  if (!updated || updated.length === 0) {
    // No profile row existed to update (the missing-profile bug). Self-heal:
    // create the row already in trial state so the user isn't stuck.
    const { data: created, error: insertErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          plan_type: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_sessions_used: 0,
        },
        { onConflict: 'id' },
      )
      .select('id, plan_type, trial_started_at')

    if (insertErr || !created || created.length === 0) {
      console.error('start-trial: could not create profile:', insertErr?.message)
      return NextResponse.json(
        { error: 'Could not start trial.', detail: insertErr?.message },
        { status: 500 },
      )
    }
    return NextResponse.json({ status: 'started', profile: created[0] })
  }

  return NextResponse.json({ status: 'started', profile: updated[0] })
}
