'use client'

import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import { useEffect, useState } from 'react'
import Mixpanel from '@/lib/mixpanel'
import { EVENTS, USER_PROPERTIES } from '@/lib/analytics/events'

export interface HistoryItem {
  sessionId: string
  categoryId: string
  categoryName: string
  moduleNumber: number
  levelNumber: number
  lessonTitle: string
  tone: string
  score: number
  contentScore: number
  linguisticScore: number
  passed: boolean
  createdAt: string
  userAudioUrl: string
  coachAudioUrl: string
}

export interface PersonalBest {
  categoryName: string
  icon: string
  color: string
  best: number
}

export interface HistoryData {
  isAdmin: boolean
  promo: FounderPromo | null
  items: HistoryItem[]
  totalCount: number
  avgScore: number
  bestScore: number
  passRate: number
  trend: number[]
  personalBests: PersonalBest[]
  categories: { id: string; name: string }[]
  activeCategoryId: string | null
  page: number
  totalPages: number
  profileName?: string
  profileEmail?: string
}

function scoreColor(s: number): string {
  if (s >= 85) return lc.green
  if (s >= 70) return lc.blue
  if (s >= 50) return lc.yellowDark
  return lc.coral
}

export function HistoryView(d: HistoryData) {
  // History Page Viewed — the auto Page Viewed records the hit; this adds the
  // engagement context (how much history they have, which filter/page).
  useEffect(() => {
    try {
      Mixpanel.track(EVENTS.HISTORY_PAGE_VIEWED, {
        total_sessions: d.totalCount,
        avg_score: d.avgScore,
        active_category: d.activeCategoryId ?? null,
        page: d.page,
      })
      // Populate the aggregate profile stats — computed here already, and empty
      // on the profile until now. Segmentable in Mixpanel (e.g. avg-score cohorts).
      Mixpanel.people.set({
        [USER_PROPERTIES.SESSIONS_TOTAL]: d.totalCount,
        [USER_PROPERTIES.AVERAGE_SCORE]: d.avgScore,
        [USER_PROPERTIES.BEST_SCORE]: d.bestScore,
        [USER_PROPERTIES.PASS_RATE]: d.passRate,
      })
    } catch {
      // analytics must never break the page
    }
  }, [d.totalCount, d.avgScore, d.bestScore, d.passRate, d.activeCategoryId, d.page])

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-24 pt-5 lg:gap-5 lg:px-10 lg:pb-14 lg:pt-8">
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: '#7fa98a' }}>
              YOUR JOURNEY
            </div>
            <h1 className="text-[26px] lg:text-[32px]" style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', margin: '2px 0 0' }}>
              Practice history
            </h1>
          </div>
        </div>

        {d.totalCount === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* STAT STRIP */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Stat label="Sessions" value={d.totalCount} icon="mic" color={lc.blue} />
              <Stat label="Average" value={d.avgScore} icon="target" color={lc.purple} />
              <Stat label="Personal best" value={d.bestScore} icon="crown" color={lc.yellow} />
              <Stat label="Pass rate" value={`${d.passRate}%`} icon="check" color={lc.green} />
            </div>

            {/* ANALYTICS SPLIT */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr] lg:gap-4">
              {/* SCORE TREND */}
              <section
                className="p-5 lg:p-6"
                style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 15.5, margin: 0 }}>Score trend</h2>
                  <span style={{ fontSize: 12, color: lc.faint, fontWeight: 700 }}>last {d.trend.length} sessions</span>
                </div>
                <TrendChart data={d.trend} />
              </section>

              {/* PERSONAL BESTS */}
              <section
                className="p-5 lg:p-6"
                style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
              >
                <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 15.5, margin: '0 0 14px' }}>Personal bests</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.personalBests.map((pb) => (
                    <div key={pb.categoryName} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span
                        style={{
                          width: 34, height: 34, borderRadius: 10, background: `${pb.color}1a`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                        }}
                      >
                        <Icon name={pb.icon} size={17} color={pb.color} />
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: lc.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pb.categoryName}
                      </span>
                      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16, color: scoreColor(pb.best) }}>
                        {pb.best}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* FILTERS */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip href="/history" label="All" active={!d.activeCategoryId} />
              {d.categories.map((c) => (
                <FilterChip
                  key={c.id}
                  href={`/history?category=${c.id}`}
                  label={c.name}
                  active={d.activeCategoryId === c.id}
                />
              ))}
            </div>

            {/* TIMELINE — tap a row to expand its compare audio inline (no page
                jump). "Full review" opens the complete feedback page. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {d.items.map((s) => (
                <SessionRow key={s.sessionId} s={s} activeCategoryId={d.activeCategoryId} />
              ))}
            </div>

            {/* PAGINATION */}
            {d.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 }}>
                <PageLink
                  href={`/history?${d.activeCategoryId ? `category=${d.activeCategoryId}&` : ''}page=${d.page - 1}`}
                  disabled={d.page <= 1}
                  dir="prev"
                />
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: lc.muted }}>
                  Page {d.page} of {d.totalPages}
                </span>
                <PageLink
                  href={`/history?${d.activeCategoryId ? `category=${d.activeCategoryId}&` : ''}page=${d.page + 1}`}
                  disabled={d.page >= d.totalPages}
                  dir="next"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SessionRow({ s, activeCategoryId }: { s: HistoryItem; activeCategoryId: string | null }) {
  const [open, setOpen] = useState(false)
  const hasAudio = Boolean(s.userAudioUrl || s.coachAudioUrl)
  // "Full review" carries from=history so the feedback page's back button
  // returns HERE, not to the lesson/module page.
  const reviewHref = `/category/${s.categoryId}/module/${s.moduleNumber}/lesson/${s.levelNumber}/feedback?session=${s.sessionId}&from=history${activeCategoryId ? `&fromCategory=${activeCategoryId}` : ''}`

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${lc.cardBorder}`,
        borderRadius: 18,
        boxShadow: `0 4px 0 ${lc.cardBorder}`,
        overflow: 'hidden',
      }}
    >
      {/* HEADER ROW — click to expand (only if there's audio to show) */}
      <button
        type="button"
        onClick={() => hasAudio && setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', background: 'transparent', border: 'none',
          cursor: hasAudio ? 'pointer' : 'default', textAlign: 'left', color: 'inherit',
        }}
      >
        <span
          style={{
            width: 52, height: 52, borderRadius: 14, flex: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${scoreColor(s.score)}15`, border: `2px solid ${scoreColor(s.score)}`,
          }}
        >
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, lineHeight: 1, color: scoreColor(s.score) }}>
            {s.score}
          </span>
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.ink }}>{s.lessonTitle}</span>
            {s.passed ? (
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', color: lc.greenDark, background: '#e7f8ec', padding: '2px 7px', borderRadius: 999 }}>PASSED</span>
            ) : (
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', color: '#a86a12', background: '#fff3e2', padding: '2px 7px', borderRadius: 999 }}>RETRY</span>
            )}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: lc.muted, fontWeight: 700, marginTop: 3 }}>
            {s.categoryName} · {s.tone} coach
          </span>
          <span style={{ display: 'flex', gap: 12, marginTop: 7 }}>
            <SubScore label="Content" value={s.contentScore} />
            <SubScore label="Language" value={s.linguisticScore} />
          </span>
        </span>

        <span style={{ flex: 'none', textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: lc.faint, fontWeight: 700 }}>
            {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {hasAudio && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: lc.green, marginTop: 6 }}>
              {open ? 'Hide' : 'Compare'}
              <span
                aria-hidden
                style={{
                  display: 'inline-block', width: 6, height: 6, marginLeft: 2,
                  borderRight: `2px solid ${lc.green}`, borderBottom: `2px solid ${lc.green}`,
                  transform: open ? 'rotate(-135deg)' : 'rotate(45deg)',
                  transition: 'transform .15s', marginBottom: open ? -2 : 2,
                }}
              />
            </span>
          )}
        </span>
      </button>

      {/* EXPANDED — inline compare audio + full-review link */}
      {open && hasAudio && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${lc.cardBorder}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <MiniAudio label="You said it" src={s.userAudioUrl} accent={lc.coral} />
            <MiniAudio label="Coach version" src={s.coachAudioUrl} accent={lc.green} />
          </div>
          <Link
            href={reviewHref}
            onClick={() => {
              try {
                Mixpanel.track(EVENTS.SESSION_REVIEWED, {
                  session_id: s.sessionId,
                  category: s.categoryId,
                  module_number: s.moduleNumber,
                  level_number: s.levelNumber,
                  score: s.score,
                  passed: s.passed,
                })
              } catch {
                // analytics must never block navigation
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12.5, fontWeight: 800, color: lc.green, textDecoration: 'none' }}
          >
            Open full review <Icon name="arrow" size={12} color={lc.green} />
          </Link>
        </div>
      )}
    </div>
  )
}

