'use client'

import { useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Mascot, type MascotMood } from '@/components/landing/Mascot'

// The coach and the lesson used to be two separate page loads (/tone then
// /modules). The design merges them into one screen with two steps, which is
// strictly better: you can see what you're about to practise while you pick
// who's coaching you, and switching coach doesn't cost a navigation.

export interface LessonItem {
  levelNumber: number
  title: string
  desc: string
  durationSec: number
  /** Derived from module progression — module 1-2 Beginner, 3-4 Intermediate, 5+ Advanced. */
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  done: boolean
  locked: boolean
  bestScore: number | null
}

export interface ModuleInfo {
  number: number
  title: string
}

export interface CoachLessonData {
  categoryId: string
  categoryName: string
  moduleNumber: number
  moduleTitle: string
  moduleNumbers: number[]
  lessons: LessonItem[]
  /** level_number of the lesson we suggest starting with, if any. */
  nextLevel: number | null
  completedInCategory: number
  totalInCategory: number
  initialTone: string
  lockedReason: 'sequence' | 'plan' | null
}

export const TONES = [
  { name: 'Normal', icon: 'ic-chat', color: lc.green, desc: 'Clear, simple, everyday conversational style.' },
  { name: 'Supportive', icon: 'ic-heart', color: lc.coral, desc: 'Soft, kind and reassuring, like a good friend.' },
  { name: 'Inspiring', icon: 'ic-bolt', color: lc.yellow, desc: 'Energizing and passionate, like a motivator.' },
  { name: 'Funny', icon: 'ic-smile', color: lc.blue, desc: 'Entertaining, playful and casual with light humor.' },
  { name: 'Diplomatic', icon: 'ic-crown', color: lc.purple, desc: 'Calm, professional and balanced feedback.' },
  { name: 'Bossy', icon: 'ic-shield', color: '#f2545b', desc: 'Commanding, no-nonsense, direct leadership.' },
] as const

// What the mascot says when you pick each coach — it previews the voice.
const QUIPS: Record<string, string> = {
  Normal: "Let's keep it clear and easy.",
  Supportive: "You've got this. I'm right here.",
  Inspiring: "Today you find your voice!",
  Funny: 'Warning: I may heckle. Kindly.',
  Diplomatic: 'Measured, fair, straight to the point.',
  Bossy: 'No excuses. Chin up. Speak.',
}

const DIFF_COLOR: Record<LessonItem['difficulty'], string> = {
  Beginner: lc.green,
  Intermediate: lc.yellowDark,
  Advanced: lc.coral,
}

