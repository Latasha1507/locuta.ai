'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSequentialAudio } from '@/lib/hooks/useSequentialAudio'
import {
  trackLessonStart,
  trackRecordingStart,
  trackRecordingStop,
  trackAudioSubmission,
  trackLessonCompletion,
  trackError,
} from '@/lib/analytics/helpers'
import UpgradeModal from '@/components/UpgradeModal'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Mascot, type MascotMood } from '@/components/landing/Mascot'

export interface PracticeData {
  categoryId: string
  categoryName: string
  moduleId: string
  lessonId: string
  tone: string
  lessonTitle: string
  practicePrompt: string
  lessonExplanation: string
  expectedDurationSec: number
  /** Server-computed. The API enforces this too — this is just the UX. */
  limit: {
    allowed: boolean
    reason: 'ok' | 'trial_expired' | 'daily_limit'
    sessionsRemainingToday: number
  }
}

const WAVE = [26, 44, 62, 38, 80, 52, 96, 34, 70, 48, 88, 30, 64, 42, 78, 36, 90, 46, 58, 32, 72]

const INTRO_LOADING = [
  'Waking up your coach…',
  'Personalising this lesson…',
  'Warming up the mic…',
]

const SUBMIT_LOADING = [
  'Transcribing your audio…',
  'Listening to your delivery…',
  'Scoring clarity and pace…',
  'Writing your feedback…',
  'Almost there…',
]

