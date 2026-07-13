'use client'

import { useEffect, useRef, useState } from 'react'
import { lc, fontDisplay } from './tokens'
import { Icon } from './icons'

// Illustrative demo of the daily practice card (per the design handoff).
// It simulates a rep — it does not access the microphone. Real recording
// happens in the signed-in Practice flow.

const WAVE_HEIGHTS = [30, 55, 80, 45, 95, 60, 100, 42, 78, 58, 88, 36, 70, 50, 84]

// Product scores are out of 100 (pass thresholds are 70–75), so the demo
// shows /100 values — the prototype's "8.6" style was inconsistent with
// the Feedback screen's own "all scores out of 100" rule.
const DEMO_SCORES = [
  { label: 'Delivery', val: 86, color: lc.green },
  { label: 'Clarity', val: 91, color: lc.blue },
  { label: 'Confidence', val: 88, color: lc.purple },
]

export function DemoRecorder() {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'scored'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const start = () => {
    if (phase === 'recording') return
    setPhase('recording')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase('scored'), 1800)
  }

  const recording = phase === 'recording'
  const scored = phase === 'scored'
  const status = recording ? 'RECORDING…' : scored ? 'GREAT REP!' : 'READY'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: recording ? lc.coral : scored ? lc.green : '#cdd6c6',
              display: 'inline-block',
            }}
          />
          <span style={{ fontWeight: 800, fontSize: 12, color: lc.faint, letterSpacing: '0.03em' }}>{status}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#fff3d6',
            border: '2px solid #ffdb6e',
            padding: '5px 11px',
            borderRadius: 999,
          }}
        >
          <Icon id="ic-flame" size={14} color={lc.orange} />
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: '#c07d08' }}>12</span>
        </div>
      </div>

      <div
        style={{
          background: '#f2f8ec',
          border: '2px solid #e2eed6',
          borderRadius: 16,
          padding: '15px 18px',
          marginBottom: 16,
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
          TODAY&apos;S PROMPT
        </span>
        <div style={{ fontSize: 15, lineHeight: 1.4, color: '#5a6b52', fontWeight: 700, marginTop: 4 }}>
          &ldquo;Tell us about a challenge you overcame.&rdquo;
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          height: 50,
          marginBottom: 18,
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
              background: recording ? lc.green : '#dbe4d2',
              transformOrigin: 'center',
              animation: recording
                ? `lp-wave ${(0.5 + (i % 5) * 0.11).toFixed(2)}s ease-in-out ${(i * 0.05).toFixed(2)}s infinite alternate`
                : undefined,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={start}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: recording ? lc.coral : lc.green,
          color: '#fff',
          border: 0,
          padding: 15,
          borderRadius: 16,
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '0.02em',
          cursor: 'pointer',
          boxShadow: `0 5px 0 ${recording ? lc.coralDark : lc.greenDark}`,
        }}
      >
        <span
          style={{
            width: 13,
            height: 13,
            background: '#fff',
            borderRadius: recording ? 3 : '50%',
          }}
          aria-hidden="true"
        />
        {recording ? 'LISTENING…' : scored ? 'TRY THE DEMO AGAIN' : 'TRY A DEMO REP'}
      </button>

      {scored ? (
        <>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              background: '#fff3d6',
              border: '2px solid #ffdb6e',
              color: '#a06a00',
              borderRadius: 14,
              padding: '10px 12px',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.01em',
              animation: 'lp-pop .4s ease both',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: lc.yellow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                boxShadow: `0 3px 0 ${lc.yellowDark}`,
                transform: 'rotate(-8deg)',
              }}
            >
              <Icon id="ic-star" size={20} color="#fff" />
            </span>
            <span>You earned today&apos;s sticker!</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
            {DEMO_SCORES.map((s, i) => (
              <div
                key={s.label}
                style={{
                  background: '#f6faf2',
                  border: `2px solid ${lc.cardBorder}`,
                  borderRadius: 14,
                  padding: '11px 8px',
                  textAlign: 'center',
                  animation: `lp-pop .4s ease ${(i * 0.09 + 0.1).toFixed(2)}s both`,
                }}
              >
                <div style={{ fontSize: 11, color: lc.faint, fontWeight: 800, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 23, color: s.color }}>{s.val}</div>
                <div style={{ height: 6, background: '#eef2e8', borderRadius: 5, marginTop: 7, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.val}%`, background: s.color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: '#b0bca8', fontWeight: 700 }}>
          Tap to see how a rep works ↑
        </div>
      )}
    </div>
  )
}
