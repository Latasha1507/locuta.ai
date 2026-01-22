import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

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

    console.log('✅ OAuth callback successful, user:', data.user?.id)
    
    // ⭐ Initialize trial for new users
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
        
        console.log('✅ Trial initialized for user:', user.id)
      }
    }

    // Redirect to dashboard after successful auth
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('❌ Unexpected error in callback:', err)
    return NextResponse.redirect(
      new URL('/auth/login?error=An unexpected error occurred. Please try again.', request.url)
    )
  }
}