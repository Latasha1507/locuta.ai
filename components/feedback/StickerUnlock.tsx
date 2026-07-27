'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Mascot } from '@/components/landing/Mascot'

// The reward moment. Fires only when a level is completed for the FIRST time.
// It is INTERACTIVE on purpose: the sticker sits on its backing paper and the
// user physically peels it — that tap is the payoff, and everything (burst,
// sparkles, confetti, haptic buzz, chime, the "You did it!" reveal) fires from
// it. A reward you passively watch is not a reward; one you claim is.

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.06,
  dur: 1.8 + ((i * 7) % 12) / 10,
  color: [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink][i % 7],
  size: 7 + ((i * 3) % 6),
  rot: (i * 47) % 360,
}))

// Sparkles that pop around the sticker the moment it peels. Fixed positions so
// the burst reads as designed rather than random. Purely decorative.
const SPARKS = [
  { x: -68, y: -36, size: 10, delay: 0.02, color: lc.yellow },
  { x: 60, y: -42, size: 8, delay: 0.12, color: lc.blue },
  { x: -76, y: 24, size: 8, delay: 0.2, color: lc.coral },
  { x: 70, y: 28, size: 10, delay: 0.08, color: lc.purple },
  { x: -14, y: -66, size: 9, delay: 0.26, color: lc.teal },
  { x: 24, y: 56, size: 7, delay: 0.16, color: lc.green },
  { x: 0, y: 66, size: 8, delay: 0.3, color: lc.yellow },
  { x: -54, y: 54, size: 7, delay: 0.34, color: lc.blue },
]

/** A short, pleasant "achievement" chime, synthesised so it needs no audio
    asset. Runs on the user's peel gesture (which also satisfies autoplay
    policy). Skipped under reduced-motion. */
function playPeelChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const now = ctx.currentTime
    // A rising major arpeggio — reads as "success".
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      const t = now + 0.04 + i * 0.075
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.22)
    })
    setTimeout(() => ctx.close().catch(() => {}), 900)
  } catch {
    /* audio unavailable — silent is fine */
  }
}

