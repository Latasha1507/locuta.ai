import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Where to send the user after a successful exchange. Used by the password
  // reset flow (?next=/auth/reset-password).
  //
  // SECURITY: `next` comes from the URL, so it is attacker-controllable. Only
  // accept same-origin relative paths — anything starting with "//" or a scheme
  // would let someone craft a Locuta link that redirects to their own site with
  // the user freshly authenticated (open redirect / phishing). Reject and fall
  // back to /dashboard.
  const nextParam = requestUrl.searchParams.get('next')
  const isSafeNext =
    !!nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.includes('\\')
  const destination = isSafeNext ? nextParam : '/dashboard'

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  // Handle missing code
  if (!code) {
    console.error('❌ No code parameter in callback')
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication failed. Please try again.', request.url)
    )
  }

  try {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    if (!data.session) {
      console.error('❌ No session after code exchange')
      return NextResponse.redirect(
        new URL('/auth/login?error=Authentication failed. Please try again.', request.url)
      )
    }

    console.log('✅ OAuth callback successful')

    // ⭐ Initialize trial for new users.
    // Skipped when this is a password-recovery hop — the user already has a
    // profile, and we don't want a reset to touch trial state.
    if (!isSafeNext) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if this is a new user (trial not started yet)
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_started_at, plan_type')
          .eq('id', user.id)
          .single()

        // If trial hasn't been started, initialize it
        if (profile && !profile.trial_started_at) {
          await supabase
            .from('profiles')
            .update({
              trial_started_at: new Date().toISOString(),
              trial_sessions_used: 0,
              plan_type: 'trial'
            })
            .eq('id', user.id)

          console.log('✅ Trial initialized')
        }
      }
    }

    return NextResponse.redirect(new URL(destination, request.url))
  } catch (err) {
    console.error('❌ Unexpected error in callback:', err)
    return NextResponse.redirect(
      new URL('/auth/login?error=An unexpected error occurred. Please try again.', request.url)
    )
  }
}