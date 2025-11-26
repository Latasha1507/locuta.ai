import { useRef, useState, useCallback } from 'react'

export interface VoiceMetrics {
  currentVolume: number
  averageVolume: number
  volumeStability: number
  speakingTimeMs: number
  silenceTimeMs: number
  speakingRatio: number
  pauseCount: number
  averagePauseDuration: number
  longPauseCount: number
  strategicPauseCount: number
  pitchStability: number
  averagePitch: number
  pitchRange: number
  volumeDropCount: number
  trailingOffCount: number
  rushingSegments: number
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
    confidenceScore: 70,
    deliveryScore: 70,
    paceScore: 70,
  }
}

export function useAudioAnalyzer(config: AudioAnalyzerConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  
  // Metrics tracking
  const volumeHistoryRef = useRef<number[]>([])
  const pitchHistoryRef = useRef<number[]>([])
  const pausesRef = useRef<{ start: number; end: number; duration: number }[]>([])
  const startTimeRef = useRef<number>(0)
  const isSpeakingRef = useRef<boolean>(false)
  const currentPauseStartRef = useRef<number | null>(null)
  const speakingDurationRef = useRef<number>(0)
  const silenceDurationRef = useRef<number>(0)
  const volumeDropsRef = useRef<number>(0)
  const trailingOffsRef = useRef<number>(0)
  const lastVolumeRef = useRef<number>(0)
  
  const [metrics, setMetrics] = useState<VoiceMetrics>(getInitialMetrics())
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Calculate volume from frequency data
  const calculateVolume = useCallback((analyser: AnalyserNode): number => {
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)
    
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    const avg = sum / bufferLength
    return Math.min(100, Math.round(avg * 0.8))
  }, [])

  // Estimate pitch
  const estimatePitch = useCallback((analyser: AnalyserNode, sampleRate: number): number => {
    const bufferLength = analyser.fftSize
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)
    
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

  // Main analysis loop
  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return
    
    const analyser = analyserRef.current
    const now = Date.now()
    
    // Get volume
    const currentVolume = calculateVolume(analyser)
    volumeHistoryRef.current.push(currentVolume)
    
    if (volumeHistoryRef.current.length > 300) {
      volumeHistoryRef.current.shift()
    }
    
    // Speaking vs silence
    const isSpeaking = currentVolume > cfg.silenceThreshold!
    const wasSpeaking = isSpeakingRef.current
    
    if (isSpeaking) {
      speakingDurationRef.current += 1000 / cfg.sampleRate!
      
      if (currentPauseStartRef.current !== null) {
        const pauseDuration = now - currentPauseStartRef.current
        if (pauseDuration >= cfg.pauseMinDuration!) {
          pausesRef.current.push({ start: currentPauseStartRef.current, end: now, duration: pauseDuration })
        }
        currentPauseStartRef.current = null
      }
    } else {
      silenceDurationRef.current += 1000 / cfg.sampleRate!
      if (wasSpeaking && currentPauseStartRef.current === null) {
        currentPauseStartRef.current = now
      }
    }
    
    // Volume drops
    if (wasSpeaking && isSpeaking && lastVolumeRef.current - currentVolume > 20) {
      volumeDropsRef.current++
    }
    
    // Trailing off detection
    if (wasSpeaking && !isSpeaking && volumeHistoryRef.current.length >= 10) {
      const recent = volumeHistoryRef.current.slice(-10)
      const isTrailing = recent.every((v, i) => i === 0 || v <= recent[i-1] + 2)
      if (isTrailing) trailingOffsRef.current++
    }
    
    lastVolumeRef.current = currentVolume
    isSpeakingRef.current = isSpeaking
    
    // Pitch (less frequently)
    if (isSpeaking && volumeHistoryRef.current.length % 10 === 0) {
      const pitch = estimatePitch(analyser, audioContextRef.current.sampleRate)
      if (pitch > 50 && pitch < 500) {
        pitchHistoryRef.current.push(pitch)
        if (pitchHistoryRef.current.length > 100) pitchHistoryRef.current.shift()
      }
    }
    
    // Calculate metrics
    const history = volumeHistoryRef.current
    const avgVolume = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0
    
    const volumeStd = history.length > 1
      ? Math.sqrt(history.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / history.length)
      : 0
    const volumeStability = Math.max(0, Math.min(100, 100 - volumeStd * 2))
    
    const pauses = pausesRef.current
    const longPauses = pauses.filter(p => p.duration > 2000)
    const strategicPauses = pauses.filter(p => p.duration >= 300 && p.duration <= 1500)
    const avgPauseDuration = pauses.length > 0 ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length : 0
    
    const pitchHist = pitchHistoryRef.current
    const avgPitch = pitchHist.length > 0 ? pitchHist.reduce((a, b) => a + b, 0) / pitchHist.length : 0
    const pitchMin = pitchHist.length > 0 ? Math.min(...pitchHist) : 0
    const pitchMax = pitchHist.length > 0 ? Math.max(...pitchHist) : 0
    const pitchRange = pitchMax - pitchMin
    const pitchStd = pitchHist.length > 1
      ? Math.sqrt(pitchHist.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / pitchHist.length)
      : 0
    const pitchStability = Math.max(0, Math.min(100, 100 - pitchStd / 2))
    
    const totalTime = speakingDurationRef.current + silenceDurationRef.current
    const speakingRatio = totalTime > 0 ? speakingDurationRef.current / totalTime : 0
    
    // Confidence score
    let confidenceScore = 70
    confidenceScore += (volumeStability - 50) * 0.3
    if (avgVolume >= 30 && avgVolume <= 80) confidenceScore += 10
    else if (avgVolume < 30) confidenceScore -= (30 - avgVolume) * 0.5
    confidenceScore -= Math.min(15, volumeDropsRef.current * 2)
    confidenceScore -= Math.min(20, trailingOffsRef.current * 4)
    confidenceScore -= Math.min(15, longPauses.length * 5)
    if (speakingRatio >= 0.5 && speakingRatio <= 0.8) confidenceScore += 5
    else if (speakingRatio > 0.9) confidenceScore -= 5
    else if (speakingRatio < 0.4) confidenceScore -= 10
    confidenceScore = Math.max(0, Math.min(100, confidenceScore))
    
    // Pace score
    let paceScore = 70
    if (speakingRatio >= 0.5 && speakingRatio <= 0.75) paceScore += 15
    else if (speakingRatio > 0.85) paceScore -= 10
    else if (speakingRatio < 0.4) paceScore -= 15
    paceScore += Math.min(15, strategicPauses.length * 3)
    if (avgPauseDuration >= 300 && avgPauseDuration <= 1000) paceScore += 10
    else if (avgPauseDuration > 2000) paceScore -= 10
    paceScore = Math.max(0, Math.min(100, paceScore))
    
    // Delivery score
    const deliveryScore = Math.round(
      confidenceScore * 0.35 +
      paceScore * 0.30 +
      volumeStability * 0.20 +
      (pitchStability >= 60 && pitchStability <= 85 ? 85 : pitchStability) * 0.15
    )
    
    // Update state (throttled)
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
  }, [cfg, calculateVolume, estimatePitch])

  // Start analyzing
  const startAnalyzing = useCallback(async (stream: MediaStream) => {
    try {
      // Reset tracking
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
      
      // Connect
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      sourceRef.current.connect(analyserRef.current)
      
      startTimeRef.current = Date.now()
      setIsAnalyzing(true)
      setMetrics(getInitialMetrics())
      
      // Start loop
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

  const getMetrics = useCallback((): VoiceMetrics => metrics, [metrics])

  return { metrics, isAnalyzing, startAnalyzing, stopAnalyzing, getMetrics }
}