export function StickerUnlock({
  stickerIcon,
  stickerColor,
  dayLabel,
  streak,
  lessonTitle,
  onClose,
  nextHref,
  soundEnabled = true,
}: {
  stickerIcon: string
  stickerColor: string
  dayLabel: string
  streak: number
  lessonTitle: string
  onClose: () => void
  nextHref: string
  /** Gated by the user's "sound effects" setting. Defaults on. */
  soundEnabled?: boolean
}) {
  const [peeled, setPeeled] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const peel = useCallback(() => {
    setPeeled((was) => {
      if (was) return true
      if (!reduced && soundEnabled) playPeelChime()
      try {
        navigator.vibrate?.([12, 26, 14])
      } catch {
        /* no haptics — fine */
      }
      return true
    })
  }, [reduced, soundEnabled])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={peeled ? 'Sticker unlocked' : 'Peel your sticker'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(40, 55, 38, .55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        animation: 'lp-fade .25s ease both',
      }}
    >
      {/* Confetti — bursts only AFTER the peel, as the reward. */}
      {peeled && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: -20,
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 1.6,
                background: c.color,
                borderRadius: 2,
                transform: `rotate(${c.rot}deg)`,
                animation: `lp-confetti ${c.dur}s linear ${c.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] p-7 text-center"
        style={{
          position: 'relative',
          background: '#fff',
          border: `3px solid ${lc.cardBorder}`,
          borderRadius: 28,
          boxShadow: `0 10px 0 ${lc.cardBorder}`,
          animation: 'lp-pop .45s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: lc.greenDark,
            background: '#eafaef',
            border: '2px solid #c7edd2',
            padding: '5px 14px',
            borderRadius: 999,
            marginBottom: 16,
          }}
        >
          LEVEL COMPLETE
        </div>

        {/* The sticker on its backing paper. Tap it to peel. */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 6, height: 120, alignItems: 'center' }}>
          {/* backing paper — a soft empty slot the sticker peels off of (no
              cheap dashed outline). */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 16,
              width: 110,
              height: 110,
              borderRadius: 30,
              background: '#eef2e8',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,.07)',
            }}
          />

          {/* Pre-peel: a pulsing "tap me" ring. */}
          {!peeled && !reduced && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 116,
                height: 116,
                borderRadius: 32,
                border: `3px solid ${stickerColor}`,
                animation: 'lp-tap-pulse 1.5s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Post-peel: burst ring + sparkles. */}
          {peeled && (
            <>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: 124,
                  height: 124,
                  borderRadius: '50%',
                  border: `4px solid ${stickerColor}`,
                  animation: 'lp-burst .75s ease-out both',
                  pointerEvents: 'none',
                }}
              />
              {SPARKS.map((s, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: `calc(50% + ${s.y}px)`,
                    left: `calc(50% + ${s.x}px)`,
                    width: s.size,
                    height: s.size,
                    background: s.color,
                    borderRadius: 2,
                    animation: `lp-sparkle .9s ease-out ${s.delay}s both`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </>
          )}

          {/* The sticker itself — a real button so it's tappable AND keyboard
              operable. Disabled once peeled. */}
          <button
            type="button"
            onClick={peel}
            disabled={peeled}
            aria-label={peeled ? `${dayLabel} sticker, peeled` : 'Tap to peel your sticker'}
            style={{
              position: 'relative',
              width: 110,
              height: 110,
              borderRadius: 30,
              border: 0,
              padding: 7, // the white die-cut rim
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: peeled ? 'default' : 'pointer',
              // Peeled = lifted off the paper, so it gets a soft float shadow
              // (a deliberate deviation from the brand's hard-edge shadow — a
              // floating sticker needs real depth). Resting = chunky flat edge.
              boxShadow: peeled
                ? '0 16px 26px -8px rgba(0,0,0,.34), 0 3px 0 rgba(0,0,0,.06)'
                : '0 7px 0 rgba(0,0,0,.10)',
              animation: peeled
                ? 'lp-sticker-peel .85s cubic-bezier(.34,1.56,.64,1) both, lp-sticker-idle 2.8s ease-in-out .85s infinite'
                : reduced
                  ? undefined
                  : 'lp-sticker-land .5s cubic-bezier(.34,1.56,.64,1) both, lp-sticker-wait 2.4s ease-in-out .5s infinite',
            }}
          >
            {/* Glossy vinyl face. backgroundColor is the solid fallback if a
                browser doesn't support color-mix; backgroundImage layers the
                gradient on top when it does. */}
            <span
              style={{
                position: 'relative',
                display: 'flex',
                width: '100%',
                height: '100%',
                borderRadius: 23,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: stickerColor,
                backgroundImage: `linear-gradient(150deg, color-mix(in srgb, ${stickerColor} 74%, #fff) 0%, ${stickerColor} 50%, color-mix(in srgb, ${stickerColor} 84%, #000) 100%)`,
                boxShadow: 'inset 0 4px 8px rgba(255,255,255,.45), inset 0 -9px 14px rgba(0,0,0,.16)',
              }}
            >
              <Icon
                name={stickerIcon}
                size={50}
                color="#fff"
                style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }}
              />
              {/* soft top highlight — light hitting glossy vinyl */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -10,
                  left: -6,
                  right: -6,
                  height: '55%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,.42), transparent)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
              {/* gloss sweep (post-peel only) */}
              {peeled && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 40,
                    height: '100%',
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)',
                    animation: 'lp-shine 2.2s ease-in-out .85s infinite',
                  }}
                />
              )}
            </span>
          </button>
        </div>

        {/* PRE-PEEL: prompt to tap. POST-PEEL: the full celebration. */}
        {!peeled ? (
          <>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: '0.08em',
                color: lc.faint,
                margin: '4px 0 8px',
              }}
            >
              {dayLabel}&apos;S STICKER
            </div>
            <h2
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 24,
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                margin: '0 0 6px',
                color: lc.ink,
              }}
            >
              Tap to peel your reward
            </h2>
            <p style={{ fontSize: 14, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 4px' }}>
              You earned it — give it a press. 👆
            </p>
          </>
        ) : (
          <div style={{ animation: 'lp-rise .4s ease .15s both' }}>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: '0.08em',
                color: lc.faint,
                marginBottom: 12,
              }}
            >
              {dayLabel}&apos;S STICKER — PEELED
            </div>

            <h2
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 26,
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                margin: '0 0 8px',
                color: lc.ink,
              }}
            >
              You did it!
            </h2>
            <p style={{ fontSize: 14, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 18px' }}>
              <strong style={{ color: lc.ink }}>{lessonTitle}</strong> is complete, and today&apos;s sticker is yours.
            </p>

            {streak > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff3d6',
                  border: '2px solid #ffdb6e',
                  borderRadius: 999,
                  padding: '8px 16px',
                  marginBottom: 20,
                }}
              >
                <Icon name="flame" size={17} color={lc.orange} />
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: '#c07d08' }}>
                  {streak} day streak
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ transform: 'scale(.62)', transformOrigin: 'center', height: 76 }}>
                <Mascot mood="happy" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  background: lc.green,
                  color: '#fff',
                  border: 0,
                  padding: 14,
                  borderRadius: 15,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: 'pointer',
                  boxShadow: `0 5px 0 ${lc.greenDark}`,
                }}
              >
                <Icon name="target" size={16} color="#fff" />
                SEE MY FEEDBACK
              </button>
              <Link
                href={nextHref}
                style={{
                  display: 'block',
                  padding: 8,
                  textAlign: 'center',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  color: lc.faint,
                  textDecoration: 'none',
                }}
              >
                Skip to next lesson →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
