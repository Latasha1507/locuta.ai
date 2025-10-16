'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PracticePage({
  params,
}: {
  params: Promise<{ categoryId: string; moduleId: string; lessonId: string }>
}) {
  const resolvedParams = use(params)
  const { categoryId, moduleId, lessonId } = resolvedParams
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const tone = searchParams.get('tone') || 'Normal'

  const [lessonStarted, setLessonStarted] = useState(false)
  const [isPlayingIntro, setIsPlayingIntro] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [introTranscript, setIntroTranscript] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startLesson = async () => {
    setLessonStarted(true)
    setIsPlayingIntro(true)

    try {
      const response = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, categoryId, moduleId, lessonId }),
      })

      if (!response.ok) throw new Error('Failed to load')

      const data = await response.json()
      setIntroTranscript(data.transcript)

      const binaryString = atob(data.audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
      }
    } catch (error) {
      alert('Failed to load lesson')
      setIsPlayingIntro(false)
      setLessonStarted(false)
    }
  }

  const handleIntroEnded = () => {
    setIsPlayingIntro(false)
    setIntroFinished(true)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data])
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
    } catch (error) {
      alert('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const submitRecording = async () => {
    if (audioChunks.length === 0) {
      alert('Please record first!')
      return
    }

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('tone', tone)
      formData.append('categoryId', categoryId)
      formData.append('moduleId', moduleId)
      formData.append('lessonId', lessonId)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        alert('Error submitting')
        return
      }

      const data = await response.json()
      router.push(`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/feedback?session=${data.sessionId}`)
    } catch (error) {
      alert('Failed to process recording')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50">
      <audio ref={audioRef} onEnded={handleIntroEnded} className="hidden" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/category/${categoryId}/modules?tone=${tone}`} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice Session</h1>
              <p className="text-sm text-gray-600">{tone} Tone • Lesson {lessonId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        
        {/* START SCREEN */}
        {!lessonStarted && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">Ready to Begin?</h2>
              <p className="text-white/90 mt-1">Your AI coach will guide you through this lesson</p>
            </div>
            <div className="p-12 text-center">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Let&apos;s Get Started!</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Your AI coach will explain the lesson and give you a task to practice.
              </p>
              <button
                onClick={startLesson}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg font-bold rounded-xl shadow-xl transition-transform hover:scale-105"
              >
                Start Lesson
              </button>
            </div>
          </div>
        )}

        {/* PLAYING INTRO */}
        {isPlayingIntro && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">🎤 Listen to Your AI Coach</h2>
              <p className="text-white/90 mt-1">Your {tone} coach is speaking...</p>
            </div>
            
            <div className="p-12">
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                
                <div className="flex items-end justify-center gap-2 mb-6 h-16">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-purple-500 to-indigo-600 rounded-full animate-pulse"
                      style={{
                        height: `${30 + (i % 3) * 15}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {introTranscript && (
                <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-6">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-purple-200">
                    <span className="text-2xl">📝</span>
                    <h3 className="font-bold text-lg">Transcript</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {introTranscript}
                  </p>
                </div>
              )}

              <div className="text-center mt-6">
                <button onClick={handleIntroEnded} className="text-purple-600 hover:text-purple-800 font-semibold underline">
                  Skip to recording →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECORDING SCREEN */}
        {introFinished && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">🎙️ Your Turn to Practice</h2>
              <p className="text-white/90 mt-1">Record your response</p>
            </div>

            <div className="p-12">
              {/* Timer */}
              <div className="text-center mb-8">
                <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6 font-mono">
                  {formatTime(recordingTime)}
                </div>
              </div>

              {/* Recording Button */}
              <div className="flex justify-center mb-8">
                {!isRecording && audioChunks.length === 0 && (
                  <button
                    onClick={startRecording}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-2xl transition-transform hover:scale-110 flex items-center justify-center"
                  >
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </button>
                )}
                
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-2xl transition-transform hover:scale-110 flex items-center justify-center animate-pulse"
                  >
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                  </button>
                )}

                {!isRecording && audioChunks.length > 0 && (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-2xl flex items-center justify-center">
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Status Text */}
              <p className="text-center text-lg text-gray-700 mb-8 font-medium">
                {!isRecording && audioChunks.length === 0 && '🎤 Click microphone to start recording'}
                {isRecording && '🔴 Recording... Click to stop'}
                {!isRecording && audioChunks.length > 0 && '✅ Recording complete!'}
              </p>

              {/* Waveform when recording */}
              {isRecording && (
                <div className="flex items-end justify-center gap-2 mb-8 h-16">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-red-500 to-pink-600 rounded-full animate-pulse"
                      style={{
                        height: `${25 + Math.random() * 35}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {!isRecording && audioChunks.length > 0 && (
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setAudioChunks([])
                      setRecordingTime(0)
                    }}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    🔄 Re-record
                  </button>
                  <button
                    onClick={submitRecording}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-lg"
                  >
                    Submit for Feedback →
                  </button>
                </div>
              )}

              {/* Tips */}
              <div className="mt-10 bg-blue-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Quick Tips</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Speak clearly at a natural pace</li>
                      <li>• Find a quiet space</li>
                      <li>• Relax - practice makes perfect!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}