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
import { Icon } from '@/components/ui/icons'
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
  /** Optional: a lesson row may have no example, and older callers may not pass
      it. Defensive so a missing prop can never fail the build or the render. */
  practiceExample?: string
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

  const [introLoading, setIntroLoading] = useState(false)
  const [loaderIdx, setLoaderIdx] = useState(0)
  const [introAudio, setIntroAudio] = useState('')
  const [greetingAudio, setGreetingAudio] = useState('')
  const [introTranscript, setIntroTranscript] = useState('')
  const [greetingText, setGreetingText] = useState('')
  // Worked example arrives with the coach audio. Seeded from the server prop so
  // it can render instantly when already known.
  const [coachExample, setCoachExample] = useState(d.practiceExample || '')

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

  const loadIntro = useCallback(async () => {
    setIntroLoading(true)
    try {
      // The server can't know the user's timezone, so the client computes its
      // own time-of-day for the "Good morning/afternoon/evening" greeting.
      const h = new Date().getHours()
      const daypart = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
      const res = await fetch('/api/lesson-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: d.tone,
          categoryId: d.categoryId,
          moduleId: d.moduleId,
          lessonId: d.lessonId,
          daypart,
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
      // Prefer the streaming URL. base64 is only there for legacy rows or if
      // the Storage upload failed — it can't stream, so it's the slow path.
      setGreetingAudio(data.greetingAudioUrl || data.greetingAudio || '')
      setIntroAudio(data.audioUrl || data.audioBase64 || '')
      setIntroTranscript(data.transcript || '')
      setGreetingText(data.greetingText || '')
      // Keep the FIRST example for the whole session. The server seeds one and
      // this intro fetch can return a different one — swapping it mid-session is
      // what made the "Here's one way to do it" example look like it rotated.
      if (data.practice_example) setCoachExample((cur) => cur || data.practice_example)
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
  }, [d.tone, d.categoryId, d.moduleId, d.lessonId])

  // Fetch the coach briefing IN THE BACKGROUND as soon as the page opens.
  // The task and the record button are already on screen (server-rendered), so
  // this never blocks anyone: you can read the task and start recording while
  // the audio is still being fetched. Previously this sat behind a
  // "PLAY MY COACH BRIEFING" button and every user paid an 8-15s wait before
  // they could do anything.
  const introStarted = useRef(false)
  useEffect(() => {
    if (introStarted.current) return
    introStarted.current = true
    void loadIntro()
  }, [loadIntro])

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
        submittingRef.current = false
        setSubmitting(false)
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
      // DELIBERATELY leave `submitting` true here. router.push() only STARTS
      // the navigation — the feedback page still has to render on the server.
      // Resetting the flag flips the button back to "Get my feedback" while
      // we're mid-navigation, which made people click a second time and submit
      // a DUPLICATE session (another Whisper + GPT-4o charge, and another slot
      // off their daily limit). The loading state now holds until this
      // component unmounts on navigation.
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
      // Only re-enable on failure, so they can retry.
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Teaching content, in priority order:
  //   1. lesson_explanation from the DB  — instant, server-rendered, canonical
  //   2. the AI coach transcript         — fallback if a lesson row has no
  //                                        explanation (content gap)
  // The task alone is NOT a lesson: asking someone to perform "Show Don't Tell"
  // without telling them what it means is how you lose a user on lesson one.

  const recording = rec === 'recording'
  const captured = rec === 'done' && !!audioBlob
  const tooShort = captured && elapsed < 5
  const mood: MascotMood = recording ? 'shy' : captured ? 'cheer' : 'happy'

  const statusLabel = recording ? 'RECORDING' : captured ? 'CAPTURED' : 'READY'
  const statusBg = recording ? lc.coral : captured ? lc.green : '#eef2e8'
  const statusFg = recording || captured ? '#fff' : '#8a9a80'

  return (
    <div className="min-h-screen" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      {/* Page micro-interactions. The user spends most of their time here, so
          the surfaces should feel alive without being distracting — cards ease
          in on load, the coach card breathes a soft aura while audio plays, and
          the mic has a live pulse. No celebration/confetti: that belongs on the
          feedback page, not here. All disabled under prefers-reduced-motion. */}
      <style>{`
        @keyframes pv-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .lsn-card{animation:pv-in .4s cubic-bezier(.2,.7,.3,1) both}
        .lsn-card:nth-of-type(1){animation-delay:.02s}
        .lsn-card:nth-of-type(2){animation-delay:.09s}
        .lsn-card:nth-of-type(3){animation-delay:.16s}
        /* Coach card gently glows while its audio is actually playing — a
           "someone is speaking to you" cue, tied to real state, not decoration. */
        @keyframes pv-aura{0%,100%{box-shadow:0 5px 0 ${lc.cardBorder},0 0 0 0 rgba(63,206,111,.0)}50%{box-shadow:0 5px 0 ${lc.cardBorder},0 0 22px 0 rgba(63,206,111,.22)}}
        .pv-speaking{animation:pv-aura 2.4s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){
          .lsn-card,.pv-speaking{animation:none}
        }
      `}</style>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-4 pb-6 pt-3 lg:gap-3 lg:px-8 lg:pb-5 lg:pt-4">
        {/* HEADER */}
        <div
          className="flex items-center gap-4 p-3 lg:px-6 lg:py-3"
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
            <Icon name="arrow" size={18} color={lc.greenDark} />
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow + tone on ONE line so the header is two lines, not three.
                The coach pill sat under the title before, forcing extra height. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: '#7fa98a',
                }}
              >
                {d.categoryName.toUpperCase()} · MODULE {d.moduleId} · LESSON {d.lessonId}
              </span>
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
                  padding: '2px 9px',
                  borderRadius: 999,
                }}
              >
                <Icon name="chat" size={11} color={lc.greenDark} />
                {d.tone} coach
              </span>
            </div>
            <h1
              className="text-[19px] lg:text-[23px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.1, margin: '4px 0 0' }}
            >
              {d.lessonTitle}
            </h1>
          </div>

          <div className="hidden shrink-0 sm:block" style={{ transform: 'scale(.5)', transformOrigin: 'center right', margin: '-14px 0' }}>
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

        {/* Two columns on desktop: everything you need (task + mic) is on one
            screen, no scrolling. Stacks on mobile. */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-4">

        {/* LEFT COLUMN — listen. Just the coach: hear the lesson in your coach's
            voice. Everything you act on (example, task, mic) is on the right. */}
        <div className="flex flex-col gap-3 lg:gap-4">

        {/* 1 — COACH AUDIO (top of the left column). Loads by itself; a quiet
            placeholder shows while it comes, never a button to press first. */}
        <section
          className={`lsn-card p-[18px] lg:p-6${audio.isPlaying ? ' pv-speaking' : ''}`}
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <StepHead
            icon="chat"
            title={greetingText ? greetingText : `Your ${d.tone} coach`}
            subtitle={greetingText ? `A quick word from your ${d.tone} coach, then the lesson.` : `Press play to hear this lesson in your ${d.tone} coach's voice.`}
          />

          {introTranscript || audio.duration > 0 ? (
            <AudioPlayer audio={audio} transcript={introTranscript} />
          ) : introLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f6faf2',
                border: `2px solid ${lc.cardBorder}`,
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `3px solid ${lc.cardBorder}`,
                  borderTopColor: lc.green,
                  animation: 'lp-spin .8s linear infinite',
                  flex: 'none',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: lc.muted }}>
                {INTRO_LOADING[loaderIdx]} — you can start recording without it.
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#f6faf2',
                border: `2px solid ${lc.cardBorder}`,
                borderRadius: 16,
                padding: '12px 16px',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: lc.muted }}>
                Coach audio didn&apos;t load. The written lesson below still works.
              </span>
              <button
                type="button"
                onClick={() => void loadIntro()}
                style={{
                  background: '#fff',
                  border: `2px solid ${lc.cardBorder}`,
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 12,
                  color: lc.greenDark,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Retry
              </button>
            </div>
          )}
        </section>


        </div>

        {/* RIGHT COLUMN — everything the user acts on: example, then task, then mic */}
        <div className="lg:sticky lg:top-4 flex flex-col gap-2.5 lg:gap-3">

        {/* EXAMPLE (top of the right column) — a model answer at the learner's own
            level and in their coach's tone, so they see an achievable target
            before they read the task and record. */}
        {(coachExample || introLoading) && (
          <section
            className="lsn-card p-[18px] lg:px-6 lg:py-5"
            style={{
              background: 'linear-gradient(135deg,#f3f9ff,#eef5ff)',
              border: '2px solid #d5e6fb',
              borderRadius: 20,
              boxShadow: '0 5px 0 #dce9fb',
            }}
          >
            <StepHead icon="star" iconColor={lc.blue} title="Here's one way to do it" subtitle="A model answer for this task — yours can be totally different." />
            {coachExample ? (
              <div
                style={{
                  position: 'relative',
                  marginTop: 4,
                  padding: '12px 14px 12px 18px',
                  background: '#fff',
                  border: '2px solid #dcecfb',
                  borderRadius: 14,
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: '#3c4f63',
                  fontStyle: 'italic',
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: lc.blue }} />
                {coachExample}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, color: lc.faint, fontWeight: 700, fontSize: 13 }}>
                <span
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `3px solid #d5e6fb`, borderTopColor: lc.blue,
                    animation: 'lp-spin .8s linear infinite', flex: 'none',
                  }}
                />
                Writing an example for you…
              </div>
            )}
          </section>
        )}

        {/* TASK — below the example, directly above the mic so the instruction and button
            to answer it are one glance apart. Server-rendered, on screen the
            instant the page paints. */}
        <section
          className="lsn-card p-[18px] lg:px-6 lg:py-5"
          style={{ background: '#eef8ea', border: '2px solid #cfe9c6', borderRadius: 20, boxShadow: '0 5px 0 #d8ecd0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon name="target" size={20} color={lc.greenDark} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', color: lc.greenDark }}>
              YOUR TASK
            </span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: '#6d8a66' }}>
              <Icon name="clock" size={12} color="#6d8a66" />
              ~{d.expectedDurationSec}s
            </span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#33482e', fontWeight: 700, margin: 0 }}>
            {d.practicePrompt}
          </p>
        </section>

        {/* RECORD */}
        <section
          className="p-[18px] lg:px-6 lg:py-4"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <StepNum n={1} />
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, margin: '2px 0 10px' }}
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={toggleRecord}
              disabled={submitting || blocked}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              style={{
                position: 'relative',
                width: 76,
                height: 76,
                borderRadius: '50%',
                border: 0,
                cursor: submitting ? 'not-allowed' : 'pointer',
                background: recording ? lc.coral : lc.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 5px 0 ${recording ? lc.coralDark : lc.greenDark}`,
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
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: '#fff' }} />
                ) : (
                  <Icon name="mic" size={28} color="#fff" />
                )}
              </span>
            </button>

            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 22,
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
                {!submitting && <Icon name="arrow" size={17} color="#fff" />}
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
        </div>
        </div>
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

function StepHead({ n, icon, iconColor, title, subtitle }: { n?: number; icon?: string; iconColor?: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      {typeof n === 'number' ? (
        <StepNum n={n} />
      ) : (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: iconColor ? `${iconColor}1c` : '#eef4e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Icon name={icon ?? 'chat'} size={17} color={iconColor ?? lc.greenDark} />
        </span>
      )}
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
            <Icon name="clock" size={18} color="#5f6d58" />
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
            <Icon name="arrow" size={18} color="#5f6d58" />
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
