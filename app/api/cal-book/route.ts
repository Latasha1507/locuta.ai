import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// NOTE: this route is not currently wired into the app (the founder-call modal
// books via a client-side insert). It is kept for the real Cal.com integration
// — but it is publicly POST-able, so it must not be an unauthenticated mailer.

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(apiKey)
  }
  return _resend
}

/** Escape user-supplied text before it goes into an HTML email body. */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export async function POST(request: Request) {
  try {
    // AUTH FIRST. This route books a real calendar slot, decrements a limited
    // pool, writes the bookings table AND sends emails. It used to be reachable
    // UNAUTHENTICATED with a client-supplied userId and an arbitrary recipient
    // email — i.e. an open mailer that also drained the slot pool. Identity now
    // comes from the session; the body only supplies the slot + free-text note.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const selectedSlot = body.selectedSlot as { time?: string } | undefined
    if (!selectedSlot?.time) {
      return NextResponse.json({ error: 'Pick a time slot first.' }, { status: 400 })
    }
    const name = (String(body.name ?? '').trim() || 'Locuta member').slice(0, 80)
    const speakingChallenge = String(body.speaking_challenge ?? '').trim().slice(0, 1000)
    // Confirmations go to the ACCOUNT email — never an address from the body.
    const email = user.email
    const userId = user.id

    // One founder call per account — also stops slot exhaustion by repeat POSTs.
    const { data: existing } = await supabase
      .from('founder_call_bookings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'You already have a call booked.' }, { status: 409 })
    }

    // Respect the slot cap.
    const { data: settings } = await supabase
      .from('founder_call_settings')
      .select('total_slots, slots_used')
      .eq('id', 1)
      .maybeSingle()
    if (settings && (settings.slots_used ?? 0) >= (settings.total_slots ?? 0)) {
      return NextResponse.json({ error: 'All founder-call slots are taken right now.' }, { status: 409 })
    }

    // Book via Cal.com API.
    const calResponse = await fetch('https://api.cal.com/v1/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CAL_COM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventTypeId: parseInt(process.env.CAL_COM_EVENT_TYPE_ID!),
        start: selectedSlot.time,
        responses: { name, email, notes: speakingChallenge },
        timeZone: 'UTC',
        language: 'en',
        metadata: { source: 'locuta_founder_call' },
      }),
    })

    if (!calResponse.ok) {
      const err = await calResponse.json().catch(() => ({}))
      console.error('Cal.com booking error:', err)
      return NextResponse.json({ error: 'Could not book that slot. Try another time.' }, { status: 502 })
    }

    const booking = await calResponse.json()

    // Save the booking + increment the slot count (identity from the session).
    await supabase.from('founder_call_bookings').insert({
      user_id: userId,
      name,
      email,
      speaking_challenge: speakingChallenge,
      preferred_time: selectedSlot.time,
      cal_com_event_id: booking.id?.toString(),
      status: 'confirmed',
    })
    if (settings) {
      await supabase
        .from('founder_call_settings')
        .update({ slots_used: (settings.slots_used || 0) + 1 })
        .eq('id', 1)
    }

    const meetingTime = new Date(selectedSlot.time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    const meetingUrl = `https://cal.com/${process.env.CAL_COM_USERNAME}/founder-feedback?rescheduleUid=${booking.uid}`

    // Emails — non-blocking. Recipient is the account email; user text escaped.
    try {
      await Promise.all([
        getResend().emails.send({
          from: 'Locuta <onboarding@resend.dev>',
          to: process.env.FOUNDER_EMAIL!,
          subject: `New Founder Call: ${name} — ${meetingTime}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2fa552;">New Founder Call Booked</h2>
              <div style="background: #f4f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Meeting Time:</strong><br/>${esc(meetingTime)}</p>
                <p><strong>Name:</strong> ${esc(name)}</p>
                <p><strong>Email:</strong> ${esc(email)}</p>
                <p><strong>Speaking Challenge:</strong><br/>${esc(speakingChallenge)}</p>
              </div>
              <p><a href="${meetingUrl}" style="color: #2fa552;">${meetingUrl}</a></p>
            </div>
          `,
        }),
        getResend().emails.send({
          from: 'Locuta <onboarding@resend.dev>',
          to: email,
          subject: 'Your Locuta founder call is confirmed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2fa552;">You're all set, ${esc(name)}.</h2>
              <div style="background: #eafaef; border-left: 4px solid #3fce6f; padding: 20px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your call is confirmed:</strong></p>
                <p style="margin: 8px 0 0; font-size: 18px; color: #2fa552;">${esc(meetingTime)}</p>
              </div>
              <p><a href="${meetingUrl}" style="display:inline-block;background:#3fce6f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">View event details</a></p>
              <p style="margin-top: 30px;">Looking forward to speaking with you!<br/><strong>Locuta</strong></p>
            </div>
          `,
        }),
      ])
    } catch (emailError) {
      console.error('⚠️ Email error (non-blocking):', emailError)
    }

    return NextResponse.json({ success: true, meetingUrl })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Failed to book call' }, { status: 500 })
  }
}
