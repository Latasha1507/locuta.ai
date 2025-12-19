'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OnboardingFormProps {
  userId: string
  onComplete: () => void
}

const SPEAKING_GOALS = [
  { id: 'public-speaking', label: 'Public Speaking', icon: '🎤' },
  { id: 'storytelling', label: 'Storytelling', icon: '📖' },
  { id: 'creator-speaking', label: 'Creator Speaking', icon: '🎥' },
  { id: 'casual-conversation', label: 'Casual Conversation', icon: '💬' },
  { id: 'workplace-communication', label: 'Workplace Communication', icon: '💼' },
  { id: 'pitch-anything', label: 'Pitch Anything', icon: '💰' }
]

const AGE_RANGES = [
  '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
]

const GENDERS = [
  'Male', 'Female', 'Non-binary', 'Prefer not to say'
]

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner - Just starting out' },
  { value: 'intermediate', label: 'Intermediate - Have some experience' },
  { value: 'advanced', label: 'Advanced - Looking to refine skills' }
]

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    age_range: '',
    country: '',
    gender: '',
    primary_goal: '',
    current_proficiency: '',
    use_case: ''
  })

  const supabase = createClient()

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Update profile with onboarding data
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
            use_case: formData.use_case
          }
        })
        .eq('id', userId)
      
      if (error) throw error
      
      // Track in Mixpanel if you want
      console.log('✅ Onboarding completed:', formData)
      
      onComplete()
    } catch (error) {
      console.error('Error saving onboarding:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch(step) {
      case 1: return formData.full_name.trim().length > 0
      case 2: return formData.age_range && formData.gender
      case 3: return formData.primary_goal
      case 4: return formData.current_proficiency && formData.use_case.trim().length > 10
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Step {step} of 4</span>
            <span className="text-sm font-medium text-purple-600">{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Locuta!</h2>
                <p className="text-slate-600">Let's personalize your experience</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Demographics */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Tell us about yourself</h2>
                <p className="text-slate-600">This helps us personalize your lessons</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Age Range</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AGE_RANGES.map((age) => (
                    <button
                      key={age}
                      onClick={() => setFormData({ ...formData, age_range: age })}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        formData.age_range === age
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      onClick={() => setFormData({ ...formData, gender })}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        formData.gender === gender
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Primary Goal */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">What's your primary goal?</h2>
                <p className="text-slate-600">Choose the skill you want to improve most</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SPEAKING_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setFormData({ ...formData, primary_goal: goal.id })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.primary_goal === goal.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{goal.icon}</span>
                      <span className="font-semibold text-slate-900">{goal.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Proficiency & Use Case */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Almost there!</h2>
                <p className="text-slate-600">Just a couple more questions</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Current Speaking Level
                </label>
                <div className="space-y-3">
                  {PROFICIENCY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setFormData({ ...formData, current_proficiency: level.value })}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        formData.current_proficiency === level.value
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className="font-semibold text-slate-900">{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What will you use Locuta for? <span className="text-slate-400">(Optional but helpful)</span>
                </label>
                <textarea
                  value={formData.use_case}
                  onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                  placeholder="E.g., Job interviews, presentations at work, YouTube videos, etc."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 10 characters</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all"
              >
                Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Complete Setup 🎉'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}