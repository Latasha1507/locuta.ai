import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, speaking_challenge, preferred_time } = body

    // For now, just log it (you can add email service later)
    console.log('🎯 NEW FOUNDER CALL BOOKING:')
    console.log('Name:', name)
    console.log('Email:', email)
    console.log('Challenge:', speaking_challenge)
    console.log('Preferred Time:', preferred_time)
    console.log('---')

    // TODO: Send email notification
    // You can use Resend, SendGrid, or just log to Supabase for now

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}