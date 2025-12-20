'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TrialStatusBadgeProps {
  userId: string
}

export default function TrialStatusBadge({ userId }: TrialStatusBadgeProps) {
  const [trialInfo, setTrialInfo] = useState<{
    planType: string
    daysRemaining: number
    sessionsRemaining: number
  } | null>(null)

  useEffect(() => {
    const loadTrialInfo = async () => {
      const supabase = createClient()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, trial_started_at, last_session_date, daily_sessions_used')
        .eq('id', userId)
        .single()
      
      if (!profile) return
      
      // Don't show badge for paid users
      if (profile.plan_type === 'monthly' || profile.plan_type === 'yearly') {
        return
      }
      
      // Calculate days remaining
      const trialStarted = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date()
      const daysSinceStart = Math.floor((Date.now() - trialStarted.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, 14 - daysSinceStart)
      
      // Calculate daily sessions remaining
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const lastSessionDate = profile.last_session_date
      
      let dailySessionsUsed = 0
      if (lastSessionDate === today) {
        // Same day, use the count
        dailySessionsUsed = profile.daily_sessions_used || 0
      }
      // If different day or no last session, dailySessionsUsed = 0 (fresh day)
      
      const sessionsRemaining = Math.max(0, 10 - dailySessionsUsed)
      
      setTrialInfo({
        planType: profile.plan_type,
        daysRemaining,
        sessionsRemaining
      })
    }
    
    loadTrialInfo()
  }, [userId])

  if (!trialInfo) return null

  const isLowOnSessions = trialInfo.sessionsRemaining <= 3
  const isLowOnTime = trialInfo.daysRemaining <= 3

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🎁</div>
        <div>
          <div className="font-bold text-slate-900 text-sm">Free Trial Active</div>
          <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
            <span className={`font-semibold ${isLowOnSessions ? 'text-orange-600' : ''}`}>
              {trialInfo.sessionsRemaining}/10 today
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-semibold ${isLowOnTime ? 'text-orange-600' : ''}`}>
              {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? 's' : ''} left
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}