'use client'

import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import { ProfileButton } from '@/components/common/ProfileButton'

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
  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      <LandingIconSprite />
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-14 pt-5 lg:gap-5 lg:px-10 lg:pt-8">
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
          <ProfileButton name={d.profileName} email={d.profileEmail} />
        </div>

        {d.totalCount === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* STAT STRIP */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Stat label="Sessions" value={d.totalCount} icon="ic-mic" color={lc.blue} />
              <Stat label="Average" value={d.avgScore} icon="ic-target" color={lc.purple} />
              <Stat label="Personal best" value={d.bestScore} icon="ic-crown" color={lc.yellow} />
              <Stat label="Pass rate" value={`${d.passRate}%`} icon="ic-check" color={lc.green} />
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
                        <Icon id={pb.icon} size={17} color={pb.color} />
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

            {/* TIMELINE — one card per attempt, tap to reopen its feedback */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {d.items.map((s) => (
                <Link
                  key={s.sessionId}
                  href={`/category/${s.categoryId}/module/${s.moduleNumber}/lesson/${s.levelNumber}/feedback?session=${s.sessionId}`}
                  className="transition-transform duration-150 hover:-translate-y-[2px]"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: '#fff',
                    border: `2px solid ${lc.cardBorder}`,
                    borderRadius: 18,
                    padding: '14px 16px',
                    boxShadow: `0 4px 0 ${lc.cardBorder}`,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {/* Score badge */}
                  <span
                    style={{
                      width: 52, height: 52, borderRadius: 14, flex: 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: `${scoreColor(s.score)}15`, border: `2px solid ${scoreColor(s.score)}`,
                    }}
                  >
                    <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, lineHeight: 1, color: scoreColor(s.score) }}>
                      {s.score}
                    </span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.ink }}>
                        {s.lessonTitle}
                      </span>
                      {s.passed ? (
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', color: lc.greenDark, background: '#e7f8ec', padding: '2px 7px', borderRadius: 999 }}>
                          PASSED
                        </span>
                      ) : (
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', color: '#a86a12', background: '#fff3e2', padding: '2px 7px', borderRadius: 999 }}>
                          RETRY
                        </span>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: lc.green, marginTop: 6 }}>
                      Review <Icon id="ic-arrow" size={12} color={lc.green} />
                    </span>
                  </span>
                </Link>
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
        <Icon id={icon} size={20} color="#fff" />
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
      <Icon id="ic-arrow" size={16} color={lc.greenDark} />
    </Link>
  )
}

function TrendChart({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: lc.faint, fontWeight: 700 }}>
        A couple more sessions and your trend line appears here.
      </div>
    )
  }
  const W = 100
  const H = 40
  const max = Math.max(...data, 100)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return [x, y] as const
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120, overflow: 'visible' }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lc.green} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lc.green} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke={lc.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="#fff" stroke={lc.green} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
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
        <Icon id="ic-clock" size={30} color={lc.green} />
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
        <Icon id="ic-mic" size={17} color="#fff" />
        Start practising
      </Link>
    </section>
  )
}
