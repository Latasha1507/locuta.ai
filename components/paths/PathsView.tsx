'use client'

import { useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import type { ModuleNode } from '@/lib/category-map'
import { ProfileButton } from '@/components/common/ProfileButton'

export interface PathCategory {
  id: string
  name: string
  icon: string
  color: string
  completed: number
  total: number
}

export interface PathsData {
  isAdmin: boolean
  promo: FounderPromo | null
  categories: PathCategory[]
  activeCategoryId: string
  activeCategoryName: string
  tone: string
  modules: ModuleNode[]
  current: { moduleNumber: number; levelNumber: number } | null
  profileName?: string
  profileEmail?: string
}

// A rotating palette so each chapter on the map reads as its own "belt".
const CHAPTER_COLORS = [lc.green, lc.blue, lc.yellow, lc.coral, lc.purple, lc.teal, lc.pink]

export function PathsView(d: PathsData) {
  const [tab, setTab] = useState(d.activeCategoryId)

  // Category tabs are links (each loads its own map server-side); the active one
  // is highlighted. This keeps locks/progress authoritative on the server.
  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}
    >
      <LandingIconSprite />
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-12 pt-5 lg:gap-6 lg:px-10 lg:pb-16 lg:pt-8">
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1
              className="text-[26px] lg:text-[32px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.05, margin: 0 }}
            >
              Your learning map
            </h1>
            <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, margin: '5px 0 0' }}>
              Every lesson in a path, in order. Pick up wherever you left off.
            </p>
          </div>
          <ProfileButton name={d.profileName} email={d.profileEmail} />
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {d.categories.map((c) => {
            const active = c.id === tab
            const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
            return (
              <Link
                key={c.id}
                href={`/paths?category=${c.id}&tone=${encodeURIComponent(d.tone)}`}
                onClick={() => setTab(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 'none',
                  padding: '10px 15px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  background: active ? c.color : '#fff',
                  border: `2px solid ${active ? c.color : lc.cardBorder}`,
                  boxShadow: `0 4px 0 ${active ? shade(c.color) : lc.cardBorder}`,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: active ? 'rgba(255,255,255,.25)' : `${c.color}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <Icon id={c.icon} size={18} color={active ? '#fff' : c.color} />
                </span>
                <span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 13.5,
                      color: active ? '#fff' : lc.ink,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      color: active ? 'rgba(255,255,255,.9)' : lc.faint,
                    }}
                  >
                    {pct}% · {c.completed}/{c.total}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>

        {/* THE MAP */}
        <div className="flex flex-col gap-5 lg:gap-7">
          {d.modules.map((mod, mi) => (
            <ChapterRow
              key={mod.number}
              mod={mod}
              color={CHAPTER_COLORS[mi % CHAPTER_COLORS.length]}
              categoryId={d.activeCategoryId}
              tone={d.tone}
              current={d.current}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

function ChapterRow({
  mod,
  color,
  categoryId,
  tone,
  current,
}: {
  mod: ModuleNode
  color: string
  categoryId: string
  tone: string
  current: { moduleNumber: number; levelNumber: number } | null
  profileName?: string
  profileEmail?: string
}) {
  const pct = mod.totalCount > 0 ? Math.round((mod.completedCount / mod.totalCount) * 100) : 0
  const chapterDone = mod.completedCount === mod.totalCount && mod.totalCount > 0

  return (
    <section>
      {/* Chapter header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: mod.locked ? '#eef2e8' : color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            boxShadow: mod.locked ? 'none' : `0 4px 0 ${shade(color)}`,
          }}
        >
          {mod.locked ? (
            <Icon id="ic-lock" size={20} color="#a9b4a0" />
          ) : chapterDone ? (
            <Icon id="ic-check" size={22} color="#fff" />
          ) : (
            <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: '#fff' }}>{mod.number}</span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17.5, lineHeight: 1.1, margin: 0 }}>
              {mod.title}
            </h2>
            {chapterDone && (
              <span
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 9.5,
                  letterSpacing: '0.05em',
                  color: lc.greenDark,
                  background: '#e7f8ec',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                COMPLETE
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: lc.faint, fontWeight: 700, marginTop: 3 }}>
            {mod.locked
              ? mod.lockedReason === 'plan'
                ? 'Upgrade to unlock this chapter'
                : 'Finish the previous chapter to unlock'
              : `${mod.completedCount} of ${mod.totalCount} lessons · ${pct}%`}
          </div>
        </div>
      </div>

      {/* Level nodes */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
        {mod.levels.map((lvl) => {
          const isCurrent =
            !!current && current.moduleNumber === mod.number && current.levelNumber === lvl.levelNumber

          const node = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 14,
                    background: lvl.done ? color : lvl.locked ? '#eef2e8' : isCurrent ? color : `${color}1a`,
                    color: lvl.done || isCurrent ? '#fff' : lvl.locked ? '#aab4a1' : color,
                  }}
                >
                  {lvl.done ? (
                    <Icon id="ic-check" size={15} color="#fff" />
                  ) : lvl.locked ? (
                    <Icon id="ic-lock" size={13} color="#aab4a1" />
                  ) : (
                    lvl.levelNumber
                  )}
                </span>
                {lvl.done && lvl.bestScore !== null && (
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 10,
                      color: lc.greenDark,
                      background: '#e7f8ec',
                      padding: '2px 7px',
                      borderRadius: 999,
                    }}
                  >
                    {lvl.bestScore}
                  </span>
                )}
                {isCurrent && (
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 8.5,
                      letterSpacing: '0.04em',
                      color: '#fff',
                      background: color,
                      padding: '2px 7px',
                      borderRadius: 999,
                    }}
                  >
                    NOW
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  color: lvl.locked ? '#a9b3a1' : lc.ink,
                  marginTop: 9,
                  lineHeight: 1.2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: 32,
                }}
              >
                {lvl.title}
              </div>
              <div style={{ fontSize: 11, color: lc.faint, fontWeight: 700, marginTop: 6 }}>
                {lvl.locked ? 'Locked' : lvl.done ? 'Completed · retry' : isCurrent ? 'Start now' : `${lvl.durationSec}s`}
              </div>
            </>
          )

          const cardStyle: React.CSSProperties = {
            display: 'block',
            background: isCurrent ? `${color}0f` : '#fff',
            border: `2px solid ${isCurrent ? color : lc.cardBorder}`,
            borderRadius: 16,
            padding: 13,
            boxShadow: `0 4px 0 ${isCurrent ? shade(color) : lc.cardBorder}`,
            textDecoration: 'none',
            color: 'inherit',
            opacity: lvl.locked ? 0.7 : 1,
          }

          if (lvl.locked) {
            return (
              <div key={lvl.levelNumber} aria-disabled="true" style={{ ...cardStyle, cursor: 'not-allowed' }}>
                {node}
              </div>
            )
          }
          return (
            <Link
              key={lvl.levelNumber}
              href={`/category/${categoryId}/module/${mod.number}/lesson/${lvl.levelNumber}/practice?tone=${encodeURIComponent(tone)}`}
              className="transition-transform duration-150 hover:-translate-y-[3px]"
              style={cardStyle}
            >
              {node}
            </Link>
          )
        })}
      </div>

      {/* Chapter reward */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 14,
          background: chapterDone ? '#fff8e6' : '#f7faf3',
          border: `2px dashed ${chapterDone ? lc.yellow : lc.cardBorder}`,
          borderRadius: 14,
          padding: '11px 15px',
        }}
      >
        <span style={{ fontSize: 20 }} aria-hidden="true">
          {chapterDone ? '🏆' : '🎁'}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: chapterDone ? '#8a6100' : lc.muted, lineHeight: 1.4 }}>
          {chapterDone
            ? 'Chapter complete — rare sticker peeled! On to the next.'
            : 'Finish this chapter to peel a rare sticker.'}
        </span>
      </div>
    </section>
  )
}

// Darken a hex color for the 3D drop-shadow edge.
function shade(hex: string): string {
  const m = hex.replace('#', '')
  if (m.length !== 6) return 'rgba(0,0,0,.15)'
  const r = Math.max(0, parseInt(m.slice(0, 2), 16) - 40)
  const g = Math.max(0, parseInt(m.slice(2, 4), 16) - 40)
  const b = Math.max(0, parseInt(m.slice(4, 6), 16) - 40)
  return `rgb(${r},${g},${b})`
}
