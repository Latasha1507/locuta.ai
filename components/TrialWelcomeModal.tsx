'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Mascot } from '@/components/landing/Mascot'

// Shown once, in the first minutes of a brand-new trial. This is the
// "your free trial just started" moment from the design — chunky-3D, on-brand,
// not the old slate/emoji modal.
interface TrialWelcomeModalProps {
  onClose: () => void
  daysLeft?: number
}

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 41) % 100,
  delay: (i % 8) * 0.1,
  dur: 1.9 + ((i * 7) % 12) / 10,
  color: [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink][i % 7],
  size: 7 + ((i * 3) % 6),
  rot: (i * 47) % 360,
}))

export default function TrialWelcomeModal({ onClose, daysLeft = 14 }: TrialWelcomeModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Free trial started"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(40,55,38,.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        fontFamily: fontBody,
        animation: 'lp-fade .25s ease both',
      }}
    >
      <LandingIconSprite />

      {/* confetti */}
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
        className="w-full max-w-[400px] p-7 text-center"
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
          FREE TRIAL STARTED
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
          You&apos;re in!
        </h2>
        <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 18px' }}>
          Your <strong style={{ color: lc.ink }}>{daysLeft}-day free trial</strong> is live. Up to 10 practice
          sessions a day, no card needed. Let&apos;s get your first rep done.
        </p>

        {/* what's included */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left', marginBottom: 22 }}>
          {[
            { icon: 'ic-mic', text: 'Up to 10 sessions every day' },
            { icon: 'ic-chat', text: 'All 6 coaches to practise with' },
            { icon: 'ic-flame', text: 'Daily streaks & stickers' },
          ].map((f) => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: '#eafaef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                <Icon id={f.icon} size={16} color={lc.green} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4a5645' }}>{f.text}</span>
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
            background: lc.green,
            color: '#fff',
            padding: 15,
            borderRadius: 15,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 15,
            textDecoration: 'none',
            boxShadow: `0 5px 0 ${lc.greenDark}`,
          }}
        >
          <Icon id="ic-mic" size={18} color="#fff" />
          START MY FIRST REP
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
          Look around first
        </button>
      </div>
    </div>
  )
}
