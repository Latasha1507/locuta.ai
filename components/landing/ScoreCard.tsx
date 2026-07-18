'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from './tokens'
import { paceScore, scoreTier } from '@/lib/quick-score'
import { ShareActions } from './ShareActions'

// The result screen — built to feel like a game "results" card, not a form.
// A confetti pop, the number counting up, and bars filling in make the reveal
// the fun moment. Feedback (strengths/level-ups) is shown ONLY to the owner;
// strangers who open a shared link see the number, the breakdown and a
// "beat this" CTA.
//
// LAYOUT: horizontal on desktop — score panel on the left, breakdown + feedback
// on the right, sharing across the full width underneath. This mirrors the
// landscape share image and kills the tall dead-space column. Below `md` it
// stacks (score → breakdown → feedback → share), which is the only order that
// works on a phone.

export interface ScoreCardProps {
  overall: number
  topic: string
  clarity: number
  confidence: number
  wpm: number
  filler: number
  strengths: string[]
  improvements: string[]
  isOwner: boolean
  shareText: string
}

/** Rough 0–100 "goodness" for the filler bar (fewer = better). Label shows the
    real count; this just drives the bar width. */
function fillerBar(filler: number): number {
  return Math.max(20, 100 - filler * 12)
}

export function ScoreCard(p: ScoreCardProps) {
  const tier = scoreTier(p.overall)
  const [reduced, setReduced] = useState(false)
  const [display, setDisplay] = useState(0)
  const [barsIn, setBarsIn] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  // Count the number up on reveal.
  useEffect(() => {
    if (reduced) {
      setDisplay(p.overall)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 1100
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(p.overall * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // SAFETY NET: requestAnimationFrame is suspended entirely while a tab is
    // backgrounded or the renderer is throttled — without this the number would
    // sit on 0 forever and the reveal (the whole payoff) silently breaks.
    // setTimeout still fires in that state, so the real score always lands.
    const settle = setTimeout(() => setDisplay(p.overall), dur + 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [p.overall, reduced])

  // Fill the bars a beat after mount.
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 160)
    return () => clearTimeout(t)
  }, [])

  // Confetti — the owner's reward. Dynamic import keeps it out of SSR.
  useEffect(() => {
    if (!p.isOwner || reduced) return
    let cancelled = false
    import('canvas-confetti')
      .then((m) => {
        if (cancelled) return
        const count = p.overall >= 75 ? 160 : p.overall >= 55 ? 110 : 70
        m.default({
          particleCount: count,
          spread: 78,
          origin: { y: 0.35 },
          colors: ['#3fce6f', '#1cb0f6', '#ffc531', '#ff6f61', '#c774f0'],
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [p.isOwner, p.overall, reduced])

  const dims = [
    { label: 'Clarity', value: p.clarity, display: String(p.clarity), color: lc.purple },
    { label: 'Confidence', value: p.confidence, display: String(p.confidence), color: lc.green },
    { label: 'Pace', value: paceScore(p.wpm), display: `${p.wpm} wpm`, color: lc.blue },
    { label: 'Filler', value: fillerBar(p.filler), display: `${p.filler} word${p.filler === 1 ? '' : 's'}`, color: lc.coral },
  ]

  return (
    <>
      <div
        className="w-full p-5 sm:p-6 md:p-7"
        style={{
          maxWidth: 900,
          background: '#fff',
          border: `2px solid ${lc.cardBorder}`,
          borderRadius: 26,
          boxShadow: `0 10px 0 ${lc.cardBorder}`,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:gap-7">
          {/* LEFT — the score */}
          <div
            className="md:col-span-2"
            style={{
              background: `${tier.color}12`,
              border: `2px solid ${tier.color}33`,
              borderRadius: 20,
              padding: '20px 16px 22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: lc.faint, letterSpacing: '0.07em' }}>
              30-SECOND SPEAKING TEST
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: tier.color,
                color: '#fff',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 13,
                padding: '5px 14px',
                borderRadius: 999,
                marginTop: 12,
                boxShadow: '0 3px 0 rgba(0,0,0,0.12)',
              }}
            >
              <span style={{ fontSize: 15 }}>{tier.emoji}</span> {tier.label}
            </div>

            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 'clamp(76px, 13vw, 104px)',
                lineHeight: 1,
                color: tier.color,
                marginTop: 8,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {display}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: lc.faint, marginTop: 2 }}>out of 100</div>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 23,
                color: '#2c3a26',
                marginTop: 12,
                lineHeight: 1.15,
              }}
            >
              {p.topic}
            </div>
          </div>

          {/* RIGHT — breakdown + feedback */}
          <div className="md:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dims.map((d) => (
                <div key={d.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: lc.ink }}>{d.label}</span>
                    <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, color: d.color }}>
                      {d.display}
                    </span>
                  </div>
                  <div style={{ height: 9, background: '#eef2e8', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: barsIn ? `${d.value}%` : '0%',
                        background: d.color,
                        borderRadius: 6,
                        transition: reduced ? undefined : 'width .9s cubic-bezier(.22,1,.36,1)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {p.isOwner && (
              <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 12 }}>
                <FeedbackBlock
                  title="What you nailed"
                  items={p.strengths}
                  tint="#eef7e8"
                  border="#d7e8c8"
                  chip={lc.green}
                  glyph="✓"
                />
                <FeedbackBlock
                  title="Level up"
                  items={p.improvements}
                  tint="#fff8e6"
                  border="#ffe39c"
                  chip={lc.orange}
                  glyph="↑"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sharing — full width under the split */}
        <div style={{ marginTop: 20 }}>
          <ShareActions shareText={p.shareText} />
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: 22, textAlign: 'center' }}>
        {p.isOwner ? (
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 16,
              color: lc.greenDark,
              textDecoration: 'none',
            }}
          >
            Want to fix it? Start practising →
          </Link>
        ) : (
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: lc.green,
              color: '#fff',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
              padding: '15px 26px',
              borderRadius: 16,
              boxShadow: `0 6px 0 ${lc.greenDark}`,
            }}
          >
            Think you can beat {p.overall}? Take the free test →
          </Link>
        )}
      </div>
    </>
  )
}

function FeedbackBlock({
  title,
  items,
  tint,
  border,
  chip,
  glyph,
}: {
  title: string
  items: string[]
  tint: string
  border: string
  chip: string
  glyph: string
}) {
  if (!items.length) return null
  return (
    <div style={{ background: tint, border: `2px solid ${border}`, borderRadius: 16, padding: '13px 15px' }}>
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: '#4b5a43', marginBottom: 9 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                width: 20,
                height: 20,
                flex: 'none',
                borderRadius: 7,
                background: chip,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {glyph}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#43513c', lineHeight: 1.3 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
