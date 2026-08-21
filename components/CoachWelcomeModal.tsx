'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Mascot } from '@/components/landing/Mascot'

// Shown once when a complimentary-coach account first lands on the dashboard.
// Purple-accented to match the coach status pill, so it reads as its own thing
// — not a normal trial welcome.
interface CoachWelcomeModalProps {
  onClose: () => void
  firstName: string
  daysLeft: number
  sessionsRemaining: number
  cap: number
}

const PURPLE = '#6d3fce'
const PURPLE_DARK = '#552fa6'
const PURPLE_SOFT = '#f2ecfd'
const PURPLE_BORDER = '#ddccf7'

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 41) % 100,
  delay: (i % 8) * 0.1,
  dur: 1.9 + ((i * 7) % 12) / 10,
  color: [PURPLE, lc.yellow, lc.blue, lc.coral, lc.green, lc.teal, lc.pink][i % 7],
  size: 7 + ((i * 3) % 6),
  rot: (i * 47) % 360,
}))

export default function CoachWelcomeModal({
  onClose,
  firstName,
  daysLeft,
  sessionsRemaining,
  cap,
}: CoachWelcomeModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const name = firstName?.trim() || 'coach'

  const features = [
    { icon: 'book', text: 'All 6 paths & every lesson unlocked' },
    { icon: 'mic', text: `${sessionsRemaining} of ${cap} practice sessions to explore` },
    { icon: 'flame', text: `${daysLeft} days of full complimentary access` },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Coach access unlocked"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(40,38,55,.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        fontFamily: fontBody,
        animation: 'lp-fade .25s ease both',
      }}
    >
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
        className="w-full max-w-[420px] p-7 text-center"
        style={{
          position: 'relative',
          background: '#fff',
          border: `3px solid ${PURPLE_BORDER}`,
          borderRadius: 28,
          boxShadow: `0 10px 0 ${PURPLE_BORDER}`,
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
            color: PURPLE,
            background: PURPLE_SOFT,
            border: `2px solid ${PURPLE_BORDER}`,
            padding: '5px 14px',
            borderRadius: 999,
            marginBottom: 16,
          }}
        >
          COMPLIMENTARY COACH ACCESS
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <Mascot mood="cheer" />
        </div>

        <h2
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 27,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
            margin: '6px 0 8px',
            color: lc.ink,
          }}
        >
          Welcome, {name}!
        </h2>
        <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 18px' }}>
          You&apos;ve got <strong style={{ color: lc.ink }}>full access to the whole of Locuta</strong> — every path and
          lesson unlocked, so you can explore exactly what your students would experience.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left', marginBottom: 22 }}>
          {features.map((f) => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: PURPLE_SOFT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                <Icon name={f.icon} size={16} color={PURPLE} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4a4553' }}>{f.text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/practice"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            background: PURPLE,
            color: '#fff',
            padding: 15,
            borderRadius: 15,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 15,
            textDecoration: 'none',
            boxShadow: `0 5px 0 ${PURPLE_DARK}`,
          }}
        >
          <Icon name="mic" size={18} color="#fff" />
          START EXPLORING
        </Link>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 10,
            background: 'none',
            border: 0,
            padding: 8,
            cursor: 'pointer',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 13,
            color: lc.faint,
          }}
        >
          Browse the paths first
        </button>
      </div>
    </div>
  )
}
