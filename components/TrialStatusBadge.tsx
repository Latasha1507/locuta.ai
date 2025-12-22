'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TrialStatusBadgeProps {
  userId: string
}

export default function TrialStatusBadge({ userId }: TrialStatusBadgeProps) {
  const [trialData, setTrialData] = useState<{
    sessionsUsed: number
    daysLeft: number
    isActive: boolean
  } | null>(null)

  useEffect(() => {
    const fetchTrialStatus = async () => {
      const supabase = createClient()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_started_at, trial_ends_at, daily_sessions_used, last_session_date')
        .eq('id', userId)
        .single()

      if (profile && profile.trial_ends_at) {
        const now = new Date()
        const trialEnd = new Date(profile.trial_ends_at)
        const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        const isActive = trialEnd > now
        
        // Check if sessions are from today
        const today = new Date().toISOString().split('T')[0]
        const lastSessionDate = profile.last_session_date
        const sessionsUsed = lastSessionDate === today ? (profile.daily_sessions_used || 0) : 0

        setTrialData({
          sessionsUsed,
          daysLeft,
          isActive
        })
      }
    }

    fetchTrialStatus()
  }, [userId])

  if (!trialData || !trialData.isActive) return null

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl shadow-md px-4 py-3 border border-purple-200">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <span className="text-2xl">🎁</span>
      </div>
      <div>
        <div className="text-sm font-bold text-gray-900">Free Trial Active</div>
        <div className="text-xs text-gray-600">
          <span className="font-semibold">{trialData.sessionsUsed}/10 sessions</span>
          <span className="mx-1">•</span>
          <span>{trialData.daysLeft} days left</span>
        </div>
      </div>
    </div>
  )
}