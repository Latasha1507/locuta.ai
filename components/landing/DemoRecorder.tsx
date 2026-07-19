'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from './tokens'
import { ButtonStyles } from '@/components/ui/Button'
import { pressable } from '@/components/ui/buttonSkins'
import { Icon } from '@/components/ui/icons'
import { PROMPTS } from '@/lib/quick-score'

// The hero micro-tool: record 30 seconds against a simple prompt, get one
// number back. The score is gated — you create a free account to reveal it and
// get a shareable card. This is the top of the growth loop, so it's the real
// thing (mic + scoring), not a simulation.

const MAX_SEC = 30
const WAVE_HEIGHTS = [30, 55, 80, 45, 95, 60, 100, 42, 78, 58, 88, 36, 70, 50, 84]

type Phase = 'idle' | 'recording' | 'scoring' | 'locked' | 'error'

/** Pick a container this browser can actually record. Safari can't do webm. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

const fmt = (s: number) => `0:${String(Math.max(0, Math.ceil(s))).padStart(2, '0')}`

export function DemoRecorder() {
  const [promptIdx, setPromptIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [token, setToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)

  // Randomise the prompt AFTER mount so server and client render the same first
  // paint (no hydration mismatch), then vary it.
  useEffect(() => {
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length))
  }, [])

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTick()
      stopTracks()
    }
  }, [clearTick, stopTracks])

  const prompt = PROMPTS[promptIdx]

  const shuffle = () => {
    if (phase === 'recording' || phase === 'scoring') return
    setPhase('idle')
    setToken(null)
    setErrorMsg('')
    setElapsed(0)
    // Advance by a random non-zero step so it always changes.
    setPromptIdx((i) => (i + 1 + Math.floor(Math.random() * (PROMPTS.length - 1))) % PROMPTS.length)
  }

  const submit = useCallback(
    async (blob: Blob, durationSec: number) => {
      setPhase('scoring')
      try {
        const fd = new FormData()
        const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
        fd.append('audio', blob, `rec.${ext}`)
        fd.append('promptId', String(prompt.id))
        fd.append('duration', String(Math.round(durationSec)))
        const res = await fetch('/api/quick-score', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.token) {
          setErrorMsg(data.message || 'Could not score that. Try again.')
          setPhase('error')
          return
        }
        setToken(data.token as string)
        setPhase('locked')
      } catch {
        setErrorMsg('Network error — try again.')
        setPhase('error')
      }
    },
    [prompt.id],
  )

  const stop = useCallback(() => {
    clearTick()
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [clearTick])

  const start = useCallback(async () => {
    if (phase === 'recording' || phase === 'scoring') return
    setErrorMsg('')
    setToken(null)
    setElapsed(0)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Recording is not supported in this browser.')
      setPhase('error')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setErrorMsg('Mic access is off. Allow the microphone and try again.')
      setPhase('error')
      return
    }
    streamRef.current = stream

    const mime = pickMimeType()
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    } catch {
      rec = new MediaRecorder(stream)
    }

    chunksRef.current = []
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const durationSec = Math.min(MAX_SEC, (Date.now() - startedAtRef.current) / 1000)
      const type = chunksRef.current[0]?.type || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      stopTracks()
      if (blob.size > 0 && durationSec >= 1) {
        submit(blob, durationSec)
      } else {
        setErrorMsg('That was too short — try again.')
        setPhase('error')
      }
    }

    recRef.current = rec
    startedAtRef.current = Date.now()
    rec.start()
    setPhase('recording')

    tickRef.current = setInterval(() => {
      const e = (Date.now() - startedAtRef.current) / 1000
      setElapsed(e)
      if (e >= MAX_SEC) stop()
    }, 100)
  }, [phase, stop, stopTracks, submit])

  const recording = phase === 'recording'
  const scoring = phase === 'scoring'
  const locked = phase === 'locked'
  const errored = phase === 'error'
  const remaining = Math.max(0, MAX_SEC - elapsed)
  // The reveal happens ON the dashboard so a new user's first screen is the
  // product with their score celebrated over it, not an isolated result page.
  const nextHref = token ? `/dashboard?score=${encodeURIComponent(token)}` : '/dashboard'

  const status = recording
    ? 'RECORDING…'
    : scoring
      ? 'SCORING…'
      : locked
        ? 'SCORE READY'
        : errored
          ? 'TRY AGAIN'
          : 'READY'
  const dotColor = recording ? lc.coral : locked ? lc.green : errored ? '#f2545b' : '#cdd6c6'

  return (
    <div
      className="w-full p-5 lg:p-6"
      style={{
        background: '#fff',
        border: `2px solid ${lc.cardBorder}`,
        borderRadius: 24,
        boxShadow: `0 8px 0 ${lc.cardBorder}`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              animation: recording ? 'lp-pop .6s ease infinite alternate' : undefined,
            }}
          />
          <span style={{ fontWeight: 800, fontSize: 12, color: lc.faint, letterSpacing: '0.03em' }}>{status}</span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#eef7e8',
            border: '2px solid #d7e8c8',
            padding: '4px 10px',
            borderRadius: 999,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 11,
            color: lc.greenDark,
            letterSpacing: '0.03em',
          }}
        >
          FREE · 30s
        </span>
      </div>

      {/* Pitch line */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 19, color: '#2c3a26', lineHeight: 1.15 }}>
          How do you actually sound?
        </div>
        <div style={{ fontSize: 13.5, color: lc.faint, fontWeight: 700, marginTop: 2 }}>
          Record 30 seconds. Get scored.
        </div>
      </div>

      {/* Prompt */}
      <div
        style={{
          background: '#f2f8ec',
          border: '2px solid #e2eed6',
          borderRadius: 16,
          padding: '15px 18px',
          marginBottom: 14,
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: -11,
            left: 14,
            background: lc.green,
            color: '#fff',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 10,
            padding: '3px 11px',
            borderRadius: 999,
            letterSpacing: '0.03em',
            boxShadow: `0 2px 0 ${lc.greenDark}`,
          }}
        >
          YOUR PROMPT
        </span>
        <div style={{ fontSize: 15, lineHeight: 1.4, color: '#5a6b52', fontWeight: 700, marginTop: 4 }}>
          &ldquo;{prompt.prompt}&rdquo;
        </div>
        {!recording && !scoring && (
          <button
            type="button"
            onClick={shuffle}
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: lc.green,
              fontWeight: 800,
              fontSize: 12.5,
            }}
          >
            <Icon name="star" size={13} color={lc.green} /> New topic
          </button>
        )}
      </div>

      {/* Waveform / countdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          height: 50,
          marginBottom: 16,
          position: 'relative',
        }}
        aria-hidden="true"
      >
        {WAVE_HEIGHTS.map((h, i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: Math.round(h * 0.4) + 8,
              borderRadius: 4,
              background: recording ? lc.green : scoring ? '#c7d6ba' : '#dbe4d2',
              transformOrigin: 'center',
              animation: recording
                ? `lp-wave ${(0.5 + (i % 5) * 0.11).toFixed(2)}s ease-in-out ${(i * 0.05).toFixed(2)}s infinite alternate`
                : undefined,
            }}
          />
        ))}
        {recording && (
          <span
            style={{
              position: 'absolute',
              right: 0,
              top: -2,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 13,
              color: lc.coral,
            }}
          >
            {fmt(remaining)}
          </span>
        )}
      </div>

      {/* Primary action by phase */}
      {locked ? (
        <LockedGate topic={prompt.topic} nextHref={nextHref} onRetry={shuffle} />
      ) : (
        <>
          <button
            className="lc-btn"
            type="button"
            onClick={recording ? stop : start}
            disabled={scoring}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: recording ? lc.coral : scoring ? '#b7c6ab' : lc.green,
              color: '#fff',
              border: 0,
              padding: 15,
              borderRadius: 16,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '0.02em',
              cursor: scoring ? 'default' : 'pointer',
              // The record button changes colour by state, so the 3D edge
              // underneath has to track it rather than use a fixed skin.
              ['--lc-edge' as string]: recording ? lc.coralDark : scoring ? '#9aab8e' : lc.greenDark,
              ['--lc-bg-hover' as string]: recording ? lc.coralDark : scoring ? '#9aab8e' : lc.greenDark,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                background: '#fff',
                borderRadius: recording ? 3 : '50%',
                animation: scoring ? 'lp-pop .7s ease infinite alternate' : undefined,
              }}
              aria-hidden="true"
            />
            {recording ? 'STOP & SCORE' : scoring ? 'SCORING YOUR VOICE…' : errored ? 'RECORD AGAIN' : 'RECORD 30 SECONDS'}
          </button>

          {errored ? (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: '#c65b52', fontWeight: 700 }}>
              {errorMsg}
            </div>
          ) : (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11.5, color: '#b0bca8', fontWeight: 600, lineHeight: 1.4 }}>
              We process your audio to score it and don&apos;t store the recording.
            </div>
          )}
        </>
      )}
    </div>
  )
}


