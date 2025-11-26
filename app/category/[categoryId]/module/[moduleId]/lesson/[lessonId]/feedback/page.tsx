'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Volume2, Loader2, RefreshCw } from 'lucide-react'

interface SessionData {
  id: string
  user_transcript: string
  ai_example_text: string
  ai_example_audio: string
  feedback: any
  overall_score: number
  tone: string
  category: string
  module_number: number
  level_number: number
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
  
  // AI Example states
  const [aiExampleLoading, setAiExampleLoading] = useState(false)
  const [aiExampleError, setAiExampleError] = useState<string | null>(null)
  const [aiExampleText, setAiExampleText] = useState<string>('')
  const [aiExampleAudio, setAiExampleAudio] = useState<string>('')

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError || !data) {
        setError('Failed to load feedback')
        setLoading(false)
        return
      }

      setSession(data)
      setAiExampleText(data.ai_example_text || '')
      setAiExampleAudio(data.ai_example_audio || '')
      setLoading(false)
      
      // If AI example is missing, generate it
      if (!data.ai_example_text || !data.ai_example_audio) {
        generateAIExample(data)
      }
    }

    fetchSession()
  }, [sessionId])

  // Generate AI example
  const generateAIExample = async (sessionData?: SessionData) => {
    const sess = sessionData || session
    if (!sess) return
    
    setAiExampleLoading(true)
    setAiExampleError(null)
    
    try {
      const response = await fetch('/api/generate-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sess.id,
          prompt: sess.feedback?.task_completion_analysis?.explanation || 'Practice speaking',
          level: sess.level_number,
          tone: sess.tone
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate example')
      }

      const data = await response.json()
      
      if (data.text) setAiExampleText(data.text)
      if (data.audio) setAiExampleAudio(data.audio)
      
    } catch (err) {
      console.error('AI Example generation failed:', err)
      setAiExampleError('Failed to generate example. Click to retry.')
    } finally {
      setAiExampleLoading(false)
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your feedback...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session not found'}</p>
          <Link 
            href={`/category/${categoryId}/modules`}
            className="text-purple-600 hover:underline"
          >
            Back to Lessons
          </Link>
        </div>
      </div>
    )
  }

  const feedback = session.feedback
  const overallScore = session.overall_score || feedback?.overall_score || 0
  const passed = feedback?.pass_level || overallScore >= 80

  // Extract scores
  const taskScore = feedback?.task_completion_score || 0
  const deliveryScore = feedback?.delivery_score || 0
  const linguisticScore = feedback?.linguistic_score || 0
  
  // Focus area scores
  const focusScores = feedback?.focus_area_scores || {}
  const focusAreas = Object.entries(focusScores)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link 
            href={`/category/${categoryId}/modules`}
            className="text-slate-600 hover:text-purple-600 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Your Feedback</h1>
              <p className="text-xs text-slate-500">Lesson {lessonId} • {session.tone} Tone</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Score */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white text-center">
          <div className="text-6xl sm:text-7xl font-bold mb-2">{overallScore}</div>
          <div className="text-lg font-medium opacity-90">Overall Score</div>
          <div className="text-sm opacity-75 mt-1">
            {passed ? '🎉 Great job!' : 'Keep practicing!'}
          </div>
        </div>

        {/* Focus Area Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="font-bold text-slate-900 mb-4">Focus Area Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            {focusAreas.length > 0 ? (
              focusAreas.map(([area, score]) => (
                <div key={area} className={`rounded-xl p-4 border ${getScoreBg(score as number)}`}>
                  <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(score as number)}`}>
                    {score as number}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">{area}</div>
                </div>
              ))
            ) : (
              <>
                <div className={`rounded-xl p-4 border ${getScoreBg(taskScore)}`}>
                  <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(taskScore)}`}>{taskScore}</div>
                  <div className="text-sm text-slate-600 mt-1">Task</div>
                </div>
                <div className={`rounded-xl p-4 border ${getScoreBg(deliveryScore)}`}>
                  <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(deliveryScore)}`}>{deliveryScore}</div>
                  <div className="text-sm text-slate-600 mt-1">Delivery</div>
                </div>
                <div className={`rounded-xl p-4 border ${getScoreBg(linguisticScore)}`}>
                  <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(linguisticScore)}`}>{linguisticScore}</div>
                  <div className="text-sm text-slate-600 mt-1">Language</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="font-bold text-slate-900 mb-4">Detailed Feedback</h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 leading-relaxed mb-4">
              {feedback?.detailed_feedback || 'Great effort! Keep practicing to improve your speaking skills.'}
            </p>
            
            {/* Task Analysis */}
            {feedback?.task_completion_analysis?.specific_observations && (
              <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2 text-sm">Task Completion</h3>
                <p className="text-purple-700 text-sm leading-relaxed">
                  {feedback.task_completion_analysis.specific_observations}
                </p>
              </div>
            )}
            
            {/* Linguistic Details */}
            {feedback?.linguistic_analysis?.vocabulary?.observations && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2 text-sm">Vocabulary & Language</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  {feedback.linguistic_analysis.vocabulary.observations}
                </p>
              </div>
            )}
            
            {/* Pace Analysis */}
            {feedback?.pace_analysis && (
              <div className="bg-indigo-50 rounded-lg p-4 mb-4 border border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-2 text-sm">Speaking Pace</h3>
                <p className="text-indigo-700 text-sm">
                  <span className="font-medium">{feedback.pace_analysis.words_per_minute} WPM</span> • {feedback.pace_analysis.assessment}
                </p>
              </div>
            )}
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {/* Strengths */}
            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💪</span>
                <h3 className="font-semibold text-green-800">What You Did Well</h3>
              </div>
              <ul className="space-y-2.5">
                {(feedback?.strengths || ['Good effort']).map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-green-700 text-sm leading-relaxed">
                    <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Areas to Improve */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h3 className="font-semibold text-blue-800">How to Improve</h3>
              </div>
              <ul className="space-y-2.5">
                {(feedback?.improvements || ['Keep practicing']).map((improvement: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-blue-700 text-sm leading-relaxed">
                    <span className="text-blue-500 font-bold mt-0.5 flex-shrink-0">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* What You Said */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="font-bold text-slate-900 mb-4">What You Said</h2>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-slate-700 italic">"{session.user_transcript}"</p>
          </div>
          
          {/* Filler Analysis */}
          {feedback?.filler_analysis && feedback.filler_analysis.filler_words_count > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">Filler Word Analysis</h3>
              <p className="text-sm text-yellow-700 mb-2">
                {feedback.filler_analysis.analysis}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {feedback.filler_analysis.filler_words_detected?.map((word: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                    {word}
                  </span>
                ))}
              </div>
              {feedback.filler_analysis.penalty_applied > 0 && (
                <p className="text-xs text-yellow-600 mt-2">
                  Score penalty: -{feedback.filler_analysis.penalty_applied} points
                </p>
              )}
            </div>
          )}
          
          {/* Perfect - No Fillers! */}
          {feedback?.filler_analysis && feedback.filler_analysis.filler_words_count === 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">
                ✨ Excellent! No filler words detected in your response.
              </p>
            </div>
          )}
        </div>

        {/* AI Example - How I Would Have Done It */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl overflow-hidden">
          <div className="p-6 text-white">
            <h2 className="font-bold text-xl mb-1">How I Would Have Done It</h2>
            <p className="text-purple-100 text-sm">Listen to an example response</p>
          </div>
          
          <div className="bg-white p-6">
            {/* Loading State */}
            {aiExampleLoading && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-slate-600">Generating example response...</p>
                <p className="text-slate-400 text-sm mt-1">This may take a few seconds</p>
              </div>
            )}
            
            {/* Error State */}
            {aiExampleError && !aiExampleLoading && (
              <div className="text-center py-8">
                <p className="text-red-600 mb-3">{aiExampleError}</p>
                <button
                  onClick={() => generateAIExample()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            )}
            
            {/* Audio Player */}
            {!aiExampleLoading && !aiExampleError && aiExampleAudio && (
              <>
                <audio 
                  controls 
                  className="w-full mb-4"
                  src={`data:audio/mpeg;base64,${aiExampleAudio}`}
                >
                  Your browser does not support the audio element.
                </audio>
                
                {/* Transcript */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-2">Transcript:</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {aiExampleText || 'Transcript not available'}
                  </p>
                </div>
              </>
            )}
            
            {/* Not yet loaded - show generate button */}
            {!aiExampleLoading && !aiExampleError && !aiExampleAudio && (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-3">Example not yet generated</p>
                <button
                  onClick={() => generateAIExample()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  Generate Example
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 pb-8">
          <Link
            href={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice?tone=${session.tone}`}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold text-center hover:bg-purple-700 transition-colors"
          >
            Practice Again
          </Link>
          <Link
            href={`/category/${categoryId}/modules?tone=${session.tone}`}
            className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-semibold text-center hover:border-purple-400 transition-colors"
          >
            ← Back to Lessons
          </Link>
        </div>
      </div>
    </div>
  )
}