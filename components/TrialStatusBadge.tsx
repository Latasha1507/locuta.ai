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
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.is_admin === true) {
          setIsAdmin(true)
          return
        }
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('trial_started_at, trial_ends_at, daily_sessions_used, last_session_date, plan_type')
          .eq('id', userId)
          .single()

        console.log('🎁 Trial Badge Debug:', { profile, error })

        if (profile) {
          // Check if user is on trial
          if (profile.plan_type === 'trial' && profile.trial_ends_at) {
            const now = new Date()
            const trialEnd = new Date(profile.trial_ends_at)
            const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            const isActive = trialEnd > now
            
            // Check if sessions are from today
            const today = new Date().toISOString().split('T')[0]
            const lastSessionDate = profile.last_session_date
            const sessionsUsed = lastSessionDate === today ? (profile.daily_sessions_used || 0) : 0

            console.log('🎁 Trial Data:', { sessionsUsed, daysLeft, isActive })

            setTrialData({
              sessionsUsed,
              daysLeft,
              isActive
            })
          }
        }
      } catch (err) {
        console.error('❌ Error fetching trial status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrialStatus()
  }, [userId])

  if (isAdmin) return null

  if (loading) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-md px-4 py-3 border border-purple-200 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!trialData || !trialData.isActive) {
    console.log('🎁 Badge hidden - not active or no data')
    return null
  }

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