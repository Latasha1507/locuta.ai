'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PracticePage() {
  // Use the hooks directly - no props needed
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Get params directly from hooks
  const categoryId = params?.categoryId as string
  const moduleId = params?.moduleId as string
  const lessonId = params?.lessonId as string
  const tone = searchParams?.get('tone') || 'Normal'

  // Rest of your component code remains the same...
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
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Log params on mount
  useEffect(() => {
    console.log('Component mounted with params:', {
      categoryId,
      moduleId,
      lessonId,
      tone
    })
  }, [categoryId, moduleId, lessonId, tone])

  // Load lesson intro
  const loadIntro = async () => {
    if (!categoryId || !moduleId || !lessonId) {
      setError('Missing required parameters')
      return
    }

    setError(null)
    
    const requestBody = {
      tone,
      categoryId,
      moduleId,
      lessonId,
    }
    
    console.log('Loading intro with params:', requestBody)

    try {
      const response = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('Intro API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Intro API error:', errorData)
        throw new Error(errorData.error || `Failed to load intro (${response.status})`)
      }

      const data = await response.json()
      console.log('Intro data received:', {
        hasAudio: !!data.audioBase64,
        hasTranscript: !!data.transcript,
        lessonTitle: data.lessonTitle,
        practice_prompt: data.practice_prompt,
        practice_example: data.practice_example
      })
      
      setIntroAudio(data.audioBase64 || '')
      setIntroTranscript(data.transcript || '')
      setLessonInfo({
        title: data.lessonTitle || '',
        prompt: data.practice_prompt || '',
        example: data.practice_example || ''
      })
      setStep('intro')
    } catch (error) {
      console.error('Error loading intro:', error)
      setError(error instanceof Error ? error.message : 'Failed to load lesson intro')
      alert('Failed to load lesson intro: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // [Include all the other functions: playAudio, pauseAudio, replayAudio, skipToRecording, startRecording, stopRecording, reRecord, submitRecording, formatTime]
  // ... (rest of the component code from my previous answer)

  // Show loading while params are missing
  if (!categoryId || !moduleId || !lessonId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // Return the full JSX (same as before)
  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Rest of your JSX remains the same */}
    </div>
  )
}