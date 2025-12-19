import { createClient } from '@/lib/supabase/client'

export interface SessionLimitCheck {
  allowed: boolean
  reason?: 'trial_expired' | 'session_limit' | 'ok'
  daysRemaining: number
  sessionsRemaining: number
  planType: string
}

export async function checkSessionLimit(userId: string): Promise<SessionLimitCheck> {
  const supabase = createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_sessions_used, plan_type, trial_started_at')
    .eq('id', userId)
    .single()
  
  if (!profile) {
    return {
      allowed: false,
      reason: 'trial_expired',
      daysRemaining: 0,
      sessionsRemaining: 0,
      planType: 'unknown'
    }
  }
  
  // Paid users have unlimited access
  if (profile.plan_type === 'monthly' || profile.plan_type === 'yearly') {
    return {
      allowed: true,
      reason: 'ok',
      daysRemaining: 999,
      sessionsRemaining: 999,
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
      sessionsRemaining: 0,
      planType: profile.plan_type
    }
  }
  
  // Check session limit (10 sessions)
  const sessionsUsed = profile.trial_sessions_used || 0
  const sessionsRemaining = Math.max(0, 10 - sessionsUsed)
  
  if (sessionsUsed >= 10) {
    return {
      allowed: false,
      reason: 'session_limit',
      daysRemaining,
      sessionsRemaining: 0,
      planType: profile.plan_type
    }
  }
  
  return {
    allowed: true,
    reason: 'ok',
    daysRemaining,
    sessionsRemaining,
    planType: profile.plan_type
  }
}