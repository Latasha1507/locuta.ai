// Create this file: lib/hooks/useSequentialAudio.ts

import { useState, useRef, useEffect, useCallback } from 'react'

export function useSequentialAudio(greetingBase64: string, lessonBase64: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null)
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<'greeting' | 'lesson' | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize audio elements
  useEffect(() => {
    if (greetingBase64) {
      greetingAudioRef.current = new Audio(`data:audio/mpeg;base64,${greetingBase64}`)
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
      setDuration(greetingDur + lessonDur)
    }

    greeting?.addEventListener('loadedmetadata', updateDuration)
    lesson?.addEventListener('loadedmetadata', updateDuration)

    return () => {
      greeting?.removeEventListener('loadedmetadata', updateDuration)
      lesson?.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [])

  // Update current time
  const updateTime = useCallback(() => {
    const greeting = greetingAudioRef.current
    const lesson = lessonAudioRef.current

    if (currentlyPlaying === 'greeting' && greeting) {
      setCurrentTime(greeting.currentTime)
    } else if (currentlyPlaying === 'lesson' && lesson && greeting) {
      setCurrentTime((greeting.duration || 0) + lesson.currentTime)
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [currentlyPlaying, isPlaying])

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

    // Play greeting first
    setCurrentlyPlaying('greeting')
    await greeting.play()

    // When greeting ends, play lesson
    const onGreetingEnd = async () => {
      setCurrentlyPlaying('lesson')
      await lesson.play()
    }

    const onLessonEnd = () => {
      setIsPlaying(false)
      setCurrentlyPlaying(null)
      setCurrentTime(0)
    }

    greeting.addEventListener('ended', onGreetingEnd, { once: true })
    lesson.addEventListener('ended', onLessonEnd, { once: true })
  }, [])

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

    const greetingDuration = greeting.duration || 0

    if (time <= greetingDuration) {
      // Seek within greeting
      lesson.pause()
      lesson.currentTime = 0
      greeting.currentTime = time
      setCurrentlyPlaying('greeting')
    } else {
      // Seek within lesson
      greeting.pause()
      greeting.currentTime = greetingDuration
      lesson.currentTime = time - greetingDuration
      setCurrentlyPlaying('lesson')
    }

    setCurrentTime(time)
  }, [])

  const skipBackward = useCallback((seconds: number = 10) => {
    const newTime = Math.max(0, currentTime - seconds)
    seek(newTime)
  }, [currentTime, seek])

  const skipForward = useCallback((seconds: number = 10) => {
    const newTime = Math.min(duration, currentTime + seconds)
    seek(newTime)
  }, [currentTime, duration, seek])

  const replay = useCallback(() => {
    seek(0)
    play()
  }, [seek, play])

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