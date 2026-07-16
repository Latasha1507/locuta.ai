import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readPreferences, sanitizePreferencePatch } from '@/lib/preferences'
import { readProfileDetails, sanitizeProfileDetails } from '@/lib/profile-details'

// Saves profile + preference changes for the signed-in user. profiles has a
// user-level UPDATE policy (onboarding writes with the user client), so we
// update as the user — RLS keeps them scoped to their own row, no service role.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: current } = await supabase
    .from('profiles')
    .select('preferences, onboarding_data')
    .eq('id', user.id)
    .maybeSingle()

  const update: Record<string, unknown> = {}

  // --- name ---
  if (typeof body.fullName === 'string') {
    const name = body.fullName.trim().slice(0, 80)
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    update.full_name = name
  }

  // --- preferences (merge) ---
  const prefPatch = sanitizePreferencePatch(body.preferences && typeof body.preferences === 'object' ? (body.preferences as Record<string, unknown>) : body)
  if (Object.keys(prefPatch).length > 0) {
    update.preferences = { ...readPreferences(current?.preferences), ...prefPatch }
  }

  // --- profile details, incl. DOB (merge into onboarding_data) ---
  if (body.profile && typeof body.profile === 'object') {
    const detailPatch = sanitizeProfileDetails(body.profile as Record<string, unknown>)
    if (Object.keys(detailPatch).length > 0) {
      const existing = (current?.onboarding_data as Record<string, unknown> | null) ?? {}
      update.onboarding_data = { ...existing, ...readProfileDetails(existing), ...detailPatch }
    }
  }

  // --- email change: goes through Supabase auth, which sends a confirmation ---
  let emailPending = false
  if (typeof body.email === 'string' && body.email.trim() && body.email.trim() !== user.email) {
    const email = body.email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'That email looks invalid' }, { status: 400 })
    }
    const { error: emailErr } = await supabase.auth.updateUser({ email })
    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 400 })
    }
    // Supabase sends a confirmation link to the NEW address; the change only
    // takes effect once they click it. We don't touch profiles.email here.
    emailPending = true
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
    if (error) {
      return NextResponse.json({ error: 'Could not save your settings' }, { status: 500 })
    }
  } else if (!emailPending) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  return NextResponse.json({ success: true, emailPending })
}
