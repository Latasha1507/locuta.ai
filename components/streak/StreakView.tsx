'use client'

import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Mascot } from '@/components/landing/Mascot'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import type { WeekDay, CalendarCell } from '@/lib/streaks'

export interface StreakData {
  isAdmin: boolean
  promo: FounderPromo | null
  streak: number
  longestStreak: number
  totalDays: number
  practicedToday: boolean
  week: WeekDay[]
  monthLabel: string
  calendar: CalendarCell[]
  stickersThisWeek: number
  totalStickers: number
  nextHref: string
}

const WEEK_ICONS = ['ic-mic', 'ic-star', 'ic-chat', 'ic-flame', 'ic-bulb', 'ic-gift', 'ic-crown']
const WEEK_COLORS = [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink]

export function StreakView(d: StreakData) {
  const heroLine = d.streak === 0
    ? "Let's light the first flame."
    : d.practicedToday
      ? 'Today is locked in. Keep it rolling!'
      : "Don't break it now — one rep keeps it alive."

  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}
    >
      <LandingIconSprite />
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-12 pt-5 lg:gap-5 lg:px-10 lg:pb-16 lg:pt-8">
        {/* HERO */}
        <div
          className="flex items-center justify-between gap-5 overflow-hidden p-6 lg:px-9 lg:py-7"
          style={{
            position: 'relative',
            background: d.practicedToday
              ? 'linear-gradient(135deg,#fff0d4,#ffe0b3)'
              : 'linear-gradient(135deg,#eafaef,#dff5e6)',
            border: `2px solid ${d.practicedToday ? '#ffd591' : '#cdeacf'}`,
            borderRadius: 26,
            boxShadow: `0 6px 0 ${d.practicedToday ? '#eec583' : '#d4ead2'}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#fff',
                border: '2px solid #ffdb6e',
                borderRadius: 999,
                padding: '6px 14px',
                marginBottom: 16,
              }}
            >
              <Icon id="ic-flame" size={16} color={lc.orange} />
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5, color: '#c07d08' }}>
                {d.practicedToday ? 'PRACTISED TODAY' : 'STREAK ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                className="text-[52px] lg:text-[64px]"
                style={{ fontFamily: fontDisplay, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: lc.ink }}
              >
                {d.streak}
              </span>
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, color: '#c07d08' }}>
                day{d.streak === 1 ? '' : 's'}
              </span>
            </div>
            <p style={{ fontSize: 14.5, color: '#5f6d58', fontWeight: 700, margin: '10px 0 18px' }}>{heroLine}</p>
            {!d.practicedToday && (
              <Link
                href={d.nextHref}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  background: lc.green,
                  color: '#fff',
                  padding: '13px 22px',
                  borderRadius: 14,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: 'none',
                  boxShadow: `0 5px 0 ${lc.greenDark}`,
                }}
              >
                <Icon id="ic-mic" size={17} color="#fff" />
                KEEP IT ALIVE
              </Link>
            )}
          </div>
          <div className="hidden shrink-0 lg:block">
            <Mascot mood={d.practicedToday ? 'cheer' : 'happy'} />
          </div>
        </div>

        {/* STAT STRIP */}
        <div className="grid grid-cols-3 gap-3 lg:gap-[18px]">
          {[
            { label: 'Current', value: d.streak, icon: 'ic-flame', color: lc.coral, suffix: 'day' },
            { label: 'Longest ever', value: d.longestStreak, icon: 'ic-crown', color: lc.yellow, suffix: 'day' },
            { label: 'Total days', value: d.totalDays, icon: 'ic-check', color: lc.green, suffix: '' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 p-4 lg:p-[18px]"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 18, boxShadow: `0 4px 0 ${lc.cardBorder}` }}
            >
              <span
                className="hidden sm:flex"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: s.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                  boxShadow: '0 3px 0 rgba(0,0,0,.12)',
                }}
              >
                <Icon id={s.icon} size={22} color="#fff" />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, color: lc.faint, fontWeight: 800 }}>{s.label}</span>
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: lc.ink }}>
                  {s.value}
                  {s.suffix ? <span style={{ fontSize: 12.5, color: lc.faint }}> {s.suffix}{s.value === 1 ? '' : 's'}</span> : null}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1fr]">
          {/* THIS WEEK */}
          <section
            className="p-5 lg:p-6"
            style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
          >
            <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>This week</h2>
            <p style={{ fontSize: 13, color: lc.muted, fontWeight: 600, margin: '0 0 18px' }}>
              {d.stickersThisWeek} of 7 days done
            </p>
            <div className="flex justify-between gap-1.5">
              {d.week.map((w, i) => {
                const done = w.state === 'done'
                const today = w.state === 'today'
                return (
                  <div key={w.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 46,
                        aspectRatio: '1',
                        borderRadius: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: done ? WEEK_COLORS[i] : today ? '#eafaef' : '#f4f7f0',
                        border: today ? `2px dashed ${lc.green}` : done ? 'none' : '2px dashed #d3ddc8',
                        boxShadow: done ? '0 3px 0 rgba(0,0,0,.12)' : 'none',
                      }}
                    >
                      <Icon id={WEEK_ICONS[i]} size={19} color={done ? '#fff' : today ? lc.green : '#c2cdb6'} />
                    </div>
                    <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 10.5, color: today ? lc.green : lc.faint }}>
                      {w.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* MONTHLY ACTIVITY */}
          <section
            className="p-5 lg:p-6"
            style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
          >
            <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>Monthly activity</h2>
            <p style={{ fontSize: 13, color: lc.muted, fontWeight: 600, margin: '0 0 16px' }}>{d.monthLabel}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((h, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: lc.faint, paddingBottom: 3 }}>
                  {h}
                </div>
              ))}
              {d.calendar.map((c, i) => (
                <div
                  key={i}
                  title={c.key ?? undefined}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    background: c.day === null ? 'transparent' : c.practiced ? lc.green : c.isToday ? '#eafaef' : '#f4f7f0',
                    border: c.isToday && !c.practiced ? `2px solid ${lc.green}` : 'none',
                    color: c.practiced ? '#fff' : c.isFuture ? '#cbd5c0' : lc.faint,
                  }}
                >
                  {c.day ?? ''}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* STICKER COLLECTION */}
        <section
          className="p-5 lg:p-6"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, margin: 0 }}>Your sticker crew</h2>
              <p style={{ fontSize: 13, color: lc.muted, fontWeight: 600, margin: '4px 0 0' }}>
                {d.totalStickers} earned so far — one for every day you show up
              </p>
            </div>
            <span
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 20,
                color: lc.greenDark,
                background: '#eafaef',
                border: '2px solid #c7edd2',
                borderRadius: 14,
                padding: '8px 16px',
              }}
            >
              {d.totalStickers}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9">
            {Array.from({ length: 18 }).map((_, i) => {
              const earned = i < d.totalStickers
              const color = WEEK_COLORS[i % WEEK_COLORS.length]
              const icon = WEEK_ICONS[i % WEEK_ICONS.length]
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: earned ? color : '#f4f7f0',
                    border: earned ? 'none' : '2px dashed #d3ddc8',
                    boxShadow: earned ? '0 4px 0 rgba(0,0,0,.12)' : 'none',
                    transform: earned ? `rotate(${[-5, 4, -3, 5, -2, 3][i % 6]}deg)` : 'none',
                    opacity: earned ? 1 : 0.6,
                  }}
                >
                  <Icon id={earned ? icon : 'ic-lock'} size={22} color={earned ? '#fff' : '#c2cdb6'} />
                </div>
              )
            })}
          </div>
          {d.totalStickers > 18 && (
            <p style={{ fontSize: 12.5, color: lc.faint, fontWeight: 700, margin: '14px 0 0', textAlign: 'center' }}>
              + {d.totalStickers - 18} more in the collection
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