function LockedGate({
  topic,
  nextHref,
  onRetry,
}: {
  topic: string
  nextHref: string
  onRetry: () => void
}) {
  const signupHref = `/auth/signup?next=${encodeURIComponent(nextHref)}`
  const loginHref = `/auth/login?next=${encodeURIComponent(nextHref)}`
  return (
    <div style={{ animation: 'lp-pop .4s ease both' }}>
      <div
        style={{
          background: '#fff8e6',
          border: '2px solid #ffe39c',
          borderRadius: 16,
          padding: '16px 16px 18px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: lc.yellow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            boxShadow: `0 4px 0 ${lc.yellowDark}`,
            transform: 'rotate(-6deg)',
          }}
        >
          <Icon name="star" size={26} color="#fff" />
        </div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, color: '#7a5b00' }}>
          Your score is ready
        </div>
        <div style={{ fontSize: 13, color: '#9a7b2e', fontWeight: 700, marginTop: 4, lineHeight: 1.4 }}>
          Create a free account to reveal your <strong>{topic}</strong> score, your full breakdown and bragging rights worth sharing.
        </div>

        <Link
          className={pressable('primary').className}
          href={signupHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 14,
            background: lc.green,
            color: '#fff',
            textDecoration: 'none',
            padding: 14,
            borderRadius: 14,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '0.02em',
            ...pressable('primary').style,
          }}
        >
          REVEAL MY SCORE →
        </Link>
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#9a7b2e', fontWeight: 700 }}>
          Already have an account?{' '}
          <Link href={loginHref} style={{ color: lc.greenDark, fontWeight: 800 }}>
            Log in
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          width: '100%',
          marginTop: 10,
          background: 'transparent',
          border: 0,
          padding: 6,
          cursor: 'pointer',
          color: lc.faint,
          fontWeight: 700,
          fontSize: 12.5,
        }}
      >
        Try a different prompt
      </button>
    </div>
  )
}
