'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Mascot } from '@/components/landing/Mascot'

// The reward moment. Fires only when a level is completed for the FIRST time —
// a sticker you already own is not a reward, and celebrating a re-run would
// cheapen the real thing.

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.09,
  dur: 1.9 + ((i * 7) % 12) / 10,
  color: [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink][i % 7],
  size: 7 + ((i * 3) % 6),
  rot: (i * 47) % 360,
}))

export function StickerUnlock({
  stickerIcon,
  stickerColor,
  dayLabel,
  streak,
  lessonTitle,
  onClose,
  nextHref,
}: {
  stickerIcon: string
  stickerColor: string
  dayLabel: string
  streak: number
  lessonTitle: string
  onClose: () => void
  nextHref: string
}) {
  const [peeled, setPeeled] = useState(false)

  // Peel it after a beat so the user sees it land, then lift.
  useEffect(() => {
    const t = setTimeout(() => setPeeled(true), 550)
    return () => clearTimeout(t)
  }, [])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Auto-reveal the feedback after the celebration plays. The popup sits ON TOP
  // of the already-rendered feedback, so requiring a "SEE MY FEEDBACK" tap made
  // reaching the feedback a needless second click. It still auto-dismisses; the
  // buttons remain for anyone who wants to reveal it sooner or skip ahead.
  useEffect(() => {
    const t = setTimeout(onClose, 3400)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New sticker unlocked"
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
      {/* Confetti */}
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

        {/* The sticker: lands, then peels off the backing paper */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          {/* backing paper */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 6,
              width: 104,
              height: 104,
              borderRadius: 26,
              background: '#f1f5ec',
              border: '2px dashed #d7e0cd',
            }}
          />
          <span
            style={{
              position: 'relative',
              width: 104,
              height: 104,
              borderRadius: 26,
              background: stickerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 7px 0 rgba(0,0,0,.16)`,
              animation: peeled
                ? 'lp-sticker-peel .8s cubic-bezier(.34,1.56,.64,1) both, lp-sticker-idle 2.8s ease-in-out .8s infinite'
                : 'lp-sticker-land .5s cubic-bezier(.34,1.56,.64,1) both',
            }}
          >
            <Icon name={stickerIcon} size={52} color="#fff" />
            {/* gloss sweep */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 26,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 40,
                  height: '100%',
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)',
                  animation: 'lp-shine 2.2s ease-in-out .8s infinite',
                }}
              />
            </span>
          </span>
        </div>

        <div
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '0.08em',
            color: lc.faint,
            marginBottom: 14,
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
          {/* Primary = SEE MY FEEDBACK. The user just recorded; the thing they
              actually want is to see how they did, not to skip past it. This
              button dismisses the popup, revealing the full feedback already
              rendered behind it. "Next lesson" stays available but quiet — it's
              the action for *after* they've read their feedback. */}
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
    </div>
  )
}
