'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FounderCallModalProps {
  slotsRemaining: number
  onClose: () => void
  onBooked: () => void
}

export default function FounderCallModal({ slotsRemaining, onClose, onBooked }: FounderCallModalProps) {
  const [step, setStep] = useState<'form' | 'booking' | 'success'>('form')
  const [loading, setLoading] = useState(false)
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

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { data: existingBooking } = await supabase
        .from('founder_call_bookings')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingBooking) {
        alert('You already have a call booked!')
        setLoading(false)
        onClose()
        return
      }

      await supabase
        .from('founder_call_bookings')
        .insert({
          user_id: userId,
          name: formData.name,
          email: formData.email,
          speaking_challenge: formData.speaking_challenge,
          status: 'pending'
        })

      const { data: settings } = await supabase
        .from('founder_call_settings')
        .select('slots_used')
        .eq('id', 1)
        .single()

      if (settings) {
        await supabase
          .from('founder_call_settings')
          .update({ slots_used: (settings.slots_used || 0) + 1 })
          .eq('id', 1)
      }

      await fetch('/api/founder-call-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          speaking_challenge: formData.speaking_challenge
        })
      })

      setStep('booking')
      onBooked()
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openCalendarBooking = () => {
    const calUrl = 'https://cal.com/latasha-ukey/founder-feedback'
    window.open(calUrl, '_blank', 'noopener,noreferrer')
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            You are All Set!
          </h2>
          <p className="text-slate-600 mb-4">
            Check your email for the meeting confirmation and link.
          </p>
          <p className="text-sm text-purple-600 font-semibold mb-6">
            Looking forward to speaking with you!
          </p>
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            Got it!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

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

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            step === 'form' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className="w-12 h-1 bg-gray-200"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            step === 'booking' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
        </div>

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
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Next: Pick Your Time'}
              </button>
            </form>
          </>
        )}

        {step === 'booking' && (
          <>
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Almost Done!
              </h3>
              <p className="text-slate-600 mb-6">
                Click below to open Cal.com and pick your preferred time slot.
              </p>

              <button
                onClick={openCalendarBooking}
                className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                🗓️ Book Your Time Slot
              </button>

              <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <p className="text-sm text-slate-700 mb-4">
                  <strong>What happens next:</strong>
                </p>
                <ol className="text-left text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <span>Pick your preferred time slot on Cal.com</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <span>You will receive a confirmation email with meeting link</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">3.</span>
                    <span>After our call, get your 1 year free access!</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setStep('success')}
                className="mt-6 text-purple-600 hover:text-purple-700 font-semibold text-sm"
              >
                I have already booked
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}