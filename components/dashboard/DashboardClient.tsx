'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Mixpanel from '@/lib/mixpanel'
import TrialWelcomeModal from '@/components/TrialWelcomeModal'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Sidebar } from './Sidebar'
import { HeroMascot } from './HeroMascot'
import { StickerWeek } from './StickerWeek'
import { StatCard, type StatTile } from './StatCard'
import type { FounderPromo } from './SidebarPromo'
import type { WeekDay } from '@/lib/streaks'

export interface CategoryStat {
  id: string
  name: string
  desc: string
  icon: string
  color: string
  total: number
  completed: number
  pct: number
  bestScore: number
}

export interface DashboardData {
  firstName: string
  initial: string
  isAdmin: boolean
  streak: number
  practicedToday: boolean
  stickers: WeekDay[]
  stickersThisWeek: number
  lessonsCompleted: number
  lessonsTotal: number
  bestScore: number
  categories: CategoryStat[]
  nextHref: string
  showWelcome: boolean
  trial: { active: boolean; daysLeft: number } | null
  promo: FounderPromo | null
  userId: string
}

export function DashboardClient(d: DashboardData) {
  const [showWelcome, setShowWelcome] = useState(d.showWelcome)

  useEffect(() => {
    try {
      Mixpanel.identify(d.userId)
      Mixpanel.track('Dashboard Viewed', {
        streak: d.streak,
        lessons_completed: d.lessonsCompleted,
        practiced_today: d.practicedToday,
      })
    } catch {
      // Analytics must never break the page.
    }
  }, [d.userId, d.streak, d.lessonsCompleted, d.practicedToday])

  const isNewUser = d.lessonsCompleted === 0

  const stats: StatTile[] = [
    {
      label: 'Current streak',
      value: d.streak,
      hint: d.streak === 0 ? 'Start today to begin' : d.practicedToday ? 'Alive and well' : 'Practice today to keep it',
      icon: 'flame',
      color: lc.coral,
      warm: true,
      delay: 0,
    },
    {
      label: 'Lessons complete',
      value: d.lessonsCompleted,
      suffix: ` / ${d.lessonsTotal}`,
      hint: isNewUser ? 'Every expert started at 0' : 'Keep going',
      icon: 'book',
      color: lc.blue,
      delay: 0.06,
    },
    {
      label: 'Stickers this week',
      value: d.stickersThisWeek,
      suffix: ' / 7',
      hint: d.stickersThisWeek === 0 ? 'Your collection awaits' : 'Nice collection',
      icon: 'star',
      color: lc.yellow,
      delay: 0.12,
    },
    {
      label: 'Best score',
      value: d.bestScore > 0 ? d.bestScore : null,
      placeholder: '—',
      hint: d.bestScore > 0 ? 'Out of 100' : 'Record your first rep',
      icon: 'crown',
      color: lc.green,
      delay: 0.18,
    },
  ]

  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}
    >
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-9 pt-5 lg:gap-[22px] lg:px-10 lg:pb-11 lg:pt-[30px]">
        {/* TOP BAR */}
        <div className="flex flex-wrap items-start justify-between gap-4 lg:items-center">
          <div>
            <h1
              className="text-[26px] lg:text-[32px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.05, margin: 0 }}
            >
              Welcome back, {d.firstName} <Icon name="wave" size={26} color="#3fce6f" style={{ display: 'inline-block', verticalAlign: '-4px' }} />
            </h1>
            <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, margin: '4px 0 0' }}>
              Ready to improve your speaking skills today?
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {d.trial?.active && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: '#eafaef',
                  border: '2px solid #c7edd2',
                  padding: '8px 13px',
                  borderRadius: 999,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  color: lc.greenDark,
                  whiteSpace: 'nowrap',
                }}
              >
                {d.trial.daysLeft} {d.trial.daysLeft === 1 ? 'day' : 'days'} left
              </span>
            )}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: '#fff3d6',
                border: '2px solid #ffdb6e',
                padding: '8px 13px',
                borderRadius: 999,
              }}
              title={`${d.streak} day streak`}
            >
              <Icon name="flame" size={17} color={lc.orange} />
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: '#c07d08' }}>
                {d.streak}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: lc.green,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 18,
                boxShadow: `0 3px 0 ${lc.greenDark}`,
                flex: 'none',
              }}
            >
              {d.initial}
            </span>
          </div>
        </div>

        {/* HERO */}
        <div
          className="flex items-center justify-between gap-6 p-6 lg:px-9 lg:py-8"
          style={{
            background: 'linear-gradient(135deg,#eafaef,#dff5e6)',
            border: '2px solid #cdeacf',
            borderRadius: 26,
            boxShadow: '0 6px 0 #d4ead2',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-block',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11.5,
                letterSpacing: '0.12em',
                color: lc.greenDark,
                background: '#fff',
                border: '2px solid #c7edd2',
                padding: '5px 13px',
                borderRadius: 999,
                marginBottom: 16,
              }}
            >
              {d.practicedToday
                ? '✦ TODAY: DONE'
                : isNewUser
                  ? "✦ DAY 1 · LET'S BEGIN"
                  : `✦ DAY ${d.streak + 1} · YOUR TURN`}
            </div>
            <h2
              className="text-[28px] lg:text-[38px]"
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.8px',
                margin: '0 0 18px',
              }}
            >
              {d.practicedToday ? (
                <>
                  Today&apos;s rep is done.
                  <br />
                  Sticker earned.
                </>
              ) : isNewUser ? (
                <>
                  Your first rep is
                  <br />
                  waiting for you.
                </>
              ) : (
                <>
                  Keep the streak
                  <br />
                  alive today.
                </>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-[14px]">
              <Link
                href={d.nextHref}
                style={{
                  background: d.practicedToday ? '#fff' : lc.green,
                  color: d.practicedToday ? lc.greenDark : '#fff',
                  border: d.practicedToday ? '2px solid #c7edd2' : 0,
                  padding: '15px 24px',
                  borderRadius: 15,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14.5,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: `0 5px 0 ${d.practicedToday ? '#d4ead2' : lc.greenDark}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon name="mic" size={19} color={d.practicedToday ? lc.greenDark : '#fff'} />
                {d.practicedToday ? 'PRACTICE AGAIN' : isNewUser ? 'START YOUR FIRST REP' : "START TODAY'S PRACTICE"}
              </Link>
              <span style={{ fontSize: 13, color: '#5f6d58', fontWeight: 700 }}>
                {d.practicedToday
                  ? 'Extra reps still sharpen you'
                  : isNewUser
                    ? '60 seconds · earn your first sticker 🌟'
                    : '60 seconds · keep your flame lit'}
              </span>
            </div>
          </div>
          <div className="hidden shrink-0 pr-2 lg:block">
            <HeroMascot practicedToday={d.practicedToday} isNewUser={isNewUser} />
          </div>
        </div>

        {/* STAT TILES */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-[18px]">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* WEEKLY STICKERS */}
        <StickerWeek week={d.stickers} nextHref={d.nextHref} />

        {/* CATEGORIES */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
          <h3
            className="text-[20px] lg:text-[26px]"
            style={{ fontFamily: fontDisplay, fontWeight: 800, margin: 0 }}
          >
            Choose your practice path
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]">
          {d.categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}/modules`}
              className="p-5 transition-transform duration-200 hover:-translate-y-[5px] lg:p-6"
              style={{
                background: '#fff',
                border: `2px solid ${lc.cardBorder}`,
                borderRadius: 22,
                boxShadow: `0 5px 0 ${lc.cardBorder}`,
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 0 rgba(0,0,0,.13)',
                  }}
                >
                  <Icon name={c.icon} size={28} color="#fff" />
                </span>
                {c.completed > 0 && (
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 11,
                      color: lc.greenDark,
                      background: '#e7f8ec',
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {c.pct}%
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 18,
                  color: lc.ink,
                  margin: '16px 0 5px',
                  lineHeight: 1.1,
                }}
              >
                {c.name}
              </div>
              <div
                style={{ fontSize: 12.5, color: lc.muted, lineHeight: 1.5, fontWeight: 600, minHeight: 36 }}
              >
                {c.desc}
              </div>
              <div style={{ height: 8, background: '#eef2e8', borderRadius: 6, marginTop: 16, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${c.completed > 0 ? Math.max(c.pct, 4) : 0}%`,
                    background: c.color,
                    borderRadius: 6,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 13,
                }}
              >
                <span style={{ fontSize: 11.5, color: lc.faint, fontWeight: 800 }}>
                  {c.completed} / {c.total} lessons
                </span>
                <span
                  style={{
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 13,
                    color: c.completed > 0 ? lc.greenDark : lc.green,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {c.completed > 0 ? 'Continue' : 'Start'}
                  <Icon name="arrow" size={13} color={c.completed > 0 ? lc.greenDark : lc.green} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <form action="/auth/signout" method="post" className="mt-2 lg:hidden">
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 13,
              background: '#fff5f3',
              border: '2px solid #ffdcd6',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 14,
              color: '#c04333',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </form>
      </main>

      {showWelcome && <TrialWelcomeModal onClose={() => setShowWelcome(false)} daysLeft={d.trial?.daysLeft ?? 14} />}
    </div>
  )
}
