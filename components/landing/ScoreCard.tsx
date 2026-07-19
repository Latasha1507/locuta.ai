'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from './tokens'
import { Mascot } from './Mascot'
import { LandingIconSprite, Icon } from './icons'
import { scoreTier, metricColor, PACE_TARGET } from '@/lib/quick-score'
import { ShareActions } from './ShareActions'

// The result reveal. Used in two places:
//   • `variant="modal"` — the owner's celebratory pop-up over their dashboard
//   • `variant="page"`  — the public link a stranger opens
//
// DESIGN NOTES (this is a rewrite; the previous version had three real problems)
//
// 1. MIXED UNITS. It drew four identical bars, but two were 0–100 scores and
//    two were raw counts. "0 words" rendered as a FULL bar and "83 wpm" as a
//    half bar, so a user could not tell what good looked like. Now every bar is
//    the 0–100 sub-score, and the raw measurement moves into a caption that
//    also states the target ("83 wpm · aim 125–165").
//
// 2. INVERTED COLOUR. Filler was always coral, so a perfect zero-filler result
//    lit up a full red bar — the single best outcome looked like the worst.
//    Bars are now coloured by PERFORMANCE (metricColor), never by category.
//
// 3. NO HIERARCHY. Everything competed. The order is now strictly: who you are
//    (mascot) → the number → what it means (tier) → how you compare → the
//    breakdown → what to fix → share.

export interface ScoreCardProps {
  overall: number
  topic: string
  pace: number
  fluency: number
  flow: number
  content: number
  wpm: number
  filler: number
  restarts: number
  longPauses: number
  percentile?: number
  strengths: string[]
  improvements: string[]
  isOwner: boolean
  shareText: string
  shareUrl?: string
  variant?: 'page' | 'modal'
  onClose?: () => void
}

