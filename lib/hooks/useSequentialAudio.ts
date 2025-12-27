// lib/hooks/useSequentialAudio.ts

import { useState, useRef, useEffect, useCallback } from 'react'

export function useSequentialAudio(greetingBase64: string, lessonBase64: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null)
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null)
  const greetingDuration = useRef<number>(0)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio elements
  useEffect(() => {
    if (greetingBase64) {
      const greetingAudio = new Audio(`data:audio/mpeg;base64,${greetingBase64}`)
      greetingAudioRef.current = greetingAudio
      
      greetingAudio.addEventListener('loadedmetadata', () => {
        greetingDuration.current = greetingAudio.duration
        updateTotalDuration()
      })
    }
    if (lessonBase64) {
      const lessonAudio = new Audio(`data:audio/mpeg;base64,${lessonBase64}`)
      lessonAudioRef.current = lessonAudio
      
      lessonAudio.addEventListener('loadedmetadata', () => {
        updateTotalDuration()
      })
    }

    return () => {
      greetingAudioRef.current?.pause()
      lessonAudioRef.current?.pause()
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [greetingBase64, lessonBase64])

  const updateTotalDuration = () => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current
    
    if (greeting && lesson) {
      const total = (greeting.duration || 0) + (lesson.duration || 0)
      setDuration(total)
    }
  }

  // Continuous time update while playing
  useEffect(() => {
    if (isPlaying) {
      updateIntervalRef.current = setInterval(() => {
        const greeting = greetingAudioRef.current
        const lesson = lessonAudioRef.current

        if (!greeting || !lesson) return

        if (!greeting.paused) {
          setCurrentTime(greeting.currentTime)
        } else if (!lesson.paused) {
          setCurrentTime(greetingDuration.current + lesson.currentTime)
        }
      }, 100) // Update every 100ms for smooth progress
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [isPlaying])

  const play = useCallback(async () => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (!greeting || !lesson) return

    const greetingDur = greetingDuration.current

    setIsPlaying(true)

    // Determine where to resume playback based on currentTime
    if (currentTime < greetingDur) {
      // Play greeting from current position
      greeting.currentTime = currentTime
      
      try {
        await greeting.play()
        
        // When greeting ends, automatically play lesson
        const onGreetingEnd = async () => {
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
      // Play lesson from current position
      lesson.currentTime = currentTime - greetingDur
      
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
      setCurrentTime(0)
      if (greeting) greeting.currentTime = 0
      if (lesson) lesson.currentTime = 0
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

    // Pause both
    greeting.pause()
    lesson.pause()

    // Update positions based on seek time
    if (time < greetingDur) {
      // Seek to position in greeting
      greeting.currentTime = time
      lesson.currentTime = 0
    } else {
      // Seek to position in lesson
      greeting.currentTime = greetingDur
      lesson.currentTime = time - greetingDur
    }

    setCurrentTime(time)

    // Resume playing if it was playing
    if (wasPlaying) {
      setIsPlaying(false) // Reset state first
      setTimeout(() => {
        if (time < greetingDur) {
          greeting.play().then(() => setIsPlaying(true)).catch(console.error)
          
          const onGreetingEnd = () => {
            lesson.play().catch(console.error)
          }
          greeting.addEventListener('ended', onGreetingEnd, { once: true })
        } else {
          lesson.play().then(() => setIsPlaying(true)).catch(console.error)
        }
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
    setIsPlaying(true)
    
    greeting.play().catch(console.error)

    const onGreetingEnd = () => {
      lesson.play().catch(console.error)
    }

    const onLessonEnd = () => {
      setIsPlaying(false)
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