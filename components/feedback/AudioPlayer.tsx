'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'

// The compare player on the feedback screen.
//
// The previous version drew the SAME 40-bar sawtooth for every clip, so both
// players looked identical and nothing about the picture belonged to the audio.
// This one decodes the real file and draws its actual amplitude envelope, so
// your recording and the coach's look genuinely different — and you can see
// your pauses and your loud/quiet stretches.
//
// Styling follows the live chunky-3D system: hard zero-blur offset shadows,
// sage neutrals (never pure grey), Baloo 2 at heavy weights, pill/circle radii,
// and the `.lc-ctl` press mechanic + `:focus-visible` ring from globals.css.

const BARS = 56
const SPEEDS = [1, 1.25, 0.75] as const

/** Deterministic, speech-shaped fallback used when the audio can't be decoded
    (CORS, unsupported codec, offline). Seeded from `src` so two players never
    render the same pattern. */
function fallbackPeaks(src: string): number[] {
  let h = 2166136261
  for (let i = 0; i < src.length; i++) h = Math.imul(h ^ src.charCodeAt(i), 16777619) >>> 0
  const out: number[] = []
  for (let i = 0; i < BARS; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const r = (h % 1000) / 1000
    const envelope = 0.5 + 0.5 * Math.sin((i / BARS) * Math.PI)
    out.push(Math.max(0.14, Math.min(1, (0.28 + r * 0.72) * envelope)))
  }
  return out
}

/** Decode the real audio into BARS amplitude peaks. Returns null while loading
    or if decoding fails, so the caller can fall back. */
function useWaveform(src: string): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false
    let ctx: AudioContext | null = null

    void (async () => {
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error('fetch failed')
        const buf = await res.arrayBuffer()
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new Ctor()
        const decoded = await ctx.decodeAudioData(buf)
        const raw = decoded.getChannelData(0)
        const block = Math.max(1, Math.floor(raw.length / BARS))
        const out: number[] = []
        for (let i = 0; i < BARS; i++) {
          let sum = 0
          for (let j = 0; j < block; j++) sum += Math.abs(raw[i * block + j] ?? 0)
          out.push(sum / block)
        }
        const max = Math.max(...out, 1e-6)
        // Gamma-corrected so quiet speech is still visible rather than a flat line.
        if (!cancelled) setPeaks(out.map((v) => Math.max(0.12, Math.min(1, (v / max) ** 0.7))))
      } catch {
        if (!cancelled) setPeaks(null)
      } finally {
        if (ctx && ctx.state !== 'closed') void ctx.close()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [src])

  return peaks
}

export function AudioPlayer({
  src,
  accent,
  accentDark,
  label,
  onActivate,
}: {
  src: string
  accent: string
  accentDark: string
  /** Used for the accessible names, e.g. "your recording". */
  label: string
  onActivate?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [reduced, setReduced] = useState(false)

  const decoded = useWaveform(src)
  const peaks = decoded ?? fallbackPeaks(src)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
  const progress = dur > 0 ? time / dur : 0

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      onActivate?.()
      void a.play()
    } else {
      a.pause()
    }
  }, [onActivate])

  const seekTo = useCallback(
    (t: number) => {
      const a = audioRef.current
      if (!a || !dur) return
      const v = Math.min(dur, Math.max(0, t))
      a.currentTime = v
      setTime(v)
    },
    [dur],
  )

  const restart = () => {
    onActivate?.()
    seekTo(0)
    void audioRef.current?.play()
  }

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const onSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      seekTo(time + 5)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      seekTo(time - 5)
    } else if (e.key === 'Home') {
      e.preventDefault()
      seekTo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      seekTo(dur)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      toggle()
    }
  }

  const headIdx = Math.round(progress * (BARS - 1))

  return (
    <div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true)
          onActivate?.()
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
      />

      {/* WAVEFORM — the real amplitude envelope, and the scrubber. Keyboard
          operable: ←/→ seek 5s, Home/End jump, Space/Enter play-pause. */}
      <div
        className="lc-seek"
        role="slider"
        tabIndex={0}
        aria-label={`Seek ${label}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${fmt(time)} of ${dur ? fmt(dur) : 'unknown'}`}
        onKeyDown={onSeekKey}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          seekTo(((e.clientX - r.left) / r.width) * dur)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 62,
          padding: '0 2px',
          cursor: 'pointer',
          background: '#f7faf4',
          border: '2px solid #e8ece2',
          marginBottom: 10,
        }}
      >
        {peaks.map((p, i) => {
          const played = i <= headIdx && progress > 0
          const isHead = playing && i === headIdx
          return (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(8, p * 100)}%`,
                minWidth: 2,
                borderRadius: 3,
                background: played ? accent : '#dbe4d2',
                transform: isHead && !reduced ? 'scaleY(1.18)' : 'none',
                transition: reduced ? undefined : 'background .12s linear, transform .12s ease',
              }}
            />
          )
        })}
      </div>

      {/* TIMES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5, color: lc.muted }}>
          {fmt(time)}
        </span>
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5, color: lc.faint }}>
          {dur ? fmt(dur) : '–:––'}
        </span>
      </div>

      {/* CONTROLS — restart · play/pause · speed. 44px+ touch targets. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="lc-ctl"
          onClick={restart}
          aria-label={`Restart ${label}`}
          title="Restart"
          style={{
            width: 46,
            height: 46,
            flex: 'none',
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="replay" size={19} color={accentDark} />
        </button>

        <button
          type="button"
          className="lc-ctl"
          onClick={toggle}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          style={{
            flex: 1,
            height: 46,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            borderRadius: 999,
            background: accent,
            color: '#fff',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '0.02em',
            // The 3D edge under a coloured face is that colour's dark variant.
            ['--lc-edge' as string]: accentDark,
          }}
        >
          {playing ? (
            <>
              <span
                aria-hidden="true"
                style={{ width: 11, height: 13, borderRadius: 2, background: '#fff', boxShadow: 'inset 4px 0 0 #fff' }}
              />
              Pause
            </>
          ) : (
            <>
              <Icon name="play" size={17} color="#fff" />
              Play
            </>
          )}
        </button>

        <button
          type="button"
          className="lc-ctl"
          onClick={cycleSpeed}
          aria-label={`Playback speed for ${label}, currently ${SPEEDS[speedIdx]} times`}
          title="Playback speed"
          style={{
            height: 46,
            flex: 'none',
            padding: '0 14px',
            borderRadius: 999,
            background: '#fff',
            color: lc.muted,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {SPEEDS[speedIdx]}×
        </button>
      </div>
    </div>
  )
}