export function CoachLessonView(d: CoachLessonData) {
  const [tone, setTone] = useState(d.initialTone)
  const [poked, setPoked] = useState(false)

  const pickTone = (name: string) => {
    setTone(name)
    setPoked(true)
    setTimeout(() => setPoked(false), 1200)
    // Sync the URL so a refresh or shared link keeps the coach — but via
    // history.replaceState, NOT router.replace(). router.replace() would make
    // Next re-run the server component and re-fetch every lesson just to
    // change a query string; picking a coach must be instant.
    const url = new URL(window.location.href)
    url.searchParams.set('tone', name)
    url.searchParams.set('module', String(d.moduleNumber))
    window.history.replaceState(null, '', url.toString())
  }

  const href = (level: number) =>
    `/category/${d.categoryId}/module/${d.moduleNumber}/lesson/${level}/practice?tone=${encodeURIComponent(tone)}`

  const moduleHref = (m: number) =>
    `/category/${d.categoryId}/modules?tone=${encodeURIComponent(tone)}&module=${m}`

  const idx = d.moduleNumbers.indexOf(d.moduleNumber)
  const prevModule = idx > 0 ? d.moduleNumbers[idx - 1] : null
  const nextModule = idx < d.moduleNumbers.length - 1 ? d.moduleNumbers[idx + 1] : null

  const pct = d.totalInCategory > 0 ? Math.round((d.completedInCategory / d.totalInCategory) * 100) : 0
  const mood: MascotMood = poked ? 'cheer' : 'happy'

  return (
    <div
      className="min-h-screen"
      style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}
    >
      <LandingIconSprite />

      <main className="mx-auto flex max-w-[1080px] flex-col gap-[18px] px-4 pb-11 pt-5 lg:gap-[22px] lg:px-8 lg:pb-14 lg:pt-7">
        {/* HERO BANNER */}
        <div
          className="flex flex-wrap items-center justify-between gap-5 p-[18px] lg:px-8 lg:py-6"
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg,#eafaef,#dff5e6)',
            border: '2px solid #cdeacf',
            borderRadius: 24,
            boxShadow: '0 6px 0 #d4ead2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 220 }}>
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#fff',
                border: '2px solid #d3e6cf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                boxShadow: '0 3px 0 #d3e6cf',
                textDecoration: 'none',
                transform: 'scaleX(-1)',
              }}
            >
              <Icon id="ic-arrow" size={18} color={lc.greenDark} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: '#7fa98a',
                  marginBottom: 3,
                }}
              >
                PRACTICE PATH
              </div>
              <h1
                className="text-[24px] lg:text-[30px]"
                style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.05, margin: 0 }}
              >
                {d.categoryName}
              </h1>
              <div style={{ fontSize: 13, color: '#5f6d58', fontWeight: 700, marginTop: 5 }}>
                {d.completedInCategory} / {d.totalInCategory} lessons · {pct}% complete
              </div>
              <div
                style={{
                  height: 7,
                  width: 180,
                  maxWidth: '100%',
                  background: '#d7ecd9',
                  borderRadius: 5,
                  marginTop: 7,
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: '100%', width: `${pct}%`, background: lc.green, borderRadius: 5 }} />
              </div>
            </div>
          </div>

          {/* Mascot previews the coach's voice */}
          <div className="hidden items-center gap-3.5 sm:flex" style={{ flex: 'none' }}>
            <div
              style={{
                position: 'relative',
                background: '#fff',
                border: '2px solid #d3e6cf',
                borderRadius: 16,
                padding: '11px 15px',
                fontFamily: fontDisplay,
                fontWeight: 700,
                fontSize: 13.5,
                color: lc.ink,
                maxWidth: 180,
                lineHeight: 1.3,
                boxShadow: '0 4px 0 #d3e6cf',
              }}
              aria-live="polite"
            >
              {QUIPS[tone] ?? QUIPS.Normal}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: -9,
                  top: '50%',
                  transform: 'translateY(-50%) rotate(45deg)',
                  width: 14,
                  height: 14,
                  background: '#fff',
                  borderTop: '2px solid #d3e6cf',
                  borderRight: '2px solid #d3e6cf',
                }}
              />
            </div>
            <div style={{ transform: 'scale(.78)', transformOrigin: 'center' }}>
              <Mascot mood={mood} />
            </div>
          </div>
        </div>

        {/* STEP 1 — COACH */}
        <section
          className="p-[18px] lg:px-6 lg:py-[22px]"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 24, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: lc.green,
                color: '#fff',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                boxShadow: `0 3px 0 ${lc.greenDark}`,
              }}
            >
              1
            </span>
            <div>
              <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, lineHeight: 1, margin: 0 }}>
                Pick your coach
              </h2>
              <p style={{ fontSize: 12, color: lc.faint, fontWeight: 700, margin: '2px 0 0' }}>
                Switch anytime — it only changes how feedback sounds.
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3"
            role="radiogroup"
            aria-label="Coaching tone"
          >
            {TONES.map((t, i) => {
              const active = tone === t.name
              return (
                <button
                  key={t.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickTone(t.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    background: active ? `${t.color}12` : '#fff',
                    border: `2px solid ${active ? t.color : lc.cardBorder}`,
                    borderRadius: 16,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    boxShadow: `0 4px 0 ${active ? t.color : lc.cardBorder}`,
                    transition: 'all .14s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: active ? t.color : `${t.color}1f`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                      transition: 'background .14s ease',
                    }}
                  >
                    <Icon id={t.icon} size={21} color={active ? '#fff' : t.color} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.ink }}>
                        {t.name}
                      </span>
                      {i === 0 && (
                        <span
                          style={{
                            fontFamily: fontDisplay,
                            fontWeight: 800,
                            fontSize: 8.5,
                            letterSpacing: '0.04em',
                            color: '#fff',
                            background: lc.green,
                            padding: '2px 7px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          PICK FOR ME
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11.5,
                        color: lc.muted,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        marginTop: 2,
                      }}
                    >
                      {t.desc}
                    </span>
                  </span>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active ? t.color : `${t.color}1f`,
                      boxShadow: active ? `0 2px 0 ${t.color}` : 'none',
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    <Icon id="ic-check" size={13} color="#fff" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* STEP 2 — LESSON */}
        <section
          className="p-[18px] lg:px-6 lg:py-[22px]"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 24, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
        >
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: lc.green,
                color: '#fff',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                boxShadow: `0 3px 0 ${lc.greenDark}`,
              }}
            >
              2
            </span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, lineHeight: 1, margin: 0 }}>
                Pick a lesson to start
              </h2>
              <p style={{ fontSize: 12, color: lc.faint, fontWeight: 700, margin: '2px 0 0' }}>
                Coaching in <span style={{ color: lc.greenDark }}>{tone}</span> voice · tap a lesson to begin
              </p>
            </div>

            {/* Module switcher */}
            {d.moduleNumbers.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ModuleArrow href={prevModule ? moduleHref(prevModule) : null} dir="prev" />
                <span
                  style={{
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: lc.muted,
                    whiteSpace: 'nowrap',
                    padding: '0 4px',
                  }}
                >
                  Module {d.moduleNumber}
                  <span className="hidden lg:inline"> of {d.moduleNumbers.length}</span>
                </span>
                <ModuleArrow href={nextModule ? moduleHref(nextModule) : null} dir="next" />
              </div>
            )}
          </div>

          {d.moduleTitle && (
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 13,
                color: lc.greenDark,
                background: '#eafaef',
                border: '2px solid #c7edd2',
                borderRadius: 999,
                padding: '5px 13px',
                display: 'inline-block',
                marginBottom: 14,
              }}
            >
              {d.moduleTitle}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {d.lessons.map((l) => {
              const isNext = l.levelNumber === d.nextLevel && !l.locked
              const dc = DIFF_COLOR[l.difficulty]

              const inner = (
                <>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 17,
                      background: l.done ? lc.green : l.locked ? '#f0f3ec' : isNext ? lc.green : '#eef4e8',
                      color: l.done || isNext ? '#fff' : '#7d8a75',
                      boxShadow: l.done || isNext ? `0 3px 0 ${lc.greenDark}` : 'none',
                    }}
                  >
                    {l.done ? (
                      <Icon id="ic-check" size={17} color="#fff" />
                    ) : l.locked ? (
                      <Icon id="ic-lock" size={16} color="#b7c2ad" />
                    ) : (
                      l.levelNumber
                    )}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: fontDisplay,
                          fontWeight: 800,
                          fontSize: 15,
                          color: l.locked ? '#a9b3a1' : lc.ink,
                        }}
                      >
                        {l.title}
                      </span>
                      {isNext && (
                        <span
                          style={{
                            fontFamily: fontDisplay,
                            fontWeight: 800,
                            fontSize: 8.5,
                            letterSpacing: '0.05em',
                            color: '#fff',
                            background: lc.green,
                            padding: '2px 8px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          START HERE
                        </span>
                      )}
                      {l.done && l.bestScore !== null && (
                        <span
                          style={{
                            fontFamily: fontDisplay,
                            fontWeight: 800,
                            fontSize: 10,
                            color: lc.greenDark,
                            background: '#e7f8ec',
                            padding: '2px 8px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          BEST {l.bestScore}
                        </span>
                      )}
                    </span>

                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: lc.muted,
                        fontWeight: 600,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.desc}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          color: '#8a9a80',
                          fontWeight: 800,
                        }}
                      >
                        <Icon id="ic-clock" size={12} color="#a3b099" />
                        {l.durationSec} sec
                      </span>
                      <span
                        style={{
                          fontFamily: fontDisplay,
                          fontWeight: 800,
                          fontSize: 10,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          color: dc,
                          background: `${dc}1c`,
                          padding: '3px 9px',
                          borderRadius: 999,
                        }}
                      >
                        {l.difficulty}
                      </span>
                    </span>
                  </span>

                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 13,
                      flex: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      color: l.locked ? '#b7c2ad' : isNext ? lc.greenDark : lc.green,
                    }}
                  >
                    {l.locked ? (
                      'Locked'
                    ) : (
                      <>
                        {l.done ? 'Retry' : isNext ? 'Start' : 'Open'}
                        <Icon id="ic-arrow" size={14} color={isNext ? lc.greenDark : lc.green} />
                      </>
                    )}
                  </span>
                </>
              )

              const cardStyle: React.CSSProperties = {
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: isNext ? '#f2fbf4' : '#fff',
                border: `2px solid ${isNext ? lc.green : lc.cardBorder}`,
                borderRadius: 18,
                padding: '14px 16px',
                boxShadow: `0 4px 0 ${isNext ? lc.greenDark : lc.cardBorder}`,
                opacity: l.locked ? 0.72 : 1,
                textDecoration: 'none',
                color: 'inherit',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
              }

              // Locked lessons are NOT links — they explain themselves instead of
              // dumping the user on a page they can't use.
              if (l.locked) {
                return (
                  <div
                    key={l.levelNumber}
                    aria-disabled="true"
                    title={
                      d.lockedReason === 'plan'
                        ? 'Upgrade to unlock the rest of this path'
                        : 'Finish the previous module to unlock this'
                    }
                    style={{ ...cardStyle, cursor: 'not-allowed' }}
                  >
                    {inner}
                  </div>
                )
              }

              return (
                <Link
                  key={l.levelNumber}
                  href={href(l.levelNumber)}
                  className="transition-transform duration-150 hover:-translate-y-[3px]"
                  style={cardStyle}
                >
                  {inner}
                </Link>
              )
            })}
          </div>

          {d.lockedReason === 'plan' && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#fff3d6',
                border: '2px solid #ffdb6e',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#8a6100' }}>
                Your trial covers Module 1. Upgrade to open every module in this path.
              </span>
              <Link
                href="/pricing"
                style={{
                  background: lc.yellow,
                  color: '#7a5600',
                  padding: '10px 18px',
                  borderRadius: 12,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: `0 3px 0 ${lc.yellowDark}`,
                  whiteSpace: 'nowrap',
                }}
              >
                See plans
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function ModuleArrow({ href, dir }: { href: string | null; dir: 'prev' | 'next' }) {
  const style: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    background: '#fff',
    border: `2px solid ${lc.cardBorder}`,
    boxShadow: `0 3px 0 ${lc.cardBorder}`,
    textDecoration: 'none',
    transform: dir === 'prev' ? 'scaleX(-1)' : undefined,
    opacity: href ? 1 : 0.4,
    cursor: href ? 'pointer' : 'not-allowed',
  }
  const icon = <Icon id="ic-arrow" size={15} color={lc.greenDark} />

  if (!href) {
    return (
      <span aria-disabled="true" style={style}>
        {icon}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={dir === 'prev' ? 'Previous module' : 'Next module'} style={style}>
      {icon}
    </Link>
  )
}
