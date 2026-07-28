'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Mascot } from '@/components/landing/Mascot'

// The reward moment. Fires only when a level is completed for the FIRST time —
// a sticker you already own is not a reward, and celebrating a re-run would
// cheapen the real thing.
//
// WHY WEB ANIMATIONS API (not CSS keyframes):
// The app's globals.css has a blanket `prefers-reduced-motion` rule that forces
// `animation-duration: 0.01ms !important` on EVERY element. That rule silently
// killed this whole celebration whenever a user (or the founder testing) had
// Reduce Motion on — the card just appeared dead-static. CSS `!important`
// governs CSS animations only; it does NOT touch element.animate(). So driving
// the celebration through WAAPI makes it immune to that global override, and
// lets us branch cleanly: full show when motion is allowed, a gentle
// non-looping fade when it isn't (reduced, not removed).

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 90, // ms
  dur: 1900 + ((i * 7) % 12) * 100, // ms
  color: [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink][i % 7],
  size: 7 + ((i * 3) % 6),
  rot: (i * 47) % 360,
}))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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
  const reduce = typeof window !== 'undefined' ? prefersReducedMotion() : false

  const overlayRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const stickerRef = useRef<HTMLSpanElement | null>(null)
  const shineRef = useRef<HTMLSpanElement | null>(null)
  const confettiRef = useRef<HTMLDivElement | null>(null)

  // The whole celebration, driven imperatively so a global CSS rule can't
  // disable it. Guarded by feature-detect on el.animate for old browsers,
  // where it degrades to instantly-visible (still correct, just no motion).
  useEffect(() => {
    const supportsWAAPI = typeof Element !== 'undefined' && 'animate' in Element.prototype
    if (!supportsWAAPI) return

    const easeBack = 'cubic-bezier(.34,1.56,.64,1)'

    // Overlay: an opacity fade is reduce-motion-safe (no transform, no loop),
    // so it runs in both modes — it just appears a touch faster when reduced.
    overlayRef.current?.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: reduce ? 120 : 250, easing: 'ease', fill: 'both' },
    )

    if (reduce) {
      // REDUCED: one gentle, non-looping reveal. No bounce, no confetti,
      // no infinite shine — just a soft fade + tiny scale so the moment
      // still registers for motion-sensitive users.
      cardRef.current?.animate(
        [
          { opacity: 0, transform: 'scale(.97)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 220, easing: 'ease-out', fill: 'both' },
      )
      stickerRef.current?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 260, easing: 'ease-out', fill: 'both' },
      )
      return
    }

    // FULL SHOW ----------------------------------------------------------

    // Card pops in with a slight overshoot.
    cardRef.current?.animate(
      [
        { transform: 'scale(.5)', opacity: 0, offset: 0 },
        { transform: 'scale(1.08)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1, offset: 1 },
      ],
      { duration: 450, easing: easeBack, fill: 'both' },
    )

    // Sticker lands (scales up from nothing with a rotate), then — once that
    // settles — peels off the backing paper and rests slightly tilted.
    const sticker = stickerRef.current
    if (sticker) {
      const land = sticker.animate(
        [
          { transform: 'scale(0) rotate(-30deg)', opacity: 0, offset: 0 },
          { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 1 },
        ],
        { duration: 500, easing: easeBack, fill: 'both' },
      )
      land.onfinish = () => {
        sticker.animate(
          [
            { transform: 'translate(0,0) rotate(0deg) scale(1)', offset: 0 },
            { transform: 'translate(3px,-9px) rotate(-7deg) scale(1.07)', offset: 0.45 },
            { transform: 'translate(0,-5px) rotate(-4deg) scale(1.04)', offset: 1 },
          ],
          { duration: 800, easing: easeBack, fill: 'forwards' },
        )
      }
    }

    // Gloss sweep across the sticker, looping.
    shineRef.current?.animate(
      [
        { transform: 'translateX(-120%) rotate(18deg)' },
        { transform: 'translateX(320%) rotate(18deg)' },
      ],
      { duration: 2200, delay: 800, easing: 'ease-in-out', iterations: Infinity },
    )

    // Confetti: each piece falls the height of the screen while tumbling,
    // fading out, on its own stagger — looping so it keeps raining while the
    // popup is open.
    const pieces = confettiRef.current?.children
    if (pieces) {
      Array.from(pieces).forEach((el, i) => {
        const c = CONFETTI[i]
        ;(el as HTMLElement).animate(
          [
            { transform: `translateY(-20px) rotate(${c.rot}deg)`, opacity: 1 },
            { transform: `translateY(105vh) rotate(${c.rot + 720}deg)`, opacity: 0 },
          ],
          { duration: c.dur, delay: c.delay, easing: 'linear', iterations: Infinity },
        )
      })
    }
  }, [reduce])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
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
      }}
    >
      {/* Confetti — only rendered when full motion is allowed; under reduce
          motion it's suppressed entirely (this is the vestibular-trigger stuff
          reduce-motion exists to stop). */}
      {!reduce && (
        <div ref={confettiRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
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
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] p-7 text-center"
        style={{
          position: 'relative',
          background: '#fff',
          border: `3px solid ${lc.cardBorder}`,
          borderRadius: 28,
          boxShadow: `0 10px 0 ${lc.cardBorder}`,
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
            ref={stickerRef}
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
              {!reduce && (
                <span
                  ref={shineRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 40,
                    height: '100%',
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)',
                    transform: 'translateX(-120%) rotate(18deg)',
                  }}
                />
              )}
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
            <Mascot mood="cheer" />
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