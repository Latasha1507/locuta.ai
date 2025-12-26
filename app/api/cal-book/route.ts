import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// @ts-ignore
import Resend from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, speaking_challenge, selectedSlot, userId } = body

    console.log('Booking request:', { name, email, selectedSlot })

    // Book via Cal.com API
    const calResponse = await fetch('https://api.cal.com/v1/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CAL_COM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventTypeId: parseInt(process.env.CAL_COM_EVENT_TYPE_ID!),
        start: selectedSlot.time,
        responses: {
          name: name,
          email: email,
          notes: speaking_challenge
        },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en',
        metadata: {
          source: 'locuta_founder_call'
        }
      })
    })

    if (!calResponse.ok) {
      const error = await calResponse.json()
      console.error('Cal.com booking error:', error)
      throw new Error(`Cal.com API error: ${JSON.stringify(error)}`)
    }

    const booking = await calResponse.json()
    console.log('Booking successful:', booking)
    
    // Save to Supabase
    const supabase = await createClient()
    
    await supabase
      .from('founder_call_bookings')
      .insert({
        user_id: userId,
        name: name,
        email: email,
        speaking_challenge: speaking_challenge,
        preferred_time: selectedSlot.time,
        cal_com_event_id: booking.id?.toString(),
        status: 'confirmed'
      })

    // Update slots used
    const { data: settings } = await supabase
      .from('founder_call_settings')
      .select('slots_used')
      .eq('id', 1)
      .single()

    if (settings) {
      await supabase
        .from('founder_call_settings')
        .update({ slots_used: (settings.slots_used || 0) + 1 })
        .eq('id', 1)
    }

    // Format meeting time
    const meetingTime = new Date(selectedSlot.time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    const meetingUrl = `https://cal.com/${process.env.CAL_COM_USERNAME}/founder-feedback?rescheduleUid=${booking.uid}`

    // Send emails
    try {
      await Promise.all([
        // Email to founder
        resend.emails.send({
          from: 'Locuta <onboarding@resend.dev>',
          to: process.env.FOUNDER_EMAIL!,
          subject: `🎯 New Founder Call: ${name} - ${meetingTime}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">🎉 New Founder Call Booked!</h2>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Meeting Time:</strong><br/>${meetingTime}</p>
                <p><strong>👤 Name:</strong> ${name}</p>
                <p><strong>📧 Email:</strong> ${email}</p>
                <p><strong>💬 Speaking Challenge:</strong><br/>${speaking_challenge}</p>
              </div>

              <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>🔗 Meeting Link:</strong></p>
                <p style="margin: 8px 0 0 0;"><a href="${meetingUrl}" style="color: #2563eb;">${meetingUrl}</a></p>
              </div>

              <p>Check your Cal.com calendar for the full event details.</p>
            </div>
          `
        }),

        // Email to user
        resend.emails.send({
          from: 'Locuta <onboarding@resend.dev>',
          to: email,
          subject: '🎉 Your Free 1-Year Access Call is Confirmed!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">You're All Set, ${name}! 🎉</h2>
              
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>✅ Your call is confirmed:</strong></p>
                <p style="margin: 0; font-size: 18px; color: #059669;">${meetingTime}</p>
              </div>

              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>🔗 Join Meeting:</strong></p>
                <a href="${meetingUrl}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Event Details
                </a>
              </div>

              <p style="margin-top: 30px;">
                Looking forward to speaking with you!<br/>
                <strong>Locuta Team</strong>
              </p>
            </div>
          `
        })
      ])

      console.log('✅ Emails sent successfully')
    } catch (emailError) {
      console.error('⚠️ Email error (non-blocking):', emailError)
    }

    return NextResponse.json({ 
      success: true,
      booking: booking,
      meetingUrl: meetingUrl
    })

  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ 
      error: 'Failed to book call',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}