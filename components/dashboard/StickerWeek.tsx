'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import type { WeekDay } from '@/lib/streaks'

const STICKER_ICONS = ['mic', 'star', 'chat', 'flame', 'bulb', 'gift', 'crown']
const STICKER_COLORS = [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink]
const TILTS = [-5, 4, -3, 5, -4, 3, -2]

const HINTS: Record<string, string> = {
  done: 'Earned! Nice work.',
  today: "Today's sticker — go get it!",
  missed: 'Missed this one. It happens.',
  upcoming: 'Locked until this day.',
}

export function StickerWeek({ week, nextHref }: { week: WeekDay[]; nextHref: string }) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)

  // Stagger the peel-in only after mount, so the animation actually plays
  // instead of being baked into the server HTML.
  useEffect(() => setMounted(true), [])

  const doneCount = week.filter((w) => w.state === 'done').length
  const perfectWeek = doneCount === 7

  return (
    <div
      className="flex flex-col items-center justify-between gap-5 p-[22px] text-center lg:flex-row lg:gap-[30px] lg:px-8 lg:py-[26px] lg:text-left"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
        border: `2px solid ${perfectWeek ? lc.yellow : lc.cardBorder}`,
        borderRadius: 24,
        boxShadow: `0 5px 0 ${perfectWeek ? lc.yellowDark : lc.cardBorder}`,
      }}
    >
      {/* Sweep of light across the card when the week is complete. */}
      {perfectWeek && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 80,
            height: '100%',
            background: 'linear-gradient(90deg,transparent,rgba(255,197,49,.28),transparent)',
            animation: 'lp-shine 2.6s ease-in-out infinite',
          }}
        />
      )}

      <div style={{ flex: 'none', position: 'relative', zIndex: 1 }}>
        <h3
          className="text-[20px] lg:text-[24px]"
          style={{ fontFamily: fontDisplay, fontWeight: 800, lineHeight: 1.05, margin: 0 }}
        >
          {perfectWeek ? 'Perfect week!' : "This week's stickers"}
        </h3>
        <p style={{ fontSize: 13.5, color: lc.muted, fontWeight: 600, margin: '7px 0 0', maxWidth: 290 }}>
          {perfectWeek
            ? 'Seven for seven. You showed up every single day — that rare crown is yours.'
            : 'Finish one rep a day to peel that day’s sticker. Fill the week to unlock a rare one'}
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            background: '#f6faf2',
            border: `2px solid ${lc.cardBorder}`,
            borderRadius: 999,
            padding: '5px 12px',
          }}
        >
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: lc.greenDark }}>
            {doneCount}/7
          </span>
          <span style={{ display: 'flex', gap: 3 }} aria-hidden="true">
            {week.map((w) => (
              <span
                key={w.key}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: w.state === 'done' ? lc.green : '#dde5d6',
                }}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 lg:flex-nowrap lg:gap-[13px]" style={{ zIndex: 1 }}>
        {week.map((w, i) => {
          const color = STICKER_COLORS[i]
          const tilt = TILTS[i]
          const isHovered = hovered === i
          const done = w.state === 'done'
          const today = w.state === 'today'
          const missed = w.state === 'missed'

          let box: React.CSSProperties
          let fg: string
          let labelColor: string

          if (done) {
            box = { background: color, boxShadow: '0 4px 0 rgba(0,0,0,.13)' }
            fg = '#fff'
            labelColor = lc.muted
          } else if (today) {
            box = { background: '#eafaef', border: `2px dashed ${lc.green}` }
            fg = lc.green
            labelColor = lc.green
          } else if (missed) {
            box = { background: '#faf6f5', border: '2px dashed #e8d5d1' }
            fg = '#dcc7c2'
            labelColor = '#c7b3ae'
          } else {
            box = { background: '#f4f7f0', border: '2px dashed #d3ddc8' }
            fg = '#c2cdb6'
            labelColor = '#b5c2aa'
          }

          // Animation: peel in on mount (staggered), wiggle on hover if earned,
          // pulse ring on today, shake on hover if missed/locked.
          let animation: string | undefined
          if (!mounted) {
            animation = undefined
          } else if (isHovered && done) {
            animation = 'lp-wiggle .45s ease-in-out'
          } else if (isHovered && !done && !today) {
            animation = 'lp-shake .3s ease-in-out'
          } else if (today) {
            animation = 'lp-ring 2s ease-out infinite'
          }

          const inner = (
            <span
              className="h-[48px] w-[48px] lg:h-[56px] lg:w-[56px]"
              style={
                {
                  ...box,
                  '--lp-tilt': `${done ? tilt : 0}deg`,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: done
                    ? `rotate(${tilt}deg) scale(${isHovered ? 1.12 : 1})`
                    : `scale(${isHovered ? 1.06 : 1})`,
                  transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)',
                  animation: mounted && !isHovered && !today ? undefined : animation,
                  cursor: today ? 'pointer' : 'default',
                } as React.CSSProperties
              }
            >
              <Icon name={STICKER_ICONS[i]} size={22} color={fg} />
            </span>
          )

          return (
            <div
              key={w.key}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 7,
                animation: mounted ? `lp-peel .5s cubic-bezier(.34,1.56,.64,1) ${i * 0.07}s both` : undefined,
                opacity: mounted ? undefined : 0,
              }}
            >
              {/* Today's sticker is the primary action — make it clickable. */}
              {today ? (
                <Link href={nextHref} aria-label="Start today's practice to earn this sticker">
                  {inner}
                </Link>
              ) : (
                inner
              )}

              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, color: labelColor }}>
                {w.day}
              </span>

              {/* Tooltip */}
              {isHovered && (
                <span
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: lc.ink,
                    color: '#fff',
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 9,
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                    pointerEvents: 'none',
                    animation: 'lp-rise .16s ease both',
                  }}
                >
                  {HINTS[w.state]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
