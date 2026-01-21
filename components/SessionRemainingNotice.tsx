'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SessionRemainingNoticeProps {
  userId: string
}

export default function SessionRemainingNotice({ userId }: SessionRemainingNoticeProps) {
  const [sessionsRemaining, setSessionsRemaining] = useState<number | null>(null)
  const [planType, setPlanType] = useState<string>('trial')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadSessionInfo = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.is_admin === true) {
        setIsAdmin(true)
        return
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_sessions_used, plan_type')
        .eq('id', userId)
        .single()
      
      if (!profile) return
      
      setPlanType(profile.plan_type)
      
      // Only show for trial users
      if (profile.plan_type === 'trial') {
        const sessionsUsed = profile.trial_sessions_used || 0
        const remaining = Math.max(0, 10 - sessionsUsed)
        setSessionsRemaining(remaining)
      }
    }
    
    loadSessionInfo()
  }, [userId])

  // Don't show for admins (admins should not see trial nags while testing)
  if (isAdmin) return null

  // Don't show for paid users
  if (planType !== 'trial') return null
  
  // Don't show if still loading
  if (sessionsRemaining === null) return null

  const isLow = sessionsRemaining <= 3

  return (
    <div className={`rounded-xl p-4 mt-6 ${
      isLow 
        ? 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isLow ? '⚠️' : '✨'}</span>
          <div>
            <p className="font-bold text-slate-900">
              {sessionsRemaining === 0 ? (
                'Trial Complete!'
              ) : sessionsRemaining === 1 ? (
                'Last Free Session Used!'
              ) : (
                `${sessionsRemaining} Free Sessions Remaining`
              )}
            </p>
            <p className="text-sm text-slate-600">
              {sessionsRemaining === 0 ? (
                'Upgrade to continue practicing'
              ) : (
                'Upgrade anytime for unlimited access'
              )}
            </p>
          </div>
        </div>
        {sessionsRemaining <= 2 && (
          <Link
            href="/pricing"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:shadow-lg transition-all whitespace-nowrap"
          >
            Upgrade Now
          </Link>
        )}
      </div>
    </div>
  )
}