import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
    
    // ⭐ NEW: Initialize trial for new users
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
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', request.url))
}