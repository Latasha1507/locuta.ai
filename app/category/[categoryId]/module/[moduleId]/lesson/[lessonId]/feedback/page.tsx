'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Volume2, Loader2, RefreshCw, Mic, Trophy, Star, Sparkles, CheckCircle, TrendingUp } from 'lucide-react'
import confetti from 'canvas-confetti'

interface SessionData {
  session_id: string
  user_id: string
  user_transcript: string
  ai_example_text: string
  ai_example_audio: string
  feedback: any
  overall_score: number
  tone: string
  category: string
  module_number: number
  level_number: number
  created_at: string
}

export default function FeedbackPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const categoryId = params?.categoryId as string
  const moduleId = params?.moduleId as string
  const lessonId = params?.lessonId as string
  const sessionId = searchParams?.get('session')
  
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isFirstPass, setIsFirstPass] = useState(false)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('Please sign in to view feedback')
        setLoading(false)
        router.push('/login')
        return
      }

      // Query sessions table with CORRECT field: session_id (not id)
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        setError('Failed to load feedback')
        setLoading(false)
        return
      }

      if (!data) {
        setError('Feedback not found')
        setLoading(false)
        return
      }

      setSession(data)
      setLoading(false)
      
      // Check if user passed
      const passThreshold = data.feedback?.pass_threshold || 75
      const passed = data.overall_score >= passThreshold
      
      if (passed) {
        // Check if this is their first time passing
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('completed')
          .eq('user_id', user.id)
          .eq('category', data.category)
          .eq('module_number', data.module_number)
          .eq('lesson_number', data.level_number)
          .single()
        
        const isFirst = !progressData?.completed
        setIsFirstPass(isFirst)
        setShowSuccessPopup(true)
        
        // Fire confetti if first pass!
        if (isFirst) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            })
          }, 300)
        }
      }
    } catch (err) {
      console.error('Error loading feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    return 'text-orange-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200'
    if (score >= 70) return 'bg-blue-50 border-blue-200'
    return 'bg-orange-50 border-orange-200'
  }

  const getMotivationalContent = (score: number, threshold: number, isFirst: boolean) => {
    if (score >= 90) return {
      title: "Outstanding Performance! 🏆",
      subtitle: isFirst ? "First time passing this lesson!" : "You've mastered this!",
      message: "Your speaking skills are exceptional. You're ready for more challenges!",
      color: "from-yellow-400 to-orange-500"
    }
    if (score >= 85) return {
      title: "Excellent Work! 🌟",
      subtitle: isFirst ? "Lesson completed!" : "Great improvement!",
      message: "You demonstrated strong speaking skills with clear delivery and confidence.",
      color: "from-green-400 to-emerald-500"
    }
    if (score >= threshold) return {
      title: "Well Done! ✨",
      subtitle: isFirst ? "You passed this lesson!" : "Keep up the good work!",
      message: "You successfully completed the task with good speaking fundamentals.",
      color: "from-blue-400 to-indigo-500"
    }
    return {
      title: "Keep Practicing! 💪",
      subtitle: `You need ${threshold}+ to pass`,
      message: "You're making progress! Review the feedback and try again.",
      color: "from-purple-400 to-pink-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session not found'}</p>
          <Link href={`/category/${categoryId}/modules`} className="text-purple-600 hover:underline">
            Back to Lessons
          </Link>
        </div>
      </div>
    )
  }

  const feedback = session.feedback || {}
  const score = session.overall_score
  const threshold = feedback?.pass_threshold || 75
  const passed = score >= threshold
  
  const clarity = feedback?.clarity_score || feedback?.focus_area_scores?.Clarity || 0
  const delivery = feedback?.delivery_score || feedback?.focus_area_scores?.Delivery || 0
  const confidence = feedback?.confidence_score || feedback?.focus_area_scores?.Confidence || 0
  
  const motivational = getMotivationalContent(score, threshold, isFirstPass)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Success Popup */}
      {showSuccessPopup && passed && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"></div>
            
            <div className="mb-6 relative">
              <div className={`w-28 h-28 mx-auto bg-gradient-to-br ${motivational.color} rounded-full flex items-center justify-center animate-bounce shadow-2xl`}>
                <Trophy className="w-14 h-14 text-white" />
              </div>
              
              {isFirstPass && (
                <>
                  <Star className="absolute top-0 left-1/4 w-8 h-8 text-yellow-400 animate-ping" />
                  <Sparkles className="absolute top-0 right-1/4 w-8 h-8 text-blue-400 animate-pulse" />
                </>
              )}
            </div>

            <h2 className="text-4xl font-bold text-slate-900 mb-2">
              {motivational.title}
            </h2>
            
            {isFirstPass && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">First Time Achievement!</span>
              </div>
            )}
            
            <p className="text-lg text-slate-600 mb-2">{motivational.subtitle}</p>
            <p className="text-slate-500 mb-6 leading-relaxed">{motivational.message}</p>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-6">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
                {score}
              </div>
              <p className="text-slate-600 font-medium">Your Score</p>
              <p className="text-sm text-slate-500 mt-1">Required: {threshold}+</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{clarity}</div>
                <div className="text-xs text-purple-600">Clarity</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{delivery}</div>
                <div className="text-xs text-blue-600">Delivery</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{confidence}</div>
                <div className="text-xs text-green-600">Confidence</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg"
              >
                View Detailed Feedback
              </button>
              <Link
                href={`/category/${categoryId}/modules?tone=${session.tone}`}
                className="block w-full px-6 py-4 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-semibold hover:border-purple-400 transition"
              >
                Continue Learning →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/category/${categoryId}/modules`} className="text-slate-600 hover:text-purple-600 flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-slate-900">Lesson {lessonId} Feedback</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Score Card */}
        <div className={`bg-gradient-to-br ${passed ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-600'} rounded-2xl p-8 text-white text-center shadow-xl`}>
          <div className="text-7xl font-bold mb-2">{score}</div>
          <div className="text-xl font-semibold opacity-90 mb-1">
            {passed ? '✅ Passed!' : `Need ${threshold}+ to Pass`}
          </div>
          <div className="text-sm opacity-80">
            {passed ? 'Great job! Lesson completed.' : 'Keep practicing - you\'re improving!'}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Performance Breakdown</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className={`rounded-xl p-5 border-2 ${getScoreBg(clarity)}`}>
              <div className={`text-4xl font-bold ${getScoreColor(clarity)} mb-1`}>{clarity}</div>
              <div className="text-sm font-medium text-slate-700">Clarity</div>
              <div className="text-xs text-slate-500 mt-1">Pronunciation</div>
            </div>
            <div className={`rounded-xl p-5 border-2 ${getScoreBg(delivery)}`}>
              <div className={`text-4xl font-bold ${getScoreColor(delivery)} mb-1`}>{delivery}</div>
              <div className="text-sm font-medium text-slate-700">Delivery</div>
              <div className="text-xs text-slate-500 mt-1">Flow & Pace</div>
            </div>
            <div className={`rounded-xl p-5 border-2 ${getScoreBg(confidence)}`}>
              <div className={`text-4xl font-bold ${getScoreColor(confidence)} mb-1`}>{confidence}</div>
              <div className="text-sm font-medium text-slate-700">Confidence</div>
              <div className="text-xs text-slate-500 mt-1">Energy & Voice</div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Personalized Feedback</h2>
          <p className="text-slate-700 leading-relaxed mb-6 text-lg">
            {feedback?.detailed_feedback || 'No detailed feedback available'}
          </p>
          
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-green-800 text-lg">What You Did Well</h3>
              </div>
              <ul className="space-y-3">
                {(feedback?.strengths || []).map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                    <span className="text-green-800 leading-relaxed">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-blue-800 text-lg">How to Improve</h3>
              </div>
              <ul className="space-y-3">
                {(feedback?.improvements || []).map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg flex-shrink-0">→</span>
                    <span className="text-blue-800 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* What You Said */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Your Response</h2>
          <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-200">
            <p className="text-slate-700 italic leading-relaxed text-lg">"{session.user_transcript}"</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
              <div className="text-3xl font-bold text-purple-700">{feedback?.word_count || 0}</div>
              <div className="text-sm text-purple-600 mt-1">Words</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
              <div className="text-3xl font-bold text-blue-700">{feedback?.words_per_minute || 0}</div>
              <div className="text-sm text-blue-600 mt-1">WPM</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-700">{feedback?.filler_words_count || 0}</div>
              <div className="text-sm text-yellow-600 mt-1">Fillers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <div className="text-sm text-green-700 font-medium">{feedback?.pace_assessment || 'Good'}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-3 gap-3 pb-8">
          <Link href={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice?tone=${session.tone}&skipTask=true`}
            className="px-6 py-4 bg-white text-purple-600 border-2 border-purple-300 rounded-xl font-semibold text-center hover:bg-purple-50 transition flex items-center justify-center gap-2">
            <Mic className="w-5 h-5" />
            Re-record
          </Link>
          <Link href={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice?tone=${session.tone}`}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-center hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Practice Again
          </Link>
          <Link href={`/category/${categoryId}/modules?tone=${session.tone}`}
            className="px-6 py-4 bg-white text-slate-700 border-2 border-slate-300 rounded-xl font-semibold text-center hover:bg-slate-50 transition flex items-center justify-center gap-2">
            Continue
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}