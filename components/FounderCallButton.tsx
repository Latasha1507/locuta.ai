'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import FounderCallModal from '@/components/FounderCallModal'

export default function FounderCallButton() {
  const [showModal, setShowModal] = useState(false)
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null)
  const [hasBooked, setHasBooked] = useState(false)

  useEffect(() => {
    const loadSlots = async () => {
      const supabase = createClient()
      
      // Get total slots remaining
      const { data: settings } = await supabase
        .from('founder_call_settings')
        .select('total_slots, slots_used')
        .eq('id', 1)
        .single()
      
      if (settings) {
        setSlotsRemaining(settings.total_slots - settings.slots_used)
      }
      
      // Check if current user already booked
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: booking } = await supabase
          .from('founder_call_bookings')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        setHasBooked(!!booking)
      }
    }
    
    loadSlots()
  }, [])

  // Don't show if no slots or user already booked
  if (slotsRemaining === null || slotsRemaining <= 0 || hasBooked) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-3 animate-pulse-slow group"
      >
        <span className="text-2xl">🎁</span>
        <div className="text-left hidden sm:block">
          <div className="font-bold text-sm">Get 1 Year FREE!</div>
          <div className="text-xs opacity-90">Only {slotsRemaining} spots left</div>
        </div>
        
        {/* Mobile: Just show icon + number */}
        <div className="sm:hidden flex items-center gap-2">
          <span className="font-bold">{slotsRemaining} left</span>
        </div>
        
        {/* Pulsing ring animation */}
        <div className="absolute inset-0 rounded-full bg-purple-400 opacity-20 animate-ping"></div>
      </button>

      {showModal && (
        <FounderCallModal
          slotsRemaining={slotsRemaining}
          onClose={() => setShowModal(false)}
          onBooked={() => {
            setHasBooked(true)
            setSlotsRemaining(prev => (prev ? prev - 1 : 0))
          }}
        />
      )}
    </>
  )
}