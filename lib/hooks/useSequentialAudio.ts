// lib/hooks/useSequentialAudio.ts
import { useState, useRef, useEffect, useCallback } from 'react'

export function useSequentialAudio(greetingBase64: string, lessonBase64: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null)
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<'greeting' | 'lesson' | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const greetingDuration = useRef<number>(0)

  // Initialize audio elements
  useEffect(() => {
    if (greetingBase64) {
      const greetingAudio = new Audio(`data:audio/mpeg;base64,${greetingBase64}`)
      greetingAudioRef.current = greetingAudio
      
      greetingAudio.addEventListener('loadedmetadata', () => {
        greetingDuration.current = greetingAudio.duration
      })
    }
    if (lessonBase64) {
      lessonAudioRef.current = new Audio(`data:audio/mpeg;base64,${lessonBase64}`)
    }

    return () => {
      greetingAudioRef.current?.pause()
      lessonAudioRef.current?.pause()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [greetingBase64, lessonBase64])

  // Calculate total duration
  useEffect(() => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    const updateDuration = () => {
      const greetingDur = greeting?.duration || 0
      const lessonDur = lesson?.duration || 0
      greetingDuration.current = greetingDur
      setDuration(greetingDur + lessonDur)
    }

    greeting?.addEventListener('loadedmetadata', updateDuration)
    lesson?.addEventListener('loadedmetadata', updateDuration)

    return () => {
      greeting?.removeEventListener('loadedmetadata', updateDuration)
      lesson?.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [])

  // Update current time continuously
  const updateTime = useCallback(() => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (!greeting || !lesson) return

    if (!greeting.paused && greeting.currentTime < greeting.duration) {
      setCurrentTime(greeting.currentTime)
      setCurrentlyPlaying('greeting')
    } else if (!lesson.paused && lesson.currentTime < lesson.duration) {
      setCurrentTime(greetingDuration.current + lesson.currentTime)
      setCurrentlyPlaying('lesson')
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateTime])

  const play = useCallback(async () => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (!greeting || !lesson) return

    setIsPlaying(true)

    const greetingDur = greetingDuration.current

    // Determine where to resume playback
    if (currentTime < greetingDur) {
      // Resume greeting
      greeting.currentTime = currentTime
      setCurrentlyPlaying('greeting')
      
      try {
        await greeting.play()
        
        // When greeting ends naturally, play lesson
        const onGreetingEnd = async () => {
          setCurrentlyPlaying('lesson')
          try {
            await lesson.play()
          } catch (err) {
            console.error('Lesson play error:', err)
          }
        }
        
        greeting.addEventListener('ended', onGreetingEnd, { once: true })
      } catch (err) {
        console.error('Greeting play error:', err)
        setIsPlaying(false)
      }
    } else {
      // Resume lesson
      lesson.currentTime = currentTime - greetingDur
      setCurrentlyPlaying('lesson')
      
      try {
        await lesson.play()
      } catch (err) {
        console.error('Lesson play error:', err)
        setIsPlaying(false)
      }
    }

    // Handle lesson end
    const onLessonEnd = () => {
      setIsPlaying(false)
      setCurrentlyPlaying(null)
      setCurrentTime(0)
      greeting.currentTime = 0
      lesson.currentTime = 0
    }

    lesson.addEventListener('ended', onLessonEnd, { once: true })
  }, [currentTime])

  const pause = useCallback(() => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    greeting?.pause()
    lesson?.pause()
    setIsPlaying(false)
  }, [])

  const seek = useCallback((time: number) => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (!greeting || !lesson) return

    const greetingDur = greetingDuration.current
    const wasPlaying = isPlaying

    // Pause both first
    greeting.pause()
    lesson.pause()
    setIsPlaying(false)

    if (time <= greetingDur) {
      // Seek within greeting
      greeting.currentTime = time
      lesson.currentTime = 0
      setCurrentlyPlaying('greeting')
    } else {
      // Seek within lesson
      greeting.currentTime = greetingDur
      lesson.currentTime = time - greetingDur
      setCurrentlyPlaying('lesson')
    }

    setCurrentTime(time)

    // Resume playing if it was playing before
    if (wasPlaying) {
      setTimeout(() => {
        if (time <= greetingDur) {
          greeting.play().catch(console.error)
        } else {
          lesson.play().catch(console.error)
        }
        setIsPlaying(true)
      }, 50)
    }
  }, [isPlaying])

  const skipBackward = useCallback((seconds: number = 10) => {
    const newTime = Math.max(0, currentTime - seconds)
    seek(newTime)
  }, [currentTime, seek])

  const skipForward = useCallback((seconds: number = 10) => {
    const newTime = Math.min(duration, currentTime + seconds)
    seek(newTime)
  }, [currentTime, duration, seek])

  const replay = useCallback(() => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (!greeting || !lesson) return

    greeting.pause()
    lesson.pause()
    greeting.currentTime = 0
    lesson.currentTime = 0
    setCurrentTime(0)
    setCurrentlyPlaying('greeting')
    setIsPlaying(true)
    
    greeting.play().catch(console.error)

    const onGreetingEnd = async () => {
      setCurrentlyPlaying('lesson')
      lesson.play().catch(console.error)
    }

    const onLessonEnd = () => {
      setIsPlaying(false)
      setCurrentlyPlaying(null)
      setCurrentTime(0)
      greeting.currentTime = 0
      lesson.currentTime = 0
    }

    greeting.addEventListener('ended', onGreetingEnd, { once: true })
    lesson.addEventListener('ended', onLessonEnd, { once: true })
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
    skipBackward,
    skipForward,
    replay
  }
}