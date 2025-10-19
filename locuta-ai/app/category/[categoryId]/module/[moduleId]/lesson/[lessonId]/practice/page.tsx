'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; moduleId: string; lessonId: string }>
  searchParams: Promise<{ tone?: string }>
}) {
  const [resolvedParams, setResolvedParams] = useState<{ categoryId: string; moduleId: string; lessonId: string } | null>(null)
  const [tone, setTone] = useState<string>('')
  const router = useRouter()

  const [step, setStep] = useState<'start' | 'intro' | 'recording'>('start')
  const [introAudio, setIntroAudio] = useState<string>('')
  const [introTranscript, setIntroTranscript] = useState<string>('')
  const [lessonInfo, setLessonInfo] = useState<{ title: string; prompt: string; example: string }>({
    title: '',
    prompt: '',
    example: ''
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const p = await params
      const sp = await searchParams
      setResolvedParams(p)
      setTone(sp.tone || 'Normal')
    }
    resolveParams()
  }, [params, searchParams])

  // Load lesson intro
  const loadIntro = async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          categoryId: resolvedParams.categoryId,
          moduleId: resolvedParams.moduleId,
          lessonId: resolvedParams.lessonId,
        }),
      })

      if (!response.ok) throw new Error('Failed to load intro')

      const data = await response.json()
      setIntroAudio(data.audioBase64)
      setIntroTranscript(data.transcript)
      setLessonInfo({
        title: data.lessonTitle || '',
        prompt: data.practice_prompt || '',
        example: data.practice_example || ''
      })
      setStep('intro')
    } catch (error) {
      console.error('Error loading intro:', error)
      alert('Failed to load lesson intro')
    }
  }

  // Audio controls
  const playAudio = () => {
    if (audioRef.current) {
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

  const replayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const skipToRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setStep('recording')
  }

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const reRecord = () => {
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const submitRecording = async () => {
    if (!audioBlob || !resolvedParams) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('tone', tone)
      formData.append('categoryId', resolvedParams.categoryId)
      formData.append('moduleId', resolvedParams.moduleId)
      formData.append('lessonId', resolvedParams.lessonId)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to submit')

      const data = await response.json()
      router.push(
        `/category/${resolvedParams.categoryId}/module/${resolvedParams.moduleId}/lesson/${resolvedParams.lessonId}/feedback?sessionId=${data.sessionId}`
      )
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Failed to submit recording')
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!resolvedParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href={`/category/${resolvedParams.categoryId}/modules?tone=${tone}`}
            className="text-slate-700 hover:text-indigo-600 font-medium"
          >
            ← Back to Lessons
          </Link>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Start Screen */}
        {step === 'start' && (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-2xl p-12 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/30 mx-auto mb-6 animate-pulse" />
            <h1 className="text-4xl font-bold mb-4">Ready to Begin?</h1>
            <p className="text-xl text-purple-100 mb-8">
              Your AI coach will guide you through this lesson
            </p>
            <button
              onClick={loadIntro}
              className="bg-white text-purple-600 px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              Start Lesson
            </button>
          </div>
        )}

        {/* Intro Screen */}
        {step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                {lessonInfo.title || 'Lesson Introduction'}
              </h2>

              {/* Audio Player with Controls */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {!isPlaying ? (
                    <button
                      onClick={playAudio}
                      className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors shadow-lg"
                    >
                      <span className="text-2xl">▶️</span>
                    </button>
                  ) : (
                    <button
                      onClick={pauseAudio}
                      className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors shadow-lg"
                    >
                      <span className="text-2xl">⏸️</span>
                    </button>
                  )}
                  <button
                    onClick={replayAudio}
                    className="w-16 h-16 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    <span className="text-2xl">🔁</span>
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={`data:audio/mpeg;base64,${introAudio}`}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full"
                />

                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="text-slate-700 leading-relaxed">{introTranscript}</p>
                </div>
              </div>

              <button
                onClick={skipToRecording}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                Continue to Recording →
              </button>
            </div>
          </div>
        )}

        {/* Recording Screen */}
        {step === 'recording' && (
          <div className="space-y-6">
            {/* Instructions Card - Always Visible */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  📝 Your Task
                </h3>
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showInstructions ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showInstructions && (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-slate-700 font-medium mb-2">Practice Prompt:</p>
                    <p className="text-slate-800">{lessonInfo.prompt}</p>
                  </div>
                  {lessonInfo.example && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-slate-700 font-medium mb-2">Tips & Example:</p>
                      <p className="text-slate-800">{lessonInfo.example}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recording Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {!isRecording && !audioBlob && (
                <>
                  <div className="text-6xl mb-6">🎤</div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">
                    Ready to Record
                  </h2>
                  <p className="text-slate-600 mb-8 text-lg">
                    Click the microphone to start recording your response
                  </p>
                  <button
                    onClick={startRecording}
                    className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all mx-auto"
                  >
                    <span className="text-5xl">🎤</span>
                  </button>
                </>
              )}

              {isRecording && (
                <>
                  <div className="text-6xl mb-6 animate-pulse">🔴</div>
                  <h2 className="text-3xl font-bold text-red-600 mb-4">Recording...</h2>
                  <div className="text-4xl font-bold text-slate-900 mb-8">
                    {formatTime(recordingTime)}
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-32 h-32 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all mx-auto"
                  >
                    <span className="text-5xl">⏹️</span>
                  </button>
                </>
              )}

              {audioBlob && !isSubmitting && (
                <>
                  <div className="text-6xl mb-6">✅</div>
                  <h2 className="text-3xl font-bold text-green-600 mb-4">
                    Recording Complete!
                  </h2>
                  <p className="text-slate-600 mb-8 text-lg">
                    Duration: {formatTime(recordingTime)}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={reRecord}
                      className="px-8 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={submitRecording}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all"
                    >
                      Submit for Feedback →
                    </button>
                  </div>
                </>
              )}

              {isSubmitting && (
                <>
                  <div className="text-6xl mb-6 animate-spin">⏳</div>
                  <h2 className="text-3xl font-bold text-purple-600 mb-4">
                    Analyzing Your Response...
                  </h2>
                  <p className="text-slate-600 text-lg">
                    Our AI is generating detailed feedback for you
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}