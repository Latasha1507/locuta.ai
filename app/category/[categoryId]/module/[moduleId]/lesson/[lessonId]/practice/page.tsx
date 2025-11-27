'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mic, Square, Play, Pause, SkipBack, SkipForward, RotateCcw, ThumbsUp } from 'lucide-react'
import { trackLessonStart, trackRecordingStart, trackRecordingStop, trackAudioSubmission, trackLessonCompletion, trackError } from '@/lib/analytics/helpers';
import Mixpanel from '@/lib/mixpanel';

// Extend Window type for Web Audio API
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

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
  
  // NEW: Check if we should skip showing the task
  const skipTask = searchParams?.get('skipTask') === 'true'

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
  
  // NEW: Control task visibility - hide by default if skipTask=true
  const [showInstructions, setShowInstructions] = useState(!skipTask)
  
  const [error, setError] = useState<string | null>(null)
  const [currentLoaderMessage, setCurrentLoaderMessage] = useState(0)
  const [introStartTime, setIntroStartTime] = useState<number>(0)
  const [hasStartedRecording, setHasStartedRecording] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0)
  const [isIntroLiked, setIsIntroLiked] = useState(false)
  
  // Audio player states
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Real-time voice metrics
  const [voiceMetrics, setVoiceMetrics] = useState({
    volume: 0,
    pace: 0, // words per minute estimate
    pauseCount: 0,
    currentPauseLength: 0,
    confidence: 0,
    energy: 0
  })

  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null)
  const submissionInProgressRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastSoundTimeRef = useRef<number>(0)
  const wordCountRef = useRef<number>(0)

  // NEW: If skipTask=true, skip intro and go straight to recording
  useEffect(() => {
    if (skipTask) {
      // Skip API call entirely - just go straight to recording
      setPracticePrompt('Practice speaking clearly and confidently on your chosen topic.')
      setLessonTitle(`Lesson ${lessonId}`)
      setStep('recording')
      
      Mixpanel.track('Re-record Started', {
        lesson_id: lessonId,
        category: categoryId,
        coaching_style: tone
      });
    }
  }, [])

  // Animated loader effect
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

  // Track page abandonment
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (step === 'intro' && !hasStartedRecording && introStartTime > 0) {
        const timeSpent = Math.round((Date.now() - introStartTime) / 1000);
        Mixpanel.track('Lesson Abandoned', {
          lesson_id: lessonId,
          category: categoryId,
          stage: 'intro_viewed',
          time_spent_seconds: timeSpent,
          coaching_style: tone
        });
      }
      
      if (step === 'recording' && isRecording && recordingStartTime > 0) {
        const timeSpent = Math.round((Date.now() - recordingStartTime) / 1000);
        Mixpanel.track('Recording Abandoned', {
          lesson_id: lessonId,
          category: categoryId,
          duration_seconds: recordingTime,
          time_spent_seconds: timeSpent,
          coaching_style: tone
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, hasStartedRecording, introStartTime, isRecording, recordingTime, recordingStartTime, lessonId, categoryId, tone]);

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
      setIntroStartTime(Date.now());
      
      trackLessonStart({
        lessonId: lessonId,
        lessonTitle: data.lessonTitle || 'Lesson',
        category: categoryId,
        moduleNumber: parseInt(moduleId),
        lessonNumber: parseInt(lessonId),
        coachingStyle: tone,
        isFirstLesson: false
      });
      
    } catch (error) {
      console.error('Error loading intro:', error)
      setError('Failed to load lesson intro')
      setIsLoadingIntro(false)
    }
  }

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
    
    const timeSpent = Math.round((Date.now() - introStartTime) / 1000);
    const listenedFully = audioRef.current ? audioRef.current.currentTime >= duration * 0.9 : false;
    
    Mixpanel.track('Intro Skipped', {
      lesson_id: lessonId,
      category: categoryId,
      time_spent_seconds: timeSpent,
      listened_fully: listenedFully,
      listen_percentage: audioRef.current ? Math.round((audioRef.current.currentTime / duration) * 100) : 0,
      coaching_style: tone
    });
    
    setStep('recording')
  }

  const toggleIntroLike = () => {
    setIsIntroLiked((prev) => !prev)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Set up audio analysis for real-time metrics
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      lastSoundTimeRef.current = Date.now()
      wordCountRef.current = 0

      // Start real-time analysis
      analyzeAudio()

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
        
        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      setHasStartedRecording(true);
      setRecordingStartTime(Date.now());
      
      trackRecordingStart({
        lessonId: lessonId,
        attemptNumber: 1,
        coachingStyle: tone
      });

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      
      let errorType = 'recording_failed';
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        errorType = 'microphone_permission_denied';
      } else if (errorMessage.includes('NotFoundError')) {
        errorType = 'microphone_not_found';
      } else if (errorMessage.includes('NotReadableError')) {
        errorType = 'microphone_already_in_use';
      }
      
      trackError({
        errorType: errorType,
        errorMessage: errorMessage,
        context: {
          lesson_id: lessonId,
          category: categoryId,
          browser: navigator.userAgent,
          has_microphone: navigator.mediaDevices ? 'yes' : 'no'
        }
      });
      
      setError('Failed to access microphone. Please check your permissions.')
    }
  }

  // Real-time audio analysis
  const analyzeAudio = () => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(dataArray)

    // Calculate volume (0-100)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    const volume = Math.min(100, Math.round(rms * 200))

    // Detect speech (volume threshold)
    const isSpeaking = volume > 15
    const now = Date.now()

    let pauseCount = voiceMetrics.pauseCount
    let currentPauseLength = 0

    if (isSpeaking) {
      const pauseDuration = (now - lastSoundTimeRef.current) / 1000
      if (pauseDuration > 1) {
        pauseCount++
        // Estimate word count (rough approximation)
        wordCountRef.current += Math.floor(pauseDuration * 2.5)
      }
      lastSoundTimeRef.current = now
    } else {
      currentPauseLength = (now - lastSoundTimeRef.current) / 1000
    }

    // Calculate pace (words per minute estimate)
    const estimatedWords = wordCountRef.current + Math.floor(volume / 10)
    const pace = recordingTime > 0 ? Math.round((estimatedWords / recordingTime) * 60) : 0

    // Calculate confidence (based on volume consistency and minimal pauses)
    const volumeConfidence = Math.min(100, volume * 1.5)
    const pauseConfidence = Math.max(0, 100 - (pauseCount * 5))
    const confidence = Math.round((volumeConfidence * 0.6 + pauseConfidence * 0.4))

    setVoiceMetrics({
      volume,
      pace: Math.min(200, pace),
      pauseCount,
      currentPauseLength: Math.round(currentPauseLength * 10) / 10,
      confidence: Math.min(100, confidence),
      energy: volume
    })

    // Continue animation loop
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      
      // Stop audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      trackRecordingStop({
        lessonId: lessonId,
        duration: recordingTime,
        tooShort: recordingTime < 30,
        tooLong: recordingTime > 120
      });
    }
  }

  const reRecord = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setVoiceMetrics({
      volume: 0,
      pace: 0,
      pauseCount: 0,
      currentPauseLength: 0,
      confidence: 0,
      energy: 0
    })
    wordCountRef.current = 0
  }

  const submitRecording = async () => {
    if (!audioBlob) {
      setError('No recording to submit')
      return
    }

    if (submissionInProgressRef.current) {
      console.log('⚠️ Submission already in progress, ignoring click')
      return
    }

    submissionInProgressRef.current = true
    setIsSubmitting(true)
    setError(null)
    
    const apiStartTime = Date.now();

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('tone', tone)
      formData.append('categoryId', categoryId)
      formData.append('moduleId', moduleId)
      formData.append('lessonId', lessonId)
      formData.append('duration', recordingTime.toString())

      trackAudioSubmission({
        lessonId: lessonId,
        coachingStyle: tone,
        duration: recordingTime,
        attemptNumber: 1,
        fileSize: audioBlob.size
      });

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      const apiDuration = Date.now() - apiStartTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        trackError({
          errorType: 'feedback_api_error',
          errorMessage: errorData.error || `Status ${response.status}`,
          context: {
            lesson_id: lessonId,
            status_code: response.status,
            duration_ms: apiDuration
          }
        });
        
        throw new Error(errorData.error || `Failed to submit (${response.status})`)
      }

      const data = await response.json()
      
      if (apiDuration > 15000) {
        Mixpanel.track('Slow API Response', {
          endpoint: 'feedback',
          duration_ms: apiDuration,
          lesson_id: lessonId,
          file_size: audioBlob.size
        });
      }
      
      trackLessonCompletion({
        lessonId: lessonId,
        lessonTitle: lessonTitle,
        category: categoryId,
        moduleNumber: parseInt(moduleId),
        lessonNumber: parseInt(lessonId),
        coachingStyle: tone,
        overallScore: 0,
        passed: false,
        attempts: 1,
        totalTime: recordingTime,
        transcriptWordCount: 0,
        fillerWordsCount: 0
      });

      router.push(`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/feedback?session=${data.sessionId}`)
    } catch (error) {
      console.error('Error submitting:', error)
      
      trackError({
        errorType: 'audio_submission_failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to submit recording',
        context: {
          lesson_id: lessonId,
          file_size: audioBlob.size,
          recording_duration: recordingTime
        }
      });
      
      setError(error instanceof Error ? error.message : 'Failed to submit recording')
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <Link href={`/category/${categoryId}/modules?tone=${tone}`} className="text-slate-700 hover:text-indigo-600 font-medium text-sm sm:text-base">
            ← Back to Lessons
          </Link>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* START SCREEN */}
        {step === 'start' && !isLoadingIntro && (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 text-center text-white">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/30 mx-auto mb-4 sm:mb-6 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Ready to Begin?</h1>
            <p className="text-base sm:text-lg lg:text-xl text-purple-100 mb-6 sm:mb-8">Your AI coach will guide you through this lesson</p>
            <button onClick={loadIntro} className="bg-white text-purple-600 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-2xl hover:scale-105 transition-all w-full sm:w-auto">
              Start Lesson
            </button>
          </div>
        )}

        {/* LOADING INTRO */}
        {isLoadingIntro && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 text-center">
            <div className="py-4 sm:py-6 lg:py-8">
              <div className="relative">
                <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 inline-block animate-pulse">
                  🎵
                </div>
                
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
              </div>
              
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-2">
                {skipTask ? 'Preparing to Re-record' : 'Preparing Your Lesson'}
              </h2>
              
              <div className="h-6 sm:h-8 overflow-hidden">
                <p className="text-slate-600 text-sm sm:text-base lg:text-lg animate-pulse transition-all duration-500">
                  {INTRO_LOADER_MESSAGES[currentLoaderMessage]}
                </p>
              </div>
              
              <div className="mt-6 sm:mt-8 max-w-md mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full animate-shimmer"></div>
                </div>
              </div>
              
              <p className="text-slate-500 text-xs sm:text-sm mt-4 sm:mt-6">
                This usually takes 3-5 seconds
              </p>
            </div>
          </div>
        )}

        {/* INTRO SCREEN */}
        {step === 'intro' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">{lessonTitle}</h2>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="mb-3 sm:mb-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mb-1 font-semibold">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 sm:h-2 rounded-full appearance-none cursor-pointer bg-white/60 accent-purple-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-600"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <button
                      onClick={toggleIntroLike}
                      disabled={!introAudio}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-md transition ${
                        isIntroLiked
                          ? 'bg-purple-600 text-white hover:bg-purple-500'
                          : 'bg-white text-slate-700 hover:bg-white/80'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      aria-label={isIntroLiked ? 'Unlike intro' : 'Like intro'}
                    >
                      <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      onClick={skipBackward}
                      disabled={!introAudio}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-md hover:bg-white/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Skip backward 10 seconds"
                    >
                      <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      onClick={isPlaying ? pauseAudio : playAudio}
                      disabled={!introAudio}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />
                      )}
                    </button>

                    <button
                      onClick={skipForward}
                      disabled={!introAudio}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-md hover:bg-white/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Skip forward 10 seconds"
                    >
                      <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      onClick={replayAudio}
                      disabled={!introAudio}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-md hover:bg-white/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Replay"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                {introAudio && (
                  <audio ref={audioRef} src={`data:audio/mpeg;base64,${introAudio}`} className="hidden" />
                )}

                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg">
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{introTranscript}</p>
                </div>
              </div>

              <button onClick={skipToRecording}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-xl transition-all">
                Continue to Recording →
              </button>
            </div>
          </div>
        )}

        {/* RECORDING SCREEN */}
        {step === 'recording' && (
          <div className="space-y-4 sm:space-y-6">
            {/* UPDATED: Conditionally show task section */}
            {showInstructions && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-blue-200">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-900 flex items-center gap-2">
                    📝 Your Task
                  </h3>
                  <button onClick={() => setShowInstructions(false)}
                    className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium flex-shrink-0">
                    Hide
                  </button>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4">
                  <p className="text-slate-800 text-sm sm:text-base lg:text-lg leading-relaxed whitespace-pre-wrap break-words">
                    {practice_prompt || 'Loading task...'}
                  </p>
                </div>
              </div>
            )}

            {/* UPDATED: Show task button when hidden */}
            {!showInstructions && (
              <button
                onClick={() => setShowInstructions(true)}
                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2"
              >
                <span>📝</span>
                Show Task Instructions
              </button>
            )}

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 text-center">
              {!isRecording && !audioBlob && !isSubmitting && (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8">
                    {skipTask ? 'Ready to Re-record' : 'Ready to Record'}
                  </h2>
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full animate-pulse opacity-30 scale-110"></div>
                    <button onClick={startRecording}
                      className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all">
                      <Mic className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16" strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}

              {isRecording && (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-3 sm:mb-4">Recording...</h2>
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 sm:mb-8">{formatTime(recordingTime)}</div>
                  
                  {/* Real-time Voice Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-2xl mx-auto">
                    {/* Volume */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs text-purple-600 font-semibold mb-1">Volume</div>
                      <div className="text-2xl font-bold text-purple-700">{voiceMetrics.volume}%</div>
                      <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-100"
                          style={{ width: `${voiceMetrics.volume}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Pace */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <div className="text-xs text-blue-600 font-semibold mb-1">Pace</div>
                      <div className="text-2xl font-bold text-blue-700">{voiceMetrics.pace}</div>
                      <div className="text-xs text-blue-500 mt-1">WPM</div>
                    </div>

                    {/* Confidence */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <div className="text-xs text-green-600 font-semibold mb-1">Confidence</div>
                      <div className="text-2xl font-bold text-green-700">{voiceMetrics.confidence}%</div>
                      <div className="w-full bg-green-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-green-600 h-1.5 rounded-full transition-all duration-100"
                          style={{ width: `${voiceMetrics.confidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Pauses */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-yellow-600 font-semibold mb-1">Pauses</div>
                      <div className="text-2xl font-bold text-yellow-700">{voiceMetrics.pauseCount}</div>
                      {voiceMetrics.currentPauseLength > 0 && (
                        <div className="text-xs text-yellow-500 mt-1">{voiceMetrics.currentPauseLength}s</div>
                      )}
                    </div>
                  </div>

                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-40"></div>
                    <button onClick={stopRecording}
                      className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all">
                      <Square className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12" strokeWidth={2} fill="white" />
                    </button>
                  </div>
                </>
              )}

              {audioBlob && !isSubmitting && (
                <>
                  <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">✅</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-green-600 mb-3 sm:mb-4">Recording Complete!</h2>
                  <p className="text-slate-600 mb-6 sm:mb-8 text-base sm:text-lg">Duration: {formatTime(recordingTime)}</p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <button 
                      onClick={reRecord} 
                      disabled={isSubmitting}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                      Re-record
                    </button>
                    <button 
                      onClick={submitRecording}
                      disabled={isSubmitting}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                      Submit for Feedback →
                    </button>
                  </div>
                </>
              )}

              {isSubmitting && (
                <div className="py-6 sm:py-8">
                  <div className="relative">
                    <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 inline-block animate-bounce">
                      🤔
                    </div>
                    
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-2">
                    Analyzing Your Response
                  </h2>
                  
                  <div className="h-6 sm:h-8 overflow-hidden">
                    <p className="text-slate-600 text-sm sm:text-base lg:text-lg animate-pulse transition-all duration-500">
                      {FEEDBACK_LOADER_MESSAGES[currentLoaderMessage]}
                    </p>
                  </div>
                  
                  <div className="mt-6 sm:mt-8 max-w-md mx-auto">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full animate-shimmer"></div>
                    </div>
                  </div>
                  
                  <p className="text-slate-500 text-xs sm:text-sm mt-4 sm:mt-6">
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