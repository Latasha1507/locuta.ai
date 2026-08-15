'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Mixpanel from '@/lib/mixpanel'
import { EVENTS, USER_PROPERTIES } from '@/lib/analytics/events'
import TrialWelcomeModal from '@/components/TrialWelcomeModal'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { pressable } from '@/components/ui/buttonSkins'
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
  daysPractised: number
  bestScore: number
  categories: CategoryStat[]
  nextHref: string
  showWelcome: boolean
  trial: { active: boolean; daysLeft: number; sessionsLeft: number } | null
  planState: 'explore' | 'trial' | 'paid'
  promo: FounderPromo | null
  userId: string
}

export function DashboardClient(d: DashboardData) {
  const [showWelcome, setShowWelcome] = useState(d.showWelcome)

  useEffect(() => {
    try {
      // Identity/reset is owned centrally by MixpanelProvider (auth lifecycle).
      // Here we only enrich the profile with domain data the dashboard already
      // knows, and fire the screen-view event.
      Mixpanel.people.set({
        [USER_PROPERTIES.PLAN_TYPE]: d.planState,
        [USER_PROPERTIES.TOTAL_LESSONS_COMPLETED]: d.lessonsCompleted,
        [USER_PROPERTIES.CURRENT_STREAK]: d.streak,
        [USER_PROPERTIES.DAYS_ACTIVE]: d.daysPractised,
        [USER_PROPERTIES.BEST_SCORE]: d.bestScore,
      })
      Mixpanel.track(EVENTS.DASHBOARD_VIEWED, {
        streak: d.streak,
        lessons_completed: d.lessonsCompleted,
        practiced_today: d.practicedToday,
      })
    } catch {
      // Analytics must never break the page.
    }
  }, [d.planState, d.streak, d.lessonsCompleted, d.practicedToday])

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
      // Deliberately NOT a lesson count. "1 / 300" framed the product as a
      // backlog to grind through and made a real first session look like 0.3%
      // of nothing. Days practised only ever goes up — a streak can break, but
      // this number can't be taken away, which is the better thing to show.
      label: 'Days practised',
      value: d.daysPractised,
      hint: d.daysPractised === 0 ? 'Today can be day one' : d.daysPractised === 1 ? 'Day one done' : 'Every one of these counts',
      icon: 'check',
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

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-24 pt-5 lg:gap-[22px] lg:px-10 lg:pb-11 lg:pt-[30px]">
        {/* Launch offer — only for users who could still convert (explore/trial),
            never for active subscribers. Dismissible, and the dismissal sticks. */}
        {d.planState !== 'paid' && <DashboardLaunchBanner />}

        {/* TOP BAR */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-[20px] lg:text-[32px]"
                style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.08, margin: 0 }}
              >
                Welcome back, {d.firstName}
              </h1>
              <p
                className="text-[13px] lg:text-[14.5px]"
                style={{ color: lc.muted, fontWeight: 600, margin: '2px 0 0' }}
              >
                Ready to improve your speaking skills today?
              </p>
            </div>
            {/* Streak flame — now sits beside the greeting on every viewport
                rather than wrapping to its own line on mobile. */}
            <span
              className="flex-none"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: '#fff3d6',
                border: '2px solid #ffdb6e',
                padding: '7px 12px',
                borderRadius: 999,
              }}
              title={`${d.streak} day streak`}
            >
              <Icon name="flame" size={17} color={lc.orange} />
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: '#c07d08' }}>
                {d.streak}
              </span>
            </span>
          </div>

          {/* Plan-state row: trial status or the explore nudge. On its own line
              so it never squeezes the greeting/streak row on mobile. */}
          {((d.planState === 'trial' && d.trial?.active) || d.planState === 'explore') && (
            <div className="flex flex-wrap items-center gap-3">
              {/* TRIAL: calm status pill — days left + sessions left today. */}
              {d.planState === 'trial' && d.trial?.active && (
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
                  {d.trial.daysLeft} {d.trial.daysLeft === 1 ? 'day' : 'days'} to end free trial
                  <span style={{ opacity: 0.5 }}>·</span>
                  {d.trial.sessionsLeft}/10 sessions
                </span>
              )}
              {/* EXPLORE: a free-trial nudge (no status counters). One click, no form. */}
              {d.planState === 'explore' && <ExploreTrialNudge />}
            </div>
          )}
        </div>

        {/* HERO */}
        <div
          className="flex items-center justify-between gap-6 p-5 lg:px-9 lg:py-8"
          style={{
            background: 'linear-gradient(135deg,#eafaef,#dff5e6)',
            border: '2px solid #cdeacf',
            borderRadius: 22,
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
              className="text-[25px] lg:text-[38px]"
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: '-0.7px',
                margin: '0 0 16px',
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
                className={pressable(d.practicedToday ? 'secondary' : 'primary').className}
                style={{
                  ...pressable(d.practicedToday ? 'secondary' : 'primary').style,
                  color: d.practicedToday ? lc.greenDark : '#fff',
                  padding: '15px 24px',
                  borderRadius: 15,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14.5,
                  letterSpacing: '0.02em',
                  gap: 10,
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
        {/* Sign-out lives in Settings (reachable from the nav on every
            viewport) — it was removed from the dashboard bottom on purpose. */}
      </main>

      {showWelcome && <TrialWelcomeModal onClose={() => setShowWelcome(false)} daysLeft={d.trial?.daysLeft ?? 14} />}
    </div>
  )
}

/**
 * EXPLORE-state nudge: a single, zero-field button that starts the 14-day trial.
 * No form, no card — one click flips the user to trial (via /api/start-trial)
 * and reloads so the dashboard + lessons unlock immediately.
 */
function DashboardLaunchBanner() {
  // Dismissible, and the choice sticks per browser so we don't nag returning
  // users. Starts hidden until we've checked storage, to avoid a flash for
  // someone who already dismissed it.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('lc_launch_banner_dismissed') !== '1') setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    try {
      localStorage.setItem('lc_launch_banner_dismissed', '1')
    } catch {
      // ignore — worst case it shows again next load
    }
    setVisible(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: `linear-gradient(90deg, ${lc.green}, ${lc.greenDark})`,
        color: '#fff',
        borderRadius: 16,
        padding: '11px 12px 11px 16px',
      }}
    >
      <span aria-hidden style={{ fontSize: 15 }}>🎉</span>
      <Link
        href="/pricing?plan=annual"
        style={{
          flex: 1,
          minWidth: 0,
          color: '#fff',
          textDecoration: 'none',
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 13.5,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span>
          Launch offer — <span style={{ textDecorationLine: 'underline', textUnderlineOffset: 2 }}>40% off</span> your first year on the annual plan
        </span>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Claim it →
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flex: 'none',
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}

function ExploreTrialNudge() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function startTrial() {
    setErr('')
    setLoading(true)
    try {
      const res = await fetch('/api/start-trial', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d?.detail || d?.error || 'Could not start. Try again.')
        setLoading(false)
        return
      }
      // Trial is live — reload so gating, lessons and the status pill update.
      window.location.href = '/dashboard'
    } catch {
      setErr('Could not start. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={startTrial}
        disabled={loading}
        className={pressable('primary').className}
        style={{
          ...pressable('primary').style,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 12,
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 13.5,
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Starting…' : 'Start your 14-day free trial'}
      </button>
      <span style={{ fontSize: 11, color: lc.faint, fontWeight: 700 }}>
        {err || 'No card needed · 10 sessions a day'}
      </span>
    </div>
  )
}
