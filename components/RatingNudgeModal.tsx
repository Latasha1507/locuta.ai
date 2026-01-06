'use client'

import { useState } from 'react'
import Mixpanel from '@/lib/mixpanel'

interface RatingNudgeModalProps {
  score: number
  lessonId: string
  category: string
  isFirstClear: boolean
  onClose: () => void
}

const RATING_TAGS = {
  helpful_feedback: 'Helpful feedback',
  saw_improvement: 'Saw improvement',
  ai_personalized: 'AI felt personalized',
  easy_understand: 'Easy to understand',
  not_helpful: 'Not helpful enough',
  too_basic: 'Too basic',
  technical_issues: 'Technical issues',
}

export default function RatingNudgeModal({
  score,
  lessonId,
  category,
  isFirstClear,
  onClose,
}: RatingNudgeModalProps) {
  const [rating, setRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    // Track to Mixpanel
    Mixpanel.track('rating_submitted', {
      rating,
      score,
      lesson_id: lessonId,
      category,
      is_first_clear: isFirstClear,
      tags: selectedTags,
      trigger_type: score >= 85 ? 'high_score' : 'first_clear',
    })

    setSubmitted(true)

    setTimeout(() => {
      onClose()
    }, 2000)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">🙏</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Thank You!
          </h2>
          <p className="text-slate-600">
            Your feedback helps us improve Locuta for everyone.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {score >= 85 ? `Amazing! You scored ${score}!` : 'Great Progress!'}
          </h2>
          <p className="text-slate-600">
            How satisfied are you with your progress today?
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <svg
                className={`w-12 h-12 ${
                  star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Quick Tags */}
        {rating > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-3 text-center">
              What made it {rating >= 4 ? 'great' : 'challenging'}?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(RATING_TAGS)
                .filter(([key]) => {
                  // Show positive tags for high ratings, negative for low
                  const positiveKeys = ['helpful_feedback', 'saw_improvement', 'ai_personalized', 'easy_understand']
                  return rating >= 4 ? positiveKeys.includes(key) : !positiveKeys.includes(key)
                })
                .map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleTagToggle(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedTags.includes(key)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Rating
        </button>
      </div>
    </div>
  )
}