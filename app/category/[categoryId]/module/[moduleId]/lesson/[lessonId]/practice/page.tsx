'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mic, Square } from 'lucide-react'

// Loader messages for LESSON INTRO
const INTRO_LOADER_MESSAGES = [
  'Personalizing your lesson...',
  'Preparing your AI coach...',
  'Crafting your introduction...',
  'Getting everything ready...',
]

// Loader messages for FEEDBACK ANALYSIS
const FEEDBACK_LOADER_MESSAGES = [
  'Transcribing your audio...',
  'Analyzing task completion...',
  'Evaluating grammar and vocabulary...',
  'Checking for filler words...',
  'Calculating your scores...',
  'Generating personalized feedback...',
  'Creating example response...',
  'Preparing your results...',
]

export default function PracticePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const categoryId = params?.categoryId as string
  const moduleId = params?.moduleId as string
  const lessonId = params?.lessonId as string
  const tone = searchParams?.get('tone') || 'Normal'

  const [step, setStep] = useState<'start' | 'intro' | 'recording'>('start')
  const [introAudio, setIntroAudio] = useState<string>('')
  const [introTranscript, setIntroTranscript] = useState<string>('')
  const [practice_prompt, setPracticePrompt] = useState<string>('')
  const [lessonTitle, setLessonTitle] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingIntro, setIsLoadingIntro] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLoaderMessage, setCurrentLoaderMessage] = useState(0)
  
  // Audio player states
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // CRITICAL: Prevent multiple simultaneous submissions
  const submissionInProgressRef = useRef(false)

  // Animated loader effect - different messages for intro vs feedback
  useEffect(() => {
    if (isLoadingIntro) {
      setCurrentLoaderMessage(0)
      loaderTimerRef.current = setInterval(() => {
        setCurrentLoaderMessage((prev) => (prev + 1) % INTRO_LOADER_MESSAGES.length)
      }, 2000)
    } else if (isSubmitting) {
      setCurrentLoaderMessage(0)
      loaderTimerRef.current = setInterval(() => {
        setCurrentLoaderMessage((prev) => (prev + 1) % FEEDBACK_LOADER_MESSAGES.length)
      }, 2000)
    } else {
      if (loaderTimerRef.current) {
        clearInterval(loaderTimerRef.current)
        loaderTimerRef.current = null
      }
    }

    return () => {
      if (loaderTimerRef.current) {
        clearInterval(loaderTimerRef.current)
      }
    }
  }, [isLoadingIntro, isSubmitting])

  // Update audio time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', () => setIsPlaying(false))

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', () => setIsPlaying(false))
    }
  }, [introAudio])

  const loadIntro = async () => {
    setError(null)
    setIsLoadingIntro(true)
    
    try {
      const response = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, categoryId, moduleId, lessonId }),
      })

      if (!response.ok) {
        throw new Error('Failed to load intro')
      }

      const data = await response.json()
      
      setIntroAudio(data.audioBase64 || '')
      setIntroTranscript(data.transcript || '')
      setPracticePrompt(data.practice_prompt || 'Practice speaking clearly and confidently')
      setLessonTitle(data.lessonTitle || 'Lesson')
      setIsLoadingIntro(false)
      setStep('intro')
    } catch (error) {
      console.error('Error loading intro:', error)
      setError('Failed to load lesson intro')
      setIsLoadingIntro(false)
    }
  }

  // Audio controls
  const playAudio = () => {
    if (audioRef.current && introAudio) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
    }
  }

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
    }
  }

  const replayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const skipToRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
    setStep('recording')
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const reRecord = () => {
    setAudioBlob(null)
    setRecordingTime(0)
  }

  // IMPROVED: Submit with multiple-click prevention
  const submitRecording = async () => {
    if (!audioBlob) {
      setError('No recording to submit')
      return
    }

    // CRITICAL: Prevent multiple simultaneous submissions
    if (submissionInProgressRef.current) {
      console.log('⚠️ Submission already in progress, ignoring click')
      return
    }

    // Mark submission as in progress
    submissionInProgressRef.current = true
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('tone', tone)
      formData.append('categoryId', categoryId)
      formData.append('moduleId', moduleId)
      formData.append('lessonId', lessonId)

      console.log('Submitting recording with params:', {
        tone,
        categoryId,
        moduleId,
        lessonId,
        audioSize: audioBlob.size
      })

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      console.log('Feedback API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to submit (${response.status})`)
      }

      const data = await response.json()
      console.log('Feedback response:', data)

      // Navigate to feedback page
      router.push(`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/feedback?session=${data.sessionId}`)
    } catch (error) {
      console.error('Error submitting:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit recording')
      
      // Reset submission state on error so user can retry
      setIsSubmitting(false)
      submissionInProgressRef.current = false
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href={`/category/${categoryId}/modules?tone=${tone}`} className="text-slate-700 hover:text-indigo-600 font-medium">
            ← Back to Lessons
          </Link>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* START SCREEN */}
        {step === 'start' && !isLoadingIntro && (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-2xl p-12 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/30 mx-auto mb-6 animate-pulse" />
            <h1 className="text-4xl font-bold mb-4">Ready to Begin?</h1>
            <p className="text-xl text-purple-100 mb-8">Your AI coach will guide you through this lesson</p>
            <button onClick={loadIntro} className="bg-white text-purple-600 px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
              Start Lesson
            </button>
          </div>
        )}

        {/* LOADING INTRO */}
        {isLoadingIntro && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="py-8">
              <div className="relative">
                {/* Animated wave icon */}
                <div className="text-6xl mb-6 inline-block animate-pulse">
                  🎵
                </div>
                
                {/* Pulsing gradient orb */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
              </div>
              
              <h2 className="text-3xl font-bold text-purple-600 mb-2">
                Preparing Your Lesson
              </h2>
              
              {/* Rotating intro loader messages */}
              <div className="h-8 overflow-hidden">
                <p className="text-slate-600 text-lg animate-pulse transition-all duration-500">
                  {INTRO_LOADER_MESSAGES[currentLoaderMessage]}
                </p>
              </div>
              
              {/* Progress bar */}
              <div className="mt-8 max-w-md mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full animate-shimmer"></div>
                </div>
              </div>
              
              {/* Helper text */}
              <p className="text-slate-500 text-sm mt-6">
                This usually takes 3-5 seconds
              </p>
            </div>
          </div>
        )}

        {/* INTRO SCREEN */}
        {step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">{lessonTitle}</h2>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
                {/* Audio Player Controls */}
                <div className="mb-4">
                  {/* Timeline */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-sm text-slate-600 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={skipBackward}
                      disabled={!introAudio}
                      className="w-12 h-12 bg-white text-slate-700 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shadow disabled:opacity-50"
                    >
                      <span className="text-xl">⏪</span>
                    </button>

                    <button 
                      onClick={isPlaying ? pauseAudio : playAudio} 
                      disabled={!introAudio}
                      className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50"
                    >
                      <span className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</span>
                    </button>

                    <button 
                      onClick={skipForward}
                      disabled={!introAudio}
                      className="w-12 h-12 bg-white text-slate-700 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shadow disabled:opacity-50"
                    >
                      <span className="text-xl">⏩</span>
                    </button>

                    <button 
                      onClick={replayAudio}
                      disabled={!introAudio}
                      className="w-12 h-12 bg-white text-slate-700 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shadow disabled:opacity-50"
                    >
                      <span className="text-xl">🔁</span>
                    </button>
                  </div>
                </div>

                {introAudio && (
                  <audio ref={audioRef} src={`data:audio/mpeg;base64,${introAudio}`} className="hidden" />
                )}

                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="text-slate-700 leading-relaxed">{introTranscript}</p>
                </div>
              </div>

              <button onClick={skipToRecording}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all">
                Continue to Recording →
              </button>
            </div>
          </div>
        )}

        {/* RECORDING SCREEN */}
        {step === 'recording' && (
          <div className="space-y-6">
            {/* Your Task Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  📝 Your Task
                </h3>
                <button onClick={() => setShowInstructions(!showInstructions)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  {showInstructions ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showInstructions && (
                <div className="bg-white rounded-lg p-4">
                  <p className="text-slate-800 text-lg leading-relaxed">
                    {practice_prompt || 'Loading task...'}
                  </p>
                </div>
              )}
            </div>

            {/* Recording Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {!isRecording && !audioBlob && !isSubmitting && (
                <>
                  <h2 className="text-3xl font-bold text-slate-900 mb-8">Ready to Record</h2>
                  {/* Animated button with pulsing background */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full animate-pulse opacity-30 scale-110"></div>
                    <button onClick={startRecording}
                      className="relative w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all">
                      <Mic className="w-16 h-16" strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}

              {isRecording && (
                <>
                  <h2 className="text-3xl font-bold text-red-600 mb-4">Recording...</h2>
                  <div className="text-4xl font-bold text-slate-900 mb-8">{formatTime(recordingTime)}</div>
                  {/* Animated stop button with ping effect */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-40"></div>
                    <button onClick={stopRecording}
                      className="relative w-32 h-32 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all">
                      <Square className="w-12 h-12" strokeWidth={2} fill="white" />
                    </button>
                  </div>
                </>
              )}

              {audioBlob && !isSubmitting && (
                <>
                  <div className="text-6xl mb-6">✅</div>
                  <h2 className="text-3xl font-bold text-green-600 mb-4">Recording Complete!</h2>
                  <p className="text-slate-600 mb-8 text-lg">Duration: {formatTime(recordingTime)}</p>
                  <div className="flex gap-4 justify-center">
                    <button 
                      onClick={reRecord} 
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      Re-record
                    </button>
                    <button 
                      onClick={submitRecording}
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      Submit for Feedback →
                    </button>
                  </div>
                </>
              )}

              {/* FEEDBACK ANALYSIS LOADER */}
              {isSubmitting && (
                <div className="py-8">
                  <div className="relative">
                    {/* Animated thinking icon */}
                    <div className="text-6xl mb-6 inline-block animate-bounce">
                      🤔
                    </div>
                    
                    {/* Pulsing gradient orb */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-purple-600 mb-2">
                    Analyzing Your Response
                  </h2>
                  
                  {/* Rotating feedback loader messages */}
                  <div className="h-8 overflow-hidden">
                    <p className="text-slate-600 text-lg animate-pulse transition-all duration-500">
                      {FEEDBACK_LOADER_MESSAGES[currentLoaderMessage]}
                    </p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-8 max-w-md mx-auto">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full animate-shimmer"></div>
                    </div>
                  </div>
                  
                  {/* Helper text */}
                  <p className="text-slate-500 text-sm mt-6">
                    This usually takes 5-10 seconds
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}