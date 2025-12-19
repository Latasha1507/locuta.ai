'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OnboardingFormProps {
  userId: string
  onComplete: () => void
}

const SPEAKING_GOALS = [
  { id: 'public-speaking', label: 'Public Speaking' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'creator-speaking', label: 'Creator Speaking' },
  { id: 'casual-conversation', label: 'Casual Conversation' },
  { id: 'workplace-communication', label: 'Workplace Communication' },
  { id: 'pitch-anything', label: 'Pitch Anything' }
]

const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner - Just starting out' },
  { value: 'intermediate', label: 'Intermediate - Have some experience' },
  { value: 'advanced', label: 'Advanced - Looking to refine skills' }
]

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    age_range: '',
    gender: '',
    primary_goal: '',
    current_proficiency: '',
    use_case: ''
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.full_name.trim()) {
      alert('Please enter your name')
      return
    }
    if (!formData.age_range) {
      alert('Please select your age range')
      return
    }
    if (!formData.gender) {
      alert('Please select your gender')
      return
    }
    if (!formData.primary_goal) {
      alert('Please select your primary goal')
      return
    }
    if (!formData.current_proficiency) {
      alert('Please select your proficiency level')
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          onboarding_completed: true,
          onboarding_data: {
            age_range: formData.age_range,
            gender: formData.gender,
            primary_goal: formData.primary_goal,
            current_proficiency: formData.current_proficiency,
            use_case: formData.use_case || 'Not specified'
          }
        })
        .eq('id', userId)
      
      if (error) throw error
      
      console.log('✅ Onboarding completed')
      onComplete()
    } catch (error) {
      console.error('Error saving onboarding:', error)
      alert('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Locuta!</h2>
            <p className="text-slate-600">Let's personalize your experience (takes 1 minute)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                required
              />
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Age Range *
              </label>
              <select
                value={formData.age_range}
                onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                required
              >
                <option value="">Select your age range</option>
                {AGE_RANGES.map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                required
              >
                <option value="">Select gender</option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            {/* Primary Goal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                What skill do you want to improve most? *
              </label>
              <select
                value={formData.primary_goal}
                onChange={(e) => setFormData({ ...formData, primary_goal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                required
              >
                <option value="">Select your primary goal</option>
                {SPEAKING_GOALS.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Proficiency Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Current Speaking Level *
              </label>
              <select
                value={formData.current_proficiency}
                onChange={(e) => setFormData({ ...formData, current_proficiency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                required
              >
                <option value="">Select your level</option>
                {PROFICIENCY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Use Case (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                What will you use Locuta for? <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.use_case}
                onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                placeholder="E.g., Job interviews, YouTube videos, presentations"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Saving...' : 'Complete Setup 🎉'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            * Required fields
          </p>
        </div>
      </div>
    </div>
  )
}