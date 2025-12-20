'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FounderCallModalProps {
  slotsRemaining: number
  onClose: () => void
  onBooked: () => void
}

export default function FounderCallModal({ slotsRemaining, onClose, onBooked }: FounderCallModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    speaking_challenge: '',
    preferred_time: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Please sign in to book a call')
        setLoading(false)
        return
      }

      // Check if user already booked
      const { data: existingBooking } = await supabase
        .from('founder_call_bookings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existingBooking) {
        alert('You already have a call booked!')
        setLoading(false)
        onClose()
        return
      }

      // Save booking
      const { error: bookingError } = await supabase
        .from('founder_call_bookings')
        .insert({
          user_id: user.id,
          name: formData.name,
          email: formData.email,
          speaking_challenge: formData.speaking_challenge,
          preferred_time: formData.preferred_time,
          status: 'pending'
        })

      if (bookingError) throw bookingError

      // Increment slots used
      const { data: settings } = await supabase
        .from('founder_call_settings')
        .select('slots_used')
        .eq('id', 1)
        .single()

      if (settings) {
        await supabase
          .from('founder_call_settings')
          .update({ slots_used: settings.slots_used + 1 })
          .eq('id', 1)
      }

      // Send notification email to founder
      await fetch('/api/founder-call-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          speaking_challenge: formData.speaking_challenge,
          preferred_time: formData.preferred_time
        })
      })

      setSubmitted(true)
      onBooked()
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose()
      }, 3000)

    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to book call. Please try again.')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            You're All Set!
          </h2>
          <p className="text-slate-600 mb-4">
            Check your email for confirmation and Cal.com booking link.
          </p>
          <p className="text-sm text-purple-600 font-semibold">
            Looking forward to speaking with you!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
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

        {/* Info box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>This is purely for feedback.</strong> Share your experience, challenges, and ideas to help us improve Locuta. In return, get 1 year of free unlimited access!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Preferred Time (Optional)
            </label>
            <input
              type="text"
              value={formData.preferred_time}
              onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="E.g., Weekday evenings, Weekend mornings"
            />
            <p className="text-xs text-slate-500 mt-1">
              We'll send you a Cal.com link to pick your exact slot
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Book My Free Call 🎉'}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-4">
          No credit card required • Cancel anytime
        </p>
      </div>
    </div>
  )
}