export function ScoreCard(p: ScoreCardProps) {
  const tier = scoreTier(p.overall)
  const isModal = p.variant === 'modal'
  const [reduced, setReduced] = useState(false)
  const [display, setDisplay] = useState(0)
  const [barsIn, setBarsIn] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  // Count the number up — this is the payoff moment, so it gets the animation.
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
      setDisplay(Math.round(p.overall * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // SAFETY NET: rAF is suspended while a tab is backgrounded, which would
    // leave the number stuck on 0 — the whole reveal silently broken.
    // setTimeout still fires there, so the real score always lands.
    const settle = setTimeout(() => setDisplay(p.overall), dur + 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [p.overall, reduced])

  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 180)
    return () => clearTimeout(t)
  }, [])

  // Confetti is the owner's reward only — strangers opening a shared link
  // haven't earned anything yet.
  useEffect(() => {
    if (!p.isOwner || reduced) return
    let cancelled = false
    import('canvas-confetti')
      .then((m) => {
        if (cancelled) return
        m.default({
          particleCount: p.overall >= 76 ? 160 : p.overall >= 55 ? 110 : 70,
          spread: 78,
          origin: { y: 0.3 },
          colors: ['#3fce6f', '#1cb0f6', '#ffc531', '#ff6f61', '#c774f0'],
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [p.isOwner, p.overall, reduced])

  // Every metric is a 0–100 sub-score (drives the bar) plus a plain-English
  // caption carrying the real measurement and, where it exists, the target.
  const metrics = [
    {
      label: 'Pace',
      score: p.pace,
      caption: `${p.wpm} wpm · aim for ${PACE_TARGET.min}–${PACE_TARGET.max}`,
    },
    {
      label: 'Fluency',
      score: p.fluency,
      caption:
        p.filler === 0 && p.restarts === 0
          ? 'No filler words, no stumbles'
          : `${p.filler} filler word${p.filler === 1 ? '' : 's'}${p.restarts > 0 ? ` · ${p.restarts} restart${p.restarts === 1 ? '' : 's'}` : ''}`,
    },
    {
      label: 'Flow',
      score: p.flow,
      caption:
        p.longPauses === 0
          ? 'No long pauses — you kept going'
          : `${p.longPauses} long pause${p.longPauses === 1 ? '' : 's'} mid-answer`,
    },
    { label: 'Content', score: p.content, caption: 'Substance and structure of your answer' },
  ]

  return (
    <div
      className="w-full p-5 sm:p-7"
      style={{
        maxWidth: 520,
        background: '#fff',
        border: `2px solid ${lc.cardBorder}`,
        borderRadius: 26,
        boxShadow: isModal ? '0 18px 50px rgba(20,40,16,.28)' : `0 10px 0 ${lc.cardBorder}`,
        position: 'relative',
      }}
    >
      <LandingIconSprite />

      {isModal && p.onClose && (
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'none',
            border: 0,
            fontSize: 26,
            lineHeight: 1,
            cursor: 'pointer',
            color: lc.faint,
          }}
        >
          ×
        </button>
      )}

      {/* ---- IDENTITY: mascot reacts to how it went ---- */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
        <Mascot mood={tier.mood} />
      </div>

      {/* ---- THE NUMBER ---- */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: lc.faint,
            marginBottom: 2,
          }}
        >
          YOUR 30-SECOND SCORE
        </div>
        <div
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 84,
            lineHeight: 1,
            letterSpacing: '-3px',
            color: tier.color,
          }}
        >
          {display}
        </div>
        <div style={{ fontSize: 12.5, color: lc.faint, fontWeight: 700, marginTop: 2 }}>out of 100</div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 12,
            background: `${tier.color}18`,
            border: `2px solid ${tier.color}`,
            color: tier.color,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14,
            padding: '7px 18px',
            borderRadius: 999,
          }}
        >
          <span aria-hidden="true">{tier.emoji}</span>
          {tier.label}
        </div>

        {/* Percentile is only ever rendered when it came from real data. */}
        {typeof p.percentile === 'number' && (
          <div style={{ fontSize: 14, color: lc.muted, fontWeight: 700, marginTop: 12 }}>
            You spoke better than{' '}
            <strong style={{ color: lc.ink, fontFamily: fontDisplay }}>{p.percentile}%</strong> of people
          </div>
        )}

        <div style={{ fontSize: 12.5, color: lc.faint, fontWeight: 700, marginTop: 8 }}>
          on “{p.topic}”
        </div>
      </div>

      {/* ---- BREAKDOWN ---- */}
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {metrics.map((m) => {
          const color = metricColor(m.score)
          return (
            <div key={m.label}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: lc.ink }}>
                  {m.label}
                </span>
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color }}>
                  {m.score}
                </span>
              </div>
              <div
                style={{
                  height: 9,
                  background: '#eef3e9',
                  borderRadius: 999,
                  overflow: 'hidden',
                  margin: '6px 0 5px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: barsIn ? `${m.score}%` : '0%',
                    background: color,
                    borderRadius: 999,
                    transition: 'width .8s cubic-bezier(.22,1,.36,1)',
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: lc.faint, fontWeight: 600 }}>{m.caption}</div>
            </div>
          )
        })}
      </div>

      {/* ---- COACHING — owner only ---- */}
      {p.isOwner && (p.strengths.length > 0 || p.improvements.length > 0) && (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {p.strengths.length > 0 && (
            <FeedbackBlock
              title="What you nailed"
              lines={p.strengths}
              color={lc.green}
              bg="#eefaf0"
              glyph="ic-check"
            />
          )}
          {p.improvements.length > 0 && (
            <FeedbackBlock
              title="Work on this next"
              lines={p.improvements}
              color="#c07d08"
              bg="#fff6e5"
              glyph="ic-arrow"
            />
          )}
        </div>
      )}

      {/* ---- SHARE / CTA ---- */}
      <div style={{ marginTop: 22 }}>
        {p.isOwner ? (
          <>
            <ShareActions shareText={p.shareText} url={p.shareUrl} />
            <p style={{ textAlign: 'center', fontSize: 11.5, color: lc.faint, fontWeight: 600, marginTop: 12 }}>
              Send it to someone who thinks they talk better than you.
            </p>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <Link
                href="/practice"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14,
                  color: lc.greenDark,
                  textDecoration: 'none',
                }}
              >
                <Icon id="ic-mic" size={16} color={lc.greenDark} />
                Want a better number? Start practising →
              </Link>
            </div>
          </>
        ) : (
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              background: lc.green,
              color: '#fff',
              padding: 16,
              borderRadius: 15,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: `0 5px 0 ${lc.greenDark}`,
            }}
          >
            <Icon id="ic-mic" size={18} color="#fff" />
            Think you can beat {p.overall}?
          </Link>
        )}
      </div>
    </div>
  )
}

function FeedbackBlock({
  title,
  lines,
  color,
  bg,
  glyph,
}: {
  title: string
  lines: string[]
  color: string
  bg: string
  glyph: string
}) {
  return (
    <div style={{ background: bg, borderRadius: 16, padding: '13px 15px' }}>
      <div
        style={{
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((l) => (
          <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                marginTop: 1,
              }}
            >
              <Icon id={glyph} size={10} color="#fff" />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#41503c', lineHeight: 1.4 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
