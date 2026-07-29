'use client'

import { useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Mascot, type MascotMood } from '@/components/landing/Mascot'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import type { ModuleNode, LevelNode } from '@/lib/category-map'

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

const CHAPTER_COLORS = [lc.green, lc.blue, lc.yellow, lc.coral, lc.purple, lc.teal, lc.pink]

// A rotating cast of expressions for the little mascots along the trail.
const TRAIL_MOODS: MascotMood[] = ['cheer', 'happy', 'shy', 'happy', 'cheer', 'shy']

export function PathsView(d: PathsData) {
  const [tab, setTab] = useState(d.activeCategoryId)

  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}
    >
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <style>{`
        @keyframes lp-nodepulse{
          0%{box-shadow:0 3px 0 var(--edge),0 0 0 0 rgba(63,206,111,.5)}
          70%{box-shadow:0 3px 0 var(--edge),0 0 0 12px rgba(63,206,111,0)}
          100%{box-shadow:0 3px 0 var(--edge),0 0 0 0 rgba(63,206,111,0)}
        }
        .pv-pulse{animation:lp-nodepulse 2.2s ease-out infinite}
        .pv-row{transition:background-color .12s ease}
        .pv-row:hover:not(.pv-lock){background:#f7faf5!important}
        .pv-row.pv-now:hover{background:#eaf8ee!important}
        .pv-chev{opacity:.35;transition:opacity .12s ease}
        .pv-row:hover .pv-chev{opacity:1}
        @media (prefers-reduced-motion:reduce){.pv-pulse{animation:none}}
      `}</style>

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-12 pt-5 lg:gap-6 lg:px-10 lg:pb-16 lg:pt-8">
        {/* HEADER — top-right profile button removed. */}
        <div>
          <h1
            className="text-[26px] lg:text-[32px]"
            style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.05, margin: 0 }}
          >
            Your learning map
          </h1>
          <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, margin: '5px 0 0' }}>
            One path, one step at a time. Pick up right where you left off.
          </p>
        </div>

        {/* CATEGORY SWITCHER — wraps to rows (no horizontal scroll); each pill
            carries a tiny mascot instead of a flat icon. */}
        <div className="flex flex-wrap gap-2.5">
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
                  gap: 9,
                  padding: '8px 14px 8px 9px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  background: active ? c.color : '#fff',
                  border: `2px solid ${active ? c.color : lc.cardBorder}`,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: active ? 'rgba(255,255,255,.22)' : `${c.color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <MiniMascot mood={active ? 'cheer' : 'happy'} box={30} />
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
                      fontWeight: 800,
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

        {/* THE TRAIL */}
        <div className="flex max-w-[720px] flex-col gap-6 lg:gap-8">
          {d.modules.map((mod, mi) => (
            <ChapterTrail
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

function ChapterTrail({
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
}) {
  const chapterDone = mod.completedCount === mod.totalCount && mod.totalCount > 0
  const edge = shade(color)

  return (
    <section>
      {/* Chapter header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: mod.locked ? '#eef2e8' : color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            boxShadow: mod.locked ? 'none' : `0 3px 0 ${edge}`,
          }}
        >
          {mod.locked ? (
            <LockGlyph color="#a9b4a0" size={17} />
          ) : chapterDone ? (
            <CheckGlyph color="#fff" size={20} />
          ) : (
            <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: '#fff' }}>{mod.number}</span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, lineHeight: 1.1, margin: 0 }}>
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
          {/* Chunked progress: "3 to go" is a goal, not a statistic. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <div style={{ display: 'inline-flex', gap: 3 }} aria-hidden="true">
              {mod.levels.map((x, i) => (
                <span
                  key={i}
                  style={{ width: 15, height: 6, borderRadius: 3, background: x.done ? color : '#dde7d6' }}
                />
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: lc.faint, fontWeight: 800 }}>
              {mod.locked
                ? mod.lockedReason === 'plan'
                  ? 'Upgrade to unlock this chapter'
                  : 'Finish the previous chapter to unlock'
                : chapterDone
                  ? 'Chapter complete!'
                  : `${mod.completedCount}/${mod.totalCount} · ${mod.totalCount - mod.completedCount} to go`}
            </span>
          </div>
        </div>
      </div>

      {/* The path — a rail of connected nodes, one card per lesson. */}
      <div>
        {mod.levels.map((lvl, i) => (
          <TrailStep
            key={lvl.levelNumber}
            lvl={lvl}
            color={color}
            edge={edge}
            categoryId={categoryId}
            moduleNumber={mod.number}
            tone={tone}
            isLast={i === mod.levels.length - 1}
            isCurrent={!!current && current.moduleNumber === mod.number && current.levelNumber === lvl.levelNumber}
            moodIndex={i}
          />
        ))}
      </div>
    </section>
  )
}

function TrailStep({
  lvl,
  color,
  edge,
  categoryId,
  moduleNumber,
  tone,
  isLast,
  isCurrent,
  moodIndex,
}: {
  lvl: LevelNode
  color: string
  edge: string
  categoryId: string
  moduleNumber: number
  tone: string
  isLast: boolean
  isCurrent: boolean
  moodIndex: number
}) {
  const nodeBg = lvl.done ? color : lvl.locked ? '#eef2e8' : isCurrent ? color : `${color}1a`
  const nodeFg = lvl.done || isCurrent ? '#fff' : lvl.locked ? '#aab4a1' : color
  const mood = TRAIL_MOODS[moodIndex % TRAIL_MOODS.length]

  const rail = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 46 }}>
      <span
        className={isCurrent ? 'pv-pulse' : undefined}
        style={
          {
            width: 46,
            height: 46,
            borderRadius: '50%',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 16,
            background: nodeBg,
            color: nodeFg,
            boxShadow: lvl.done || isCurrent ? `0 3px 0 ${edge}` : 'none',
            zIndex: 1,
            ['--edge' as string]: edge,
          } as React.CSSProperties
        }
      >
        {lvl.done ? (
          <CheckGlyph color="#fff" size={19} />
        ) : lvl.locked ? (
          <LockGlyph color="#aab4a1" size={15} />
        ) : (
          lvl.levelNumber
        )}
      </span>
      {!isLast && (
        <span
          style={{
            width: 4,
            flex: 1,
            minHeight: 22,
            borderRadius: 3,
            background: lvl.done ? color : '#e3e8dd',
            margin: '2px 0',
          }}
        />
      )}
    </div>
  )

  const cardInner = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14.5,
            color: lvl.locked ? '#a9b3a1' : lc.ink,
            lineHeight: 1.2,
          }}
        >
          {lvl.title}
        </div>
        <div style={{ fontSize: 11.5, color: lc.faint, fontWeight: 700, marginTop: 3 }}>
          {lvl.locked ? 'Locked' : lvl.done ? 'Done — one more rep?' : isCurrent ? 'Start here' : `${lvl.durationSec}s`}
        </div>
      </div>

      {(lvl.done || isCurrent) && !lvl.locked && (
        <span style={{ flex: 'none', display: 'inline-flex' }}>
          <MiniMascot mood={isCurrent ? 'cheer' : mood} box={34} />
        </span>
      )}

      {lvl.done && lvl.bestScore !== null ? (
        <span
          style={{
            flex: 'none',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 11.5,
            color: lc.greenDark,
            background: '#e7f8ec',
            border: `1.5px solid ${lc.green}`,
            padding: '2px 9px',
            borderRadius: 999,
          }}
        >
          {lvl.bestScore}
        </span>
      ) : isCurrent ? (
        <span
          style={{
            flex: 'none',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 9.5,
            letterSpacing: '0.05em',
            color: '#fff',
            background: color,
            padding: '3px 9px',
            borderRadius: 999,
          }}
        >
          NOW
        </span>
      ) : lvl.locked ? null : (
        <span className="pv-chev" aria-hidden="true" style={{ flex: 'none', fontSize: 20, fontWeight: 800, color: color }}>
          ›
        </span>
      )}
    </>
  )

  const cardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: isCurrent ? '#f2fbf4' : '#fff',
    border: `2px solid ${isCurrent ? color : lc.cardBorder}`,
    borderRadius: 16,
    padding: '12px 15px',
    marginBottom: 6,
    textDecoration: 'none',
    color: 'inherit',
    opacity: lvl.locked ? 0.66 : 1,
    fontFamily: 'inherit',
    textAlign: 'left',
    width: '100%',
  }

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {rail}
      {lvl.locked ? (
        <div
          aria-disabled="true"
          className="pv-row pv-lock"
          title="Finish the step above to unlock"
          style={{ ...cardStyle, cursor: 'not-allowed' }}
        >
          {cardInner}
        </div>
      ) : (
        <Link
          href={`/category/${categoryId}/module/${moduleNumber}/lesson/${lvl.levelNumber}/practice?tone=${encodeURIComponent(tone)}`}
          className={isCurrent ? 'pv-row pv-now' : 'pv-row'}
          style={cardStyle}
        >
          {cardInner}
        </Link>
      )}
    </div>
  )
}

/** The real Locuta mascot scaled into a small slot (keeps its idle bob). */
function MiniMascot({ mood, box }: { mood: MascotMood; box: number }) {
  const s = box / 132
  return (
    <span
      aria-hidden="true"
      style={{ width: box, height: box * (120 / 132), flex: 'none', display: 'inline-block', position: 'relative' }}
    >
      <span style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${s})`, transformOrigin: 'top left' }}>
        <Mascot mood={mood} />
      </span>
    </span>
  )
}

/** A checkmark drawn with two borders — no icon font. */
function CheckGlyph({ color, size }: { color: string; size: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size * 0.55,
        height: size * 0.85,
        borderRight: `${Math.max(2, size * 0.14)}px solid ${color}`,
        borderBottom: `${Math.max(2, size * 0.14)}px solid ${color}`,
        transform: 'rotate(45deg)',
        marginTop: -size * 0.12,
        borderRadius: 1,
      }}
    />
  )
}

/** A padlock drawn from a rounded body + an arc shackle — no icon font. */
function LockGlyph({ color, size }: { color: string; size: number }) {
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: size * 0.08,
          transform: 'translateX(-50%)',
          width: size * 0.52,
          height: size * 0.5,
          border: `${Math.max(2, size * 0.13)}px solid ${color}`,
          borderBottom: 0,
          borderRadius: `${size * 0.3}px ${size * 0.3}px 0 0`,
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: size * 0.05,
          transform: 'translateX(-50%)',
          width: size * 0.8,
          height: size * 0.55,
          background: color,
          borderRadius: size * 0.14,
        }}
      />
    </span>
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
