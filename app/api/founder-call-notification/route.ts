import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Authoritative founder-call booking. Previously the FounderCallModal wrote the
 * booking DIRECTLY from the browser (client-side insert + slot update), which
 * meant: identity/email came from the client, the slot cap wasn't enforced
 * (founder_call_settings has no user UPDATE policy, so slots_used never
 * incremented), and a user could insert unlimited rows.
 *
 * Now the write is server-side and privileged: identity comes from the SESSION,
 * the booking + slot increment go through the service-role client, the cap is
 * enforced, and a unique(user_id) constraint makes one-booking-per-user
 * race-safe. The client INSERT policy on founder_call_bookings has been removed,
 * so this route is the only way to book.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'auth', message: 'Please sign in first.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = (String(body.name ?? '').trim() || 'Locuta member').slice(0, 80)
    const speakingChallenge = String(body.speaking_challenge ?? '').trim().slice(0, 1000)

    const admin = createAdminClient()

    // One booking per account (also backed by a unique(user_id) constraint).
    const { data: existing } = await admin
      .from('founder_call_bookings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'already_booked', message: 'You already have a call booked.' }, { status: 409 })
    }

    // Respect the slot cap.
    const { data: settings } = await admin
      .from('founder_call_settings')
      .select('total_slots, slots_used')
      .eq('id', 1)
      .maybeSingle()
    if (settings && (settings.slots_used ?? 0) >= (settings.total_slots ?? 0)) {
      return NextResponse.json({ error: 'slots_full', message: 'All founder-call slots are taken right now.' }, { status: 409 })
    }

    // Insert the booking. Email is the ACCOUNT email — never a body-supplied one.
    const { error: insErr } = await admin.from('founder_call_bookings').insert({
      user_id: user.id,
      name,
      email: user.email,
      speaking_challenge: speakingChallenge,
      status: 'pending',
    })
    if (insErr) {
      // A racing double-submit trips the unique(user_id) constraint — treat as "already booked".
      if (/duplicate key/i.test(insErr.message)) {
        return NextResponse.json({ error: 'already_booked', message: 'You already have a call booked.' }, { status: 409 })
      }
      console.error('founder-call insert failed:', insErr.message)
      return NextResponse.json({ error: 'server', message: 'Could not book. Please try again.' }, { status: 500 })
    }

    // Increment the slot count (service-role; the settings table has no user UPDATE policy).
    if (settings) {
      await admin
        .from('founder_call_settings')
        .update({ slots_used: (settings.slots_used || 0) + 1 })
        .eq('id', 1)
    }

    console.log('🎯 Founder call booked:', user.email, '—', name)
    // TODO: send confirmation email (Resend) to the user + founder.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Founder-call booking error:', error)
    return NextResponse.json({ error: 'server', message: 'Failed to book' }, { status: 500 })
  }
}