/** Compact inline audio player for the History compare view. */
function MiniAudio({ label, src, accent }: { label: string; src: string; accent: string }) {
  const [playing, setPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  function toggle() {
    if (!src) return
    let a = audio
    if (!a) {
      a = new Audio(src)
      a.onended = () => setPlaying(false)
      setAudio(a)
    }
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      void a.play()
      setPlaying(true)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${accent}0d`, border: `2px solid ${accent}33`, borderRadius: 12, padding: '10px 12px' }}>
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: 34, height: 34, borderRadius: '50%', flex: 'none', border: 'none',
          background: src ? accent : '#cfd6cb', color: '#fff', cursor: src ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: lc.ink }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10.5, color: lc.faint, fontWeight: 700 }}>
          {src ? (playing ? 'Playing…' : 'Tap to play') : 'Not available'}
        </span>
      </span>
    </div>
  )
}

function Stat({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div
      className="flex items-center gap-3 p-4"
      style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 18, boxShadow: `0 4px 0 ${lc.cardBorder}` }}
    >
      <span
        className="hidden sm:flex"
        style={{ width: 40, height: 40, borderRadius: 11, background: color, alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 3px 0 rgba(0,0,0,.12)' }}
      >
        <Icon name={icon} size={20} color="#fff" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11, color: lc.faint, fontWeight: 800 }}>{label}</span>
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: lc.ink }}>{value}</span>
      </span>
    </div>
  )
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: lc.faint, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 12, color: scoreColor(value) }}>{value}</span>
    </span>
  )
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        flex: 'none',
        padding: '8px 15px',
        borderRadius: 12,
        textDecoration: 'none',
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: 13,
        whiteSpace: 'nowrap',
        background: active ? lc.green : '#fff',
        color: active ? '#fff' : lc.ink,
        border: `2px solid ${active ? lc.green : lc.cardBorder}`,
        boxShadow: `0 3px 0 ${active ? lc.greenDark : lc.cardBorder}`,
      }}
    >
      {label}
    </Link>
  )
}

function PageLink({ href, disabled, dir }: { href: string; disabled: boolean; dir: 'prev' | 'next' }) {
  const style: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', border: `2px solid ${lc.cardBorder}`, boxShadow: `0 3px 0 ${lc.cardBorder}`,
    textDecoration: 'none', transform: dir === 'prev' ? 'scaleX(-1)' : undefined,
    opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
  }
  return (
    <Link href={href} aria-label={dir === 'prev' ? 'Newer' : 'Older'} style={style} aria-disabled={disabled}>
      <Icon name="arrow" size={16} color={lc.greenDark} />
    </Link>
  )
}

function TrendChart({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: lc.faint, fontWeight: 700 }}>
        A couple more sessions and your trend line appears here.
      </div>
    )
  }

  // Real pixel coordinates (no aspect-ratio stretching, so the line isn't
  // distorted). Padding leaves room for the value labels above each point.
  const W = 560
  const H = 190
  const padX = 18
  const padTop = 26
  const padBottom = 22

  // Y-scale: frame the actual scores with a little headroom so the variation is
  // visible, but never invert or exaggerate. Clamped to 0–100.
  const lo = Math.max(0, Math.min(...data) - 8)
  const hi = Math.min(100, Math.max(...data) + 8)
  const range = hi - lo || 1
  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2)
  const y = (v: number) => padTop + (1 - (v - lo) / range) * (H - padTop - padBottom)

  const pts = data.map((v, i) => [x(i), y(v)] as const)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - padBottom} L${pts[0][0].toFixed(1)},${H - padBottom} Z`

  // Gridlines at three readable score marks within the visible range.
  const gridVals = [Math.round(hi), Math.round((hi + lo) / 2), Math.round(lo)]

  const first = data[0]
  const last = data[data.length - 1]
  const delta = last - first
  const deltaColor = delta > 0 ? lc.greenDark : delta < 0 ? lc.coralDark : lc.faint
  const deltaLabel = delta > 0 ? `▲ +${delta} since you started` : delta < 0 ? `▼ ${delta} since you started` : 'Holding steady'

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lc.green} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lc.green} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines + y labels */}
        {gridVals.map((gv, i) => {
          const gy = y(gv)
          return (
            <g key={i}>
              <line x1={padX} y1={gy} x2={W - padX} y2={gy} stroke={lc.cardBorder} strokeWidth="1" strokeDasharray="3 4" />
              <text x={W - padX + 2} y={gy + 3} fontSize="10" fontWeight="700" fill={lc.faint}>{gv}</text>
            </g>
          )
        })}

        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke={lc.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + value labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3.6" fill="#fff" stroke={lc.green} strokeWidth="2.2" />
            <text x={p[0]} y={p[1] - 9} fontSize="10.5" fontWeight="800" fill={lc.ink} textAnchor="middle">{data[i]}</text>
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 2 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: deltaColor }}>{deltaLabel}</span>
        <span style={{ fontSize: 11.5, color: lc.faint, fontWeight: 700 }}>· first {first} → latest {last}</span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <section
      className="flex flex-col items-center gap-4 p-10 text-center"
      style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
    >
      <span style={{ width: 64, height: 64, borderRadius: 18, background: '#eafaef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="clock" size={30} color={lc.green} />
      </span>
      <div>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, margin: 0 }}>No sessions yet</h2>
        <p style={{ fontSize: 14, color: lc.muted, fontWeight: 600, margin: '6px 0 0' }}>
          Finish your first practice and it&apos;ll show up here with your score and feedback.
        </p>
      </div>
      <Link
        href="/practice"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, background: lc.green, color: '#fff',
          padding: '13px 22px', borderRadius: 14, fontFamily: fontDisplay, fontWeight: 800, fontSize: 14,
          textDecoration: 'none', boxShadow: `0 5px 0 ${lc.greenDark}`,
        }}
      >
        <Icon name="mic" size={17} color="#fff" />
        Start practising
      </Link>
    </section>
  )
}
