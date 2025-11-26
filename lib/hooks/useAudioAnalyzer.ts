// lib/hooks/useAudioAnalyzer.ts
import { useRef, useState, useCallback } from 'react'

export interface VoiceMetrics {
  // Real-time metrics
  currentVolume: number
  averageVolume: number
  volumeStability: number
  
  // Pace metrics
  speakingTimeMs: number
  silenceTimeMs: number
  speakingRatio: number
  
  // Pause analysis
  pauseCount: number
  averagePauseDuration: number
  longPauseCount: number
  strategicPauseCount: number
  
  // Pitch/tone (basic estimation)
  pitchStability: number
  averagePitch: number
  pitchRange: number
  
  // Confidence indicators
  volumeDropCount: number
  trailingOffCount: number
  rushingSegments: number
  
  // Calculated scores
  confidenceScore: number
  deliveryScore: number
  paceScore: number
}

interface AudioAnalyzerConfig {
  silenceThreshold?: number
  pauseMinDuration?: number
  sampleRate?: number
}

const DEFAULT_CONFIG: AudioAnalyzerConfig = {
  silenceThreshold: 15,
  pauseMinDuration: 200,
  sampleRate: 60,
}

export function useAudioAnalyzer(config: AudioAnalyzerConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  
  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  
  // Metrics tracking refs
  const volumeHistoryRef = useRef<number[]>([])
  const pitchHistoryRef = useRef<number[]>([])
  const pausesRef = useRef<{ start: number; end: number; duration: number }[]>([])
  const startTimeRef = useRef<number>(0)
  const lastSpeakingTimeRef = useRef<number>(0)
  const isSpeakingRef = useRef<boolean>(false)
  const currentPauseStartRef = useRef<number | null>(null)
  const speakingDurationRef = useRef<number>(0)
  const silenceDurationRef = useRef<number>(0)
  const volumeDropsRef = useRef<number>(0)
  const trailingOffsRef = useRef<number>(0)
  const lastVolumeRef = useRef<number>(0)
  
  // State for real-time updates
  const [metrics, setMetrics] = useState<VoiceMetrics>(getInitialMetrics())
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  function getInitialMetrics(): VoiceMetrics {
    return {
      currentVolume: 0,
      averageVolume: 0,
      volumeStability: 100,
      speakingTimeMs: 0,
      silenceTimeMs: 0,
      speakingRatio: 0,
      pauseCount: 0,
      averagePauseDuration: 0,
      longPauseCount: 0,
      strategicPauseCount: 0,
      pitchStability: 80,
      averagePitch: 0,
      pitchRange: 0,
      volumeDropCount: 0,
      trailingOffCount: 0,
      rushingSegments: 0,
      confidenceScore: 0,
      deliveryScore: 0,
      paceScore: 0,
    }
  }

  // Estimate pitch using autocorrelation
  const estimatePitch = useCallback((dataArray: Uint8Array, sampleRate: number): number => {
    const bufferLength = dataArray.length
    let maxCorrelation = 0
    let bestPeriod = 0
    
    for (let period = 20; period < bufferLength / 2; period++) {
      let correlation = 0
      for (let i = 0; i < bufferLength - period; i++) {
        correlation += Math.abs(dataArray[i] - dataArray[i + period])
      }
      correlation = 1 - (correlation / (bufferLength - period) / 255)
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation
        bestPeriod = period
      }
    }
    
    if (maxCorrelation > 0.5 && bestPeriod > 0) {
      return sampleRate / bestPeriod
    }
    return 0
  }, [])

  // Calculate current volume (RMS)
  const calculateVolume = useCallback((dataArray: Uint8Array): number => {
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const value = (dataArray[i] - 128) / 128
      sum += value * value
    }
    const rms = Math.sqrt(sum / dataArray.length)
    return Math.min(100, Math.round(rms * 200))
  }, [])

  // Confidence score calculation
  const calculateConfidenceScore = useCallback((params: {
    volumeStability: number
    avgVolume: number
    volumeDrops: number
    trailingOffs: number
    longPauseCount: number
    pitchStability: number
    speakingRatio: number
  }): number => {
    let score = 70
    
    score += (params.volumeStability - 50) * 0.3
    
    if (params.avgVolume >= 30 && params.avgVolume <= 80) {
      score += 10
    } else if (params.avgVolume < 30) {
      score -= (30 - params.avgVolume) * 0.5
    }
    
    score -= Math.min(15, params.volumeDrops * 2)
    score -= Math.min(20, params.trailingOffs * 4)
    score -= Math.min(15, params.longPauseCount * 5)
    
    if (params.speakingRatio >= 0.5 && params.speakingRatio <= 0.8) {
      score += 5
    } else if (params.speakingRatio > 0.9) {
      score -= 5
    } else if (params.speakingRatio < 0.4) {
      score -= 10
    }
    
    return Math.max(0, Math.min(100, score))
  }, [])

  // Pace score calculation
  const calculatePaceScore = useCallback((params: {
    speakingRatio: number
    avgPauseDuration: number
    pauseCount: number
    strategicPauseCount: number
  }): number => {
    let score = 70
    
    if (params.speakingRatio >= 0.5 && params.speakingRatio <= 0.75) {
      score += 15
    } else if (params.speakingRatio > 0.85) {
      score -= 10
    } else if (params.speakingRatio < 0.4) {
      score -= 15
    }
    
    score += Math.min(15, params.strategicPauseCount * 3)
    
    if (params.avgPauseDuration >= 300 && params.avgPauseDuration <= 1000) {
      score += 10
    } else if (params.avgPauseDuration > 2000) {
      score -= 10
    }
    
    return Math.max(0, Math.min(100, score))
  }, [])

  // Delivery score calculation
  const calculateDeliveryScore = useCallback((params: {
    confidenceScore: number
    paceScore: number
    volumeStability: number
    pitchStability: number
  }): number => {
    return (
      params.confidenceScore * 0.35 +
      params.paceScore * 0.30 +
      params.volumeStability * 0.20 +
      (params.pitchStability >= 60 && params.pitchStability <= 85 ? 85 : params.pitchStability) * 0.15
    )
  }, [])

  // Main analysis loop
  const analyze = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return
    
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current
    const now = Date.now()
    
    // Get frequency data - use type assertion for Web Audio API compatibility
    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array
    
    // Calculate current volume
    const currentVolume = calculateVolume(dataArray)
    volumeHistoryRef.current.push(currentVolume)
    
    if (volumeHistoryRef.current.length > 300) {
      volumeHistoryRef.current.shift()
    }
    
    // Detect speaking vs silence
    const isSpeaking = currentVolume > cfg.silenceThreshold!
    const wasSpeaking = isSpeakingRef.current
    
    if (isSpeaking) {
      speakingDurationRef.current += 1000 / cfg.sampleRate!
      
      if (currentPauseStartRef.current !== null) {
        const pauseDuration = now - currentPauseStartRef.current
        if (pauseDuration >= cfg.pauseMinDuration!) {
          pausesRef.current.push({
            start: currentPauseStartRef.current,
            end: now,
            duration: pauseDuration
          })
        }
        currentPauseStartRef.current = null
      }
      
      lastSpeakingTimeRef.current = now
    } else {
      silenceDurationRef.current += 1000 / cfg.sampleRate!
      
      if (wasSpeaking && currentPauseStartRef.current === null) {
        currentPauseStartRef.current = now
      }
    }
    
    // Detect volume drops
    if (wasSpeaking && isSpeaking) {
      const volumeDrop = lastVolumeRef.current - currentVolume
      if (volumeDrop > 20) {
        volumeDropsRef.current++
      }
      if (volumeDrop > 5 && volumeHistoryRef.current.length >= 10) {
        const recent = volumeHistoryRef.current.slice(-10)
        const isTrailing = recent.every((v, i) => i === 0 || v <= recent[i-1] + 2)
        if (isTrailing && !isSpeaking) {
          trailingOffsRef.current++
        }
      }
    }
    
    lastVolumeRef.current = currentVolume
    isSpeakingRef.current = isSpeaking
    
    // Estimate pitch periodically
    if (isSpeaking && volumeHistoryRef.current.length % 10 === 0) {
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array
      const pitch = estimatePitch(dataArray, audioContextRef.current?.sampleRate || 44100)
      if (pitch > 50 && pitch < 500) {
        pitchHistoryRef.current.push(pitch)
        if (pitchHistoryRef.current.length > 100) {
          pitchHistoryRef.current.shift()
        }
      }
    }
    
    // Calculate aggregate metrics
    const history = volumeHistoryRef.current
    const avgVolume = history.length > 0 
      ? history.reduce((a, b) => a + b, 0) / history.length 
      : 0
    
    const volumeStd = history.length > 1
      ? Math.sqrt(history.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / history.length)
      : 0
    const volumeStability = Math.max(0, Math.min(100, 100 - volumeStd * 2))
    
    const pauses = pausesRef.current
    const longPauses = pauses.filter(p => p.duration > 2000)
    const strategicPauses = pauses.filter(p => p.duration >= 300 && p.duration <= 1500)
    const avgPauseDuration = pauses.length > 0
      ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length
      : 0
    
    const pitchHist = pitchHistoryRef.current
    const avgPitch = pitchHist.length > 0
      ? pitchHist.reduce((a, b) => a + b, 0) / pitchHist.length
      : 0
    const pitchMin = pitchHist.length > 0 ? Math.min(...pitchHist) : 0
    const pitchMax = pitchHist.length > 0 ? Math.max(...pitchHist) : 0
    const pitchRange = pitchMax - pitchMin
    const pitchStd = pitchHist.length > 1
      ? Math.sqrt(pitchHist.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / pitchHist.length)
      : 0
    const pitchStability = Math.max(0, Math.min(100, 100 - pitchStd / 2))
    
    const totalTime = speakingDurationRef.current + silenceDurationRef.current
    const speakingRatio = totalTime > 0 ? speakingDurationRef.current / totalTime : 0
    
    const confidenceScore = calculateConfidenceScore({
      volumeStability,
      avgVolume,
      volumeDrops: volumeDropsRef.current,
      trailingOffs: trailingOffsRef.current,
      longPauseCount: longPauses.length,
      pitchStability,
      speakingRatio,
    })
    
    const paceScore = calculatePaceScore({
      speakingRatio,
      avgPauseDuration,
      pauseCount: pauses.length,
      strategicPauseCount: strategicPauses.length,
    })
    
    const deliveryScore = calculateDeliveryScore({
      confidenceScore,
      paceScore,
      volumeStability,
      pitchStability,
    })
    
    // Update state (throttled to ~10 times/sec)
    if (volumeHistoryRef.current.length % 6 === 0) {
      setMetrics({
        currentVolume,
        averageVolume: Math.round(avgVolume),
        volumeStability: Math.round(volumeStability),
        speakingTimeMs: Math.round(speakingDurationRef.current),
        silenceTimeMs: Math.round(silenceDurationRef.current),
        speakingRatio: Math.round(speakingRatio * 100) / 100,
        pauseCount: pauses.length,
        averagePauseDuration: Math.round(avgPauseDuration),
        longPauseCount: longPauses.length,
        strategicPauseCount: strategicPauses.length,
        pitchStability: Math.round(pitchStability),
        averagePitch: Math.round(avgPitch),
        pitchRange: Math.round(pitchRange),
        volumeDropCount: volumeDropsRef.current,
        trailingOffCount: trailingOffsRef.current,
        rushingSegments: 0,
        confidenceScore: Math.round(confidenceScore),
        deliveryScore: Math.round(deliveryScore),
        paceScore: Math.round(paceScore),
      })
    }
    
    animationRef.current = requestAnimationFrame(analyze)
  }, [cfg, calculateVolume, estimatePitch, calculateConfidenceScore, calculatePaceScore, calculateDeliveryScore])

  // Start analyzing
  const startAnalyzing = useCallback(async (stream: MediaStream) => {
    try {
      // Reset all tracking
      volumeHistoryRef.current = []
      pitchHistoryRef.current = []
      pausesRef.current = []
      speakingDurationRef.current = 0
      silenceDurationRef.current = 0
      volumeDropsRef.current = 0
      trailingOffsRef.current = 0
      lastVolumeRef.current = 0
      isSpeakingRef.current = false
      currentPauseStartRef.current = null
      
      // Create audio context
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      
      // Connect stream
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      sourceRef.current.connect(analyserRef.current)
      
      // Create data array
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      startTimeRef.current = Date.now()
      setIsAnalyzing(true)
      setMetrics(getInitialMetrics())
      
      // Start analysis loop
      analyze()
      
    } catch (error) {
      console.error('Failed to start audio analysis:', error)
    }
  }, [analyze])

  // Stop analyzing
  const stopAnalyzing = useCallback((): VoiceMetrics => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsAnalyzing(false)
    
    return metrics
  }, [metrics])

  // Get current metrics
  const getMetrics = useCallback((): VoiceMetrics => {
    return metrics
  }, [metrics])

  return {
    metrics,
    isAnalyzing,
    startAnalyzing,
    stopAnalyzing,
    getMetrics,
  }
}