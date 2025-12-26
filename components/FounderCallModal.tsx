'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FounderCallModalProps {
  slotsRemaining: number
  onClose: () => void
  onBooked: () => void
}

interface TimeSlot {
  time: string
  date: string
  displayTime: string
}

export default function FounderCallModal({ slotsRemaining, onClose, onBooked }: FounderCallModalProps) {
  const [step, setStep] = useState<'form' | 'slots' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [userId, setUserId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    speaking_challenge: ''
  })

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Pre-fill email if available
        if (user.email) {
          setFormData(prev => ({ ...prev, email: user.email! }))
        }
      }
    }
    loadUser()
  }, [])

  const handleNext = async () => {
    if (!formData.name || !formData.email || !formData.speaking_challenge) {
      alert('Please fill all fields')
      return
    }

    setLoadingSlots(true)
    
    try {
      // Fetch available slots
      const response = await fetch('/api/cal-slots')
      const data = await response.json()
      
      // Transform slots into user-friendly format
      const slots: TimeSlot[] = []
      
      Object.entries(data.slots || {}).forEach(([date, times]: [string, any]) => {
        times.forEach((time: string) => {
          const dateTime = new Date(time)
          slots.push({
            time: time,
            date: date,
            displayTime: dateTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          })
        })
      })
      
      setAvailableSlots(slots.slice(0, 20)) // Show first 20 slots
      setStep('slots')
    } catch (error) {
      console.error('Failed to load slots:', error)
      alert('Failed to load available times. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot) {
      alert('Please select a time slot')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/cal-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          speaking_challenge: formData.speaking_challenge,
          selectedSlot: selectedSlot,
          userId: userId
        })
      })

      if (!response.ok) {
        throw new Error('Booking failed')
      }

      const data = await response.json()
      
      setStep('success')
      onBooked()
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        onClose()
      }, 5000)

    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to book call. Please try again.')
      setLoading(false)
    }
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            You're All Set!
          </h2>
          <p className="text-slate-600 mb-2">
            Check your email for:
          </p>
          <ul className="text-left text-slate-600 mb-6 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Google Meet link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Calendar invite</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Meeting details</span>
            </li>
          </ul>
          <p className="text-sm text-purple-600 font-semibold">
            Looking forward to speaking with you!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎁</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Get 1 Year FREE Access!
          </h2>
          <p className="text-slate-600">
            30-min 1:1 feedback call with founder
          </p>
          <div className="mt-3 inline-block bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold text-sm">
            ⚡ Only {slotsRemaining} spots left!
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            step === 'form' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className="w-12 h-1 bg-gray-200"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            step === 'slots' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
        </div>

        {/* STEP 1: Form */}
        {step === 'form' && (
          <>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>This is purely for feedback.</strong> Share your experience and get 1 year free unlimited access!
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What speaking challenge are you facing? *
                </label>
                <textarea
                  required
                  value={formData.speaking_challenge}
                  onChange={(e) => setFormData({ ...formData, speaking_challenge: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition resize-none"
                  placeholder="E.g., I struggle with filler words during presentations..."
                />
              </div>

              <button
                type="submit"
                disabled={loadingSlots}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loadingSlots ? 'Loading Slots...' : 'Next: Pick Your Time →'}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: Slots */}
        {step === 'slots' && (
          <>
            <button
              onClick={() => setStep('form')}
              className="mb-4 text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1"
            >
              ← Back
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Pick Your Time Slot
            </h3>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {availableSlots.length === 0 ? (
                <p className="text-slate-600 text-center py-8">
                  No slots available. Please contact us directly.
                </p>
              ) : (
                availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full p-4 rounded-xl border-2 transition text-left ${
                      selectedSlot?.time === slot.time
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <span className="font-semibold">{slot.displayTime}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={handleBooking}
              disabled={!selectedSlot || loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Booking...' : 'Confirm Booking 🎉'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}