/** Pick a container the browser can actually record. Safari can't do webm. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function PracticeView(d: PracticeData) {
  const router = useRouter()

  // A hard ceiling on recording length: 2x the lesson's expected duration,
  // clamped to 30s..180s. Without a cap, a forgotten open mic uploads a huge
  // file and bills us for a long Whisper transcription.
  const maxSeconds = Math.min(180, Math.max(30, d.expectedDurationSec * 2))

  const [phase, setPhase] = useState<'briefing' | 'ready'>('briefing')
  const [introLoading, setIntroLoading] = useState(false)
  const [loaderIdx, setLoaderIdx] = useState(0)
  const [introAudio, setIntroAudio] = useState('')
  const [greetingAudio, setGreetingAudio] = useState('')
  const [introTranscript, setIntroTranscript] = useState('')

  const [rec, setRec] = useState<'idle' | 'recording' | 'done'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0) // live mic level, 0..1
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(!d.limit.allowed)
  // Declared up here (not further down) so toggleRecord can't reference it
  // before initialisation.
  const blocked = !d.limit.allowed
  const [upgradeReason, setUpgradeReason] = useState<'trial_expired' | 'daily_limit'>(
    d.limit.reason === 'trial_expired' ? 'trial_expired' : 'daily_limit',
  )

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const submittingRef = useRef(false)
  const mimeRef = useRef<string | undefined>(undefined)

  const audio = useSequentialAudio(greetingAudio, introAudio)

  // Rotate the loading copy so long waits don't feel frozen.
  useEffect(() => {
    if (!introLoading && !submitting) return
    const messages = submitting ? SUBMIT_LOADING : INTRO_LOADING
    const t = setInterval(() => setLoaderIdx((i) => (i + 1) % messages.length), 2200)
    return () => clearInterval(t)
  }, [introLoading, submitting])

  useEffect(() => {
    trackLessonStart({
      lessonId: d.lessonId,
      lessonTitle: d.lessonTitle,
      category: d.categoryId,
      moduleNumber: parseInt(d.moduleId),
      lessonNumber: parseInt(d.lessonId),
      coachingStyle: d.tone,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Release the mic + audio graph. Must run on every exit path. */
  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    timerRef.current = null
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close()
    }
    audioCtxRef.current = null
  }, [])

  // Never leave the mic hot when the component unmounts.
  useEffect(() => teardown, [teardown])

  // Warn before abandoning a recording in progress.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (rec === 'recording' || (rec === 'done' && !submitting)) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [rec, submitting])

  const loadIntro = async () => {
    setError(null)
    setIntroLoading(true)
    try {
      const res = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: d.tone,
          categoryId: d.categoryId,
          moduleId: d.moduleId,
          lessonId: d.lessonId,
        }),
      })

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setUpgradeReason(body.reason === 'trial_expired' ? 'trial_expired' : 'daily_limit')
        setShowUpgrade(true)
        setIntroLoading(false)
        return
      }
      if (!res.ok) throw new Error('Could not load your coach right now.')

      const data = await res.json()
      setGreetingAudio(data.greetingAudio || '')
      setIntroAudio(data.audioBase64 || '')
      setIntroTranscript(data.transcript || '')
      setPhase('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      trackError({
        errorType: 'lesson_intro_failed',
        errorMessage: e instanceof Error ? e.message : 'unknown',
        context: { lesson_id: d.lessonId },
      })
    } finally {
      setIntroLoading(false)
    }
  }

  const stopRecording = useCallback(() => {
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    timerRef.current = null
    rafRef.current = null
    setLevel(0)
    setRec('done')
  }, [])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      mimeRef.current = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const type = mimeRef.current ?? 'audio/webm'
        setAudioBlob(new Blob(chunksRef.current, { type }))
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start()
      setRec('recording')
      setElapsed(0)
      setAudioBlob(null)

      trackRecordingStart({ lessonId: d.lessonId, coachingStyle: d.tone, attemptNumber: 1 })

      // Live level meter for the waveform.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        setLevel(Math.min(1, avg / 90))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1
          if (next >= maxSeconds) {
            // Auto-stop at the cap instead of recording forever.
            stopRecording()
            trackRecordingStop({ lessonId: d.lessonId, duration: next, tooShort: false, tooLong: true })
            return maxSeconds
          }
          return next
        })
      }, 1000)
    } catch {
      setError('We could not reach your microphone. Check your browser permissions and try again.')
    }
  }

  const toggleRecord = () => {
    // BLOCKED USERS MUST NOT RECORD. The upgrade modal is dismissible, so
    // without this guard an expired-trial user could close it, record a full
    // 60 seconds, hit submit, and only then be rejected by the server. The
    // server-side limit in /api/feedback still protects our OpenAI spend, but
    // wasting someone's effort before telling them is a rotten experience.
    if (blocked) {
      setShowUpgrade(true)
      return
    }
    if (rec === 'recording') {
      stopRecording()
      trackRecordingStop({
        lessonId: d.lessonId,
        duration: elapsed,
        tooShort: elapsed < 10,
        tooLong: false,
      })
    } else {
      void startRecording()
    }
  }

  const reRecord = () => {
    setAudioBlob(null)
    setElapsed(0)
    setRec('idle')
    setError(null)
  }

  const submit = async () => {
    if (!audioBlob || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const ext = (mimeRef.current ?? 'audio/webm').includes('mp4') ? 'mp4' : 'webm'
      const form = new FormData()
      form.append('audio', audioBlob, `recording.${ext}`)
      form.append('tone', d.tone)
      form.append('categoryId', d.categoryId)
      form.append('moduleId', d.moduleId)
      form.append('lessonId', d.lessonId)
      form.append('duration', String(elapsed))

      trackAudioSubmission({
        lessonId: d.lessonId,
        coachingStyle: d.tone,
        duration: elapsed,
        attemptNumber: 1,
        fileSize: audioBlob.size,
      })

      const res = await fetch('/api/feedback', { method: 'POST', body: form })

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setUpgradeReason(body.reason === 'trial_expired' ? 'trial_expired' : 'daily_limit')
        setShowUpgrade(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `Failed to submit (${res.status})`)
      }

      const data = await res.json()

      trackLessonCompletion({
        lessonId: d.lessonId,
        lessonTitle: d.lessonTitle,
        category: d.categoryId,
        moduleNumber: parseInt(d.moduleId),
        lessonNumber: parseInt(d.lessonId),
        coachingStyle: d.tone,
        overallScore: data.score || 0,
        passed: data.passed || false,
        attempts: 1,
        totalTime: elapsed,
        transcriptWordCount: 0,
        fillerWordsCount: 0,
      })

      teardown()
      router.push(
        `/category/${d.categoryId}/module/${d.moduleId}/lesson/${d.lessonId}/feedback?session=${data.sessionId}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your recording. Try again.')
      trackError({
        errorType: 'audio_submission_failed',
        errorMessage: e instanceof Error ? e.message : 'unknown',
        context: { lesson_id: d.lessonId },
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const recording = rec === 'recording'
  const captured = rec === 'done' && !!audioBlob
  const tooShort = captured && elapsed < 5
  const mood: MascotMood = recording ? 'shy' : captured ? 'cheer' : 'happy'

  const statusLabel = recording ? 'RECORDING' : captured ? 'CAPTURED' : 'READY'
  const statusBg = recording ? lc.coral : captured ? lc.green : '#eef2e8'
  const statusFg = recording || captured ? '#fff' : '#8a9a80'

  return (
    <div className="min-h-screen" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      <LandingIconSprite />

      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pb-11 pt-5 lg:gap-5 lg:px-6 lg:pb-14 lg:pt-8">
        {/* HEADER */}
        <div
          className="flex items-center gap-4 p-4 lg:px-6 lg:py-[18px]"
          style={{
            background: 'linear-gradient(135deg,#eafaef,#dff5e6)',
            border: '2px solid #cdeacf',
            borderRadius: 22,
            boxShadow: '0 6px 0 #d4ead2',
          }}
        >
          <Link
            href={`/category/${d.categoryId}/modules?tone=${encodeURIComponent(d.tone)}&module=${d.moduleId}`}
            aria-label="Back to lessons"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#fff',
              border: '2px solid #d3e6cf',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              boxShadow: '0 3px 0 #d3e6cf',
              transform: 'scaleX(-1)',
            }}
          >
            <Icon id="ic-arrow" size={18} color={lc.greenDark} />
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#7fa98a',
              }}
            >
              {d.categoryName.toUpperCase()} · MODULE {d.moduleId} · LESSON {d.lessonId}
            </div>
            <h1
              className="text-[19px] lg:text-[23px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.1, margin: '3px 0 6px' }}
            >
              {d.lessonTitle}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11,
                color: lc.greenDark,
                background: '#fff',
                border: '2px solid #c7edd2',
                padding: '3px 9px',
                borderRadius: 999,
              }}
            >
              <Icon id="ic-chat" size={11} color={lc.greenDark} />
              {d.tone} coach
            </span>
          </div>

          <div className="hidden shrink-0 sm:block" style={{ transform: 'scale(.62)', transformOrigin: 'center right' }}>
            <Mascot mood={mood} />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: '#fff5f3',
              border: '2px solid #ffdcd6',
              color: '#c0392b',
              borderRadius: 14,
              padding: '12px 14px',
              fontSize: 13.5,
              fontWeight: 700,
              boxShadow: '0 4px 0 #ffdcd6',
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1 — COACH BRIEFING */}
        <section
          className="p-[18px] lg:p-6"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <StepHead n={1} title="Hear your coach" subtitle={`A quick briefing in your ${d.tone} coach's voice`} />

          {phase === 'briefing' ? (
            <button
              type="button"
              onClick={loadIntro}
              disabled={introLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: introLoading ? '#a8ddb9' : lc.green,
                color: '#fff',
                border: 0,
                padding: 15,
                borderRadius: 15,
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 14.5,
                cursor: introLoading ? 'wait' : 'pointer',
                boxShadow: `0 5px 0 ${introLoading ? '#8fc9a1' : lc.greenDark}`,
              }}
            >
              {introLoading ? INTRO_LOADING[loaderIdx] : 'PLAY MY COACH BRIEFING'}
            </button>
          ) : (
            <AudioPlayer audio={audio} transcript={introTranscript} />
          )}
        </section>

        {/* STEP 2 — TASK (always visible; no waiting on the API to read it) */}
        <section
          className="p-[18px] lg:px-6 lg:py-5"
          style={{ background: '#eef8ea', border: '2px solid #cfe9c6', borderRadius: 20, boxShadow: '0 5px 0 #d8ecd0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon id="ic-target" size={20} color={lc.greenDark} />
            <span
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.1em',
                color: lc.greenDark,
              }}
            >
              YOUR TASK
            </span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                fontWeight: 800,
                color: '#6d8a66',
              }}
            >
              <Icon id="ic-clock" size={12} color="#6d8a66" />
              ~{d.expectedDurationSec}s
            </span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#33482e', fontWeight: 700, margin: 0 }}>
            {d.practicePrompt}
          </p>
        </section>

        {/* STEP 3 — RECORD */}
        <section
          className="p-[18px] lg:p-6"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <StepNum n={2} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16.5, lineHeight: 1, margin: 0 }}>
                Now it&apos;s your turn
              </h2>
              <p style={{ fontSize: 12, color: lc.faint, fontWeight: 700, margin: '2px 0 0' }}>
                {recording
                  ? 'Speak clearly — take your time.'
                  : captured
                    ? 'Nice! Send it for feedback, or go again.'
                    : 'Tap the mic when you’re ready to speak.'}
              </p>
            </div>
            <span
              aria-live="polite"
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 10.5,
                letterSpacing: '0.05em',
                padding: '5px 12px',
                borderRadius: 999,
                color: statusFg,
                background: statusBg,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Waveform — driven by the real mic level while recording */}
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 60, margin: '8px 0 22px' }}
            aria-hidden="true"
          >
            {WAVE.map((h, i) => {
              const base = Math.round(h * 0.55) + 8
              const scale = recording ? 0.35 + level * (0.7 + (i % 5) * 0.16) : 1
              return (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: base,
                    borderRadius: 4,
                    background: recording ? lc.coral : captured ? lc.green : '#dbe4d2',
                    transform: `scaleY(${Math.min(1.25, scale)})`,
                    transition: 'transform .09s linear, background .2s',
                  }}
                />
              )
            })}
          </div>

          {/* Persistent, non-dismissible reason the mic is off. The modal can be
              closed; this cannot, so a blocked user is never left staring at a
              dead record button with no explanation. */}
          {blocked && (
            <div
              role="status"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#fff3d6',
                border: `2px solid ${lc.yellow}`,
                borderRadius: 16,
                padding: '14px 16px',
                margin: '0 0 18px',
                boxShadow: `0 4px 0 ${lc.yellowDark}`,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#8a6100', lineHeight: 1.4 }}>
                {d.limit.reason === 'trial_expired'
                  ? 'Your free trial has ended, so recording is paused.'
                  : "That's all 10 practice sessions for today. Your mic unlocks again tomorrow."}
              </span>
              <Link
                href="/pricing"
                style={{
                  background: lc.yellow,
                  color: '#7a5600',
                  padding: '10px 18px',
                  borderRadius: 12,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: `0 3px 0 ${lc.yellowDark}`,
                  whiteSpace: 'nowrap',
                }}
              >
                See plans
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={toggleRecord}
              disabled={submitting || blocked}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              style={{
                position: 'relative',
                width: 104,
                height: 104,
                borderRadius: '50%',
                border: 0,
                cursor: submitting ? 'not-allowed' : 'pointer',
                background: recording ? lc.coral : lc.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 0 ${recording ? lc.coralDark : lc.greenDark}`,
              }}
            >
              {recording && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: lc.coral,
                    animation: 'lp-ripple 1.4s ease-out infinite',
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                {recording ? (
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: '#fff' }} />
                ) : (
                  <Icon id="ic-mic" size={34} color="#fff" />
                )}
              </span>
            </button>

            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 26,
                lineHeight: 1,
                letterSpacing: '0.5px',
                color: recording ? lc.coral : captured ? lc.green : '#c2cdb6',
              }}
            >
              {fmt(elapsed)}
            </div>
            <div style={{ fontSize: 13, color: lc.muted, fontWeight: 700 }}>
              {recording
                ? `Tap to stop · ${fmt(maxSeconds - elapsed)} left`
                : captured
                  ? `${fmt(elapsed)} recorded`
                  : `0:00 / ${fmt(maxSeconds)} max`}
            </div>
          </div>

          {captured && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginTop: 22,
                paddingTop: 20,
                borderTop: `2px solid ${lc.cardBorder}`,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={reRecord}
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: '#fff',
                  border: '2px solid #e2e9da',
                  color: '#5f6d58',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13.5,
                  padding: '12px 20px',
                  borderRadius: 14,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 0 #e2e9da',
                }}
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || tooShort}
                title={tooShort ? 'That was very short — try recording a bit more.' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: submitting || tooShort ? '#a8ddb9' : lc.green,
                  border: 0,
                  color: '#fff',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14,
                  padding: '13px 24px',
                  borderRadius: 14,
                  cursor: submitting || tooShort ? 'not-allowed' : 'pointer',
                  boxShadow: `0 5px 0 ${submitting || tooShort ? '#8fc9a1' : lc.greenDark}`,
                }}
              >
                {submitting ? SUBMIT_LOADING[loaderIdx] : 'Get my feedback'}
                {!submitting && <Icon id="ic-arrow" size={17} color="#fff" />}
              </button>
            </div>
          )}

          {tooShort && (
            <p style={{ textAlign: 'center', fontSize: 12.5, color: '#c0392b', fontWeight: 700, marginTop: 12 }}>
              That clip is under 5 seconds — there isn&apos;t enough to score. Give it another go.
            </p>
          )}

          {d.limit.allowed && d.limit.sessionsRemainingToday <= 3 && d.limit.sessionsRemainingToday < 9999 && (
            <p style={{ textAlign: 'center', fontSize: 12, color: lc.faint, fontWeight: 700, marginTop: 14 }}>
              {d.limit.sessionsRemainingToday} practice{' '}
              {d.limit.sessionsRemainingToday === 1 ? 'session' : 'sessions'} left today
            </p>
          )}
        </section>
      </main>

      {showUpgrade && <UpgradeModal reason={upgradeReason} onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}

function StepNum({ n }: { n: number }) {
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        background: lc.green,
        color: '#fff',
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        boxShadow: `0 3px 0 ${lc.greenDark}`,
      }}
    >
      {n}
    </span>
  )
}

function StepHead({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <StepNum n={n} />
      <div>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16.5, lineHeight: 1, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 12, color: lc.faint, fontWeight: 700, margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function AudioPlayer({
  audio,
  transcript,
}: {
  audio: ReturnType<typeof useSequentialAudio>
  transcript: string
}) {
  const pct = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0
  const t = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <>
      <div style={{ background: '#f6faf2', border: '2px solid #e6efdd', borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12, color: lc.muted, minWidth: 34 }}>
            {t(audio.currentTime)}
          </span>
          <span style={{ flex: 1, height: 8, background: '#e0e9d6', borderRadius: 5, overflow: 'hidden' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${pct}%`,
                background: lc.green,
                borderRadius: 5,
                transition: 'width .2s linear',
              }}
            />
          </span>
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12, color: lc.muted, minWidth: 34 }}>
            {t(audio.duration)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => audio.replay()}
            aria-label="Replay from the start"
            style={secBtn}
          >
            <Icon id="ic-clock" size={18} color="#5f6d58" />
          </button>
          <button
            type="button"
            onClick={() => (audio.isPlaying ? audio.pause() : audio.play())}
            aria-label={audio.isPlaying ? 'Pause' : 'Play'}
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: lc.green,
              border: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 0 ${lc.greenDark}`,
            }}
          >
            {audio.isPlaying ? (
              <span style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 6, height: 22, background: '#fff', borderRadius: 2 }} />
                <span style={{ width: 6, height: 22, background: '#fff', borderRadius: 2 }} />
              </span>
            ) : (
              <span
                style={{
                  width: 0,
                  height: 0,
                  marginLeft: 4,
                  borderTop: '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderLeft: '18px solid #fff',
                }}
              />
            )}
          </button>
          <button type="button" onClick={() => audio.skipForward()} aria-label="Skip forward" style={secBtn}>
            <Icon id="ic-arrow" size={18} color="#5f6d58" />
          </button>
        </div>
      </div>

      {transcript && (
        <div
          style={{
            marginTop: 16,
            background: '#fbfdf9',
            border: '2px solid #eef2e8',
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: '#a3b099',
              marginBottom: 6,
            }}
          >
            WHAT YOUR COACH SAID
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: lc.muted, fontWeight: 600, margin: 0 }}>{transcript}</p>
        </div>
      )}
    </>
  )
}

const secBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#fff',
  border: '2px solid #e2e9da',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 3px 0 #e2e9da',
}
