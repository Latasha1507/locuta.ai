import { createClient } from '@/lib/supabase/client'

export interface SessionLimitCheck {
  allowed: boolean
  reason?: 'trial_expired' | 'daily_limit' | 'ok'
  daysRemaining: number
  sessionsRemainingToday: number
  planType: string
}

export async function checkSessionLimit(userId: string): Promise<SessionLimitCheck> {
  const supabase = createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type, trial_started_at, last_session_date, daily_sessions_used')
    .eq('id', userId)
    .single()
  
  if (!profile) {
    return {
      allowed: false,
      reason: 'trial_expired',
      daysRemaining: 0,
      sessionsRemainingToday: 0,
      planType: 'unknown'
    }
  }
  
  // Paid users have unlimited access
  if (profile.plan_type === 'monthly' || profile.plan_type === 'yearly') {
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: 999,
      sessionsRemainingToday: 999,
      planType: profile.plan_type
    }
  }
  
  // Calculate days since trial started
  const trialStarted = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date()
  const daysSinceStart = Math.floor((Date.now() - trialStarted.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 14 - daysSinceStart)
  
  // Check if trial expired (14 days)
  if (daysSinceStart >= 14) {
    return {
      allowed: false,
      reason: 'trial_expired',
      daysRemaining: 0,
      sessionsRemainingToday: 0,
      planType: profile.plan_type
    }
  }
  
  // Check daily session limit (10 per day)
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  const lastSessionDate = profile.last_session_date
  
  let dailySessionsUsed = 0
  
  if (lastSessionDate === today) {
    // Same day, check count
    dailySessionsUsed = profile.daily_sessions_used || 0
  }
  // If different day, dailySessionsUsed stays 0 (resets automatically)
  
  const sessionsRemainingToday = Math.max(0, 10 - dailySessionsUsed)
  
  if (dailySessionsUsed >= 10) {
    return {
      allowed: false,
      reason: 'daily_limit',
      daysRemaining,
      sessionsRemainingToday: 0,
      planType: profile.plan_type
    }
  }
  
  return {
    allowed: true,
    reason: 'ok',
    daysRemaining,
    sessionsRemainingToday,
    planType: profile.plan_type
  }
}