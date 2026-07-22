'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { Mascot } from '@/components/landing/Mascot'
import { StickerUnlock } from './StickerUnlock'

export interface FeedbackData {
  sessionId: string
  categoryId: string
  categoryName: string
  moduleId: string
  lessonId: string
  lessonTitle: string
  tone: string
  score: number
  passThreshold: number
  passed: boolean
  contentScore: number
  linguisticScore: number
  focusAreaScores: Record<string, number>
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
  /** 2-3 lesson-relevant words to expand vocabulary. May be empty. */
  wordsToLearn: { word: string; meaning: string; example: string }[]
  transcript: string
  exampleText: string
  exampleAudioUrl: string
  /** First time this level has ever been passed → the sticker is new. */
  newlyCompleted: boolean
  streak: number
  dayLabel: string
  stickerIcon: string
  stickerColor: string
  nextHref: string
  retryHref: string
  sessionsRemainingToday: number
}

const RING = 2 * Math.PI * 54

function useCountUp(target: number, ms = 1100, start = true) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, start])
  return n
}

export function FeedbackView(d: FeedbackData) {
  // The sticker celebration takes over first; the feedback is waiting underneath.
  const [showSticker, setShowSticker] = useState(d.newlyCompleted && d.passed)
  const scoreVisible = !showSticker
  const shown = useCountUp(d.score, 1100, scoreVisible)

  const [example, setExample] = useState<{ text: string; audioUrl: string }>({
    text: d.exampleText,
    audioUrl: d.exampleAudioUrl,
  })
  const [exLoading, setExLoading] = useState(false)
  const [exError, setExError] = useState('')
  const requested = useRef(false)

  const generateExample = async () => {
    if (requested.current) return
    requested.current = true
    setExLoading(true)
    setExError('')
    try {
      const res = await fetch('/api/generate-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: d.sessionId, tone: d.tone }),
      })
      if (!res.ok) throw new Error('Could not build your model answer.')
      const j = await res.json()
      setExample({ text: j.text || '', audioUrl: j.audioUrl || '' })
    } catch (e) {
      setExError(e instanceof Error ? e.message : 'Something went wrong.')
      requested.current = false
    } finally {
      setExLoading(false)
    }
  }

  const ringColor = d.passed ? lc.green : lc.orange
  const focusEntries = Object.entries(d.focusAreaScores || {})

  return (
    <div className="min-h-screen" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>

      {showSticker && (
        <StickerUnlock
          stickerIcon={d.stickerIcon}
          stickerColor={d.stickerColor}
          dayLabel={d.dayLabel}
          streak={d.streak}
          lessonTitle={d.lessonTitle}
          nextHref={d.nextHref}
          onClose={() => setShowSticker(false)}
        />
      )}

      <main className="mx-auto flex w-full max-w-[1300px] flex-col gap-3 px-4 pb-12 pt-5 lg:gap-4 lg:px-8 lg:pt-6">
        {/* HEADER */}
        <div
          className="flex items-center gap-4 p-3 lg:px-6 lg:py-3"
          style={{
            background: d.passed ? 'linear-gradient(135deg,#eafaef,#dff5e6)' : 'linear-gradient(135deg,#fff4e6,#ffe9d2)',
            border: `2px solid ${d.passed ? '#cdeacf' : '#f6d9ae'}`,
            borderRadius: 22,
            boxShadow: `0 6px 0 ${d.passed ? '#d4ead2' : '#eecfa2'}`,
          }}
        >
          <Link
            href={`/category/${d.categoryId}/modules?tone=${encodeURIComponent(d.tone)}&module=${d.moduleId}`}
            aria-label="Back to lessons"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#fff',
              border: '2px solid #ddeadb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              boxShadow: '0 3px 0 #ddeadb',
              transform: 'scaleX(-1)',
            }}
          >
            <Icon name="arrow" size={18} color={lc.greenDark} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow + result pill on one line, matching the practice page, so
                the header is two lines not three. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', color: '#7fa98a' }}>
                {d.categoryName.toUpperCase()} · MODULE {d.moduleId} · LESSON {d.lessonId}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 11,
                  color: d.passed ? lc.greenDark : '#b06d17',
                  background: '#fff',
                  border: `2px solid ${d.passed ? '#c7edd2' : '#f0d3a6'}`,
                  padding: '2px 9px',
                  borderRadius: 999,
                }}
              >
                <Icon name={d.passed ? 'check' : 'target'} size={11} color={d.passed ? lc.greenDark : '#b06d17'} />
                {d.passed ? 'Passed' : 'Keep going'} · {d.tone} coach
              </span>
            </div>
            <h1
              className="text-[19px] lg:text-[23px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.1, margin: '4px 0 0' }}
            >
              {d.lessonTitle}
            </h1>
          </div>
          <div className="hidden shrink-0 sm:block" style={{ transform: 'scale(.5)', transformOrigin: 'center right', margin: '-14px 0' }}>
            <Mascot mood={d.passed ? 'cheer' : 'oops'} />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-4">
          {/* LEFT — score */}
          <div className="flex flex-col gap-3 lg:gap-4">
            <section
              className="p-6 text-center"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
            >
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 6px' }}>
                <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#eef2e8" strokeWidth="11" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={RING}
                    strokeDashoffset={RING - (RING * shown) / 100}
                    style={{ transition: 'stroke-dashoffset .08s linear' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 40, lineHeight: 1, color: lc.ink }}>
                    {shown}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: lc.faint }}>OUT OF 100</span>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: d.passed ? '#eafaef' : '#fff3e2',
                  border: `2px solid ${d.passed ? '#c7edd2' : '#f6d9ae'}`,
                  color: d.passed ? lc.greenDark : '#a86a12',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 12.5,
                  marginBottom: 12,
                }}
              >
                <Icon name={d.passed ? 'check' : 'target'} size={14} color={d.passed ? lc.greenDark : '#a86a12'} />
                {d.passed ? 'PASSED' : `${d.passThreshold} NEEDED TO PASS`}
              </div>

              <p style={{ fontSize: 13.5, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 16px' }}>
                {d.passed
                  ? 'Level complete. Your sticker is in the collection.'
                  : `You're ${d.passThreshold - d.score} point${d.passThreshold - d.score === 1 ? '' : 's'} away. One more go and it's yours.`}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <MiniScore label="Content" value={d.contentScore} color={lc.blue} />
                <MiniScore label="Language" value={d.linguisticScore} color={lc.purple} />
              </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href={d.passed ? d.nextHref : d.retryHref}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: lc.green,
                  color: '#fff',
                  padding: 15,
                  borderRadius: 15,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14.5,
                  textDecoration: 'none',
                  boxShadow: `0 5px 0 ${lc.greenDark}`,
                }}
              >
                <Icon name={d.passed ? 'arrow' : 'mic'} size={17} color="#fff" />
                {d.passed ? 'NEXT LESSON' : 'TRY AGAIN'}
              </Link>
              {d.passed && (
                <Link
                  href={d.retryHref}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: '#fff',
                    color: lc.ink,
                    border: `2px solid ${lc.cardBorder}`,
                    padding: 13,
                    borderRadius: 14,
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 13.5,
                    textDecoration: 'none',
                    boxShadow: `0 4px 0 ${lc.cardBorder}`,
                  }}
                >
                  Practise this again
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT — the detail */}
          <div className="flex flex-col gap-3 lg:gap-4">
            {/* Focus areas */}
            {focusEntries.length > 0 && (
              <Card title="How you scored" icon="target" iconColor={lc.blue}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {focusEntries.map(([name, val], i) => (
                    <Bar key={name} label={name} value={Number(val) || 0} delay={i * 0.08} visible={scoreVisible} />
                  ))}
                </div>
              </Card>
            )}

            {/* Strengths / improvements */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
              <Card title="What worked" icon="star" iconColor={lc.green}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {(d.strengths.length ? d.strengths : ['You showed up and spoke. That is the hard part.']).map((s, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 9,
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        color: '#4a5645',
                        fontWeight: 600,
                        animation: `lp-rise .4s ease ${0.1 + i * 0.07}s both`,
                      }}
                    >
                      <span style={{ color: lc.green, flex: 'none', marginTop: 2 }}>
                        <Icon name="check" size={13} color={lc.green} />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Work on this" icon="bulb" iconColor={lc.orange}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {(d.improvements.length ? d.improvements : ['Keep going — more reps will sharpen this.']).map((s, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 9,
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        color: '#4a5645',
                        fontWeight: 600,
                        animation: `lp-rise .4s ease ${0.1 + i * 0.07}s both`,
                      }}
                    >
                      <span style={{ flex: 'none', marginTop: 2 }}>
                        <Icon name="bolt" size={13} color={lc.orange} />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Coach's read */}
            {d.detailedFeedback && (
              <Card title={`Your ${d.tone} coach's read`} icon="chat" iconColor={lc.purple}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4a5645', fontWeight: 600, margin: 0 }}>
                  {d.detailedFeedback}
                </p>
              </Card>
            )}

            {/* WORDS TO LEARN — 2-3 words pitched at this learner's level to
                grow vocabulary, each with a plain-English meaning and an example
                sentence. Only shown when the coach actually returned some. */}
            {d.wordsToLearn && d.wordsToLearn.length > 0 && (
              <Card title="Words to learn" icon="book" iconColor={lc.blue}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.wordsToLearn.slice(0, 3).map((w, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#f3f9ff',
                        border: '2px solid #d5e6fb',
                        borderRadius: 14,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 15, color: '#0f7fb8' }}>
                          {w.word}
                        </span>
                        <span style={{ fontSize: 13, color: lc.muted, fontWeight: 600 }}>{w.meaning}</span>
                      </div>
                      {w.example && (
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#3c4f63', fontWeight: 600, fontStyle: 'italic' }}>
                          &ldquo;{w.example}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* THE MODEL ANSWER — the user's own attempt, done properly */}
            <Card title="Your answer, done properly" icon="crown" iconColor={lc.green}>
              <p style={{ fontSize: 12.5, color: lc.faint, fontWeight: 700, margin: '-4px 0 12px', lineHeight: 1.45 }}>
                Not a generic sample — this is <strong style={{ color: lc.greenDark }}>your</strong> answer, your topic and
                your details, rewritten the way a strong speaker would deliver it, in your {d.tone} coach&apos;s voice.
              </p>

              {example.text ? (
                <div style={{ animation: 'lp-rise .4s ease both' }}>
                  {example.audioUrl && (
                    <audio
                      controls
                      preload="none"
                      src={example.audioUrl}
                      style={{ width: '100%', marginBottom: 12 }}
                    />
                  )}
                  <div
                    style={{
                      background: '#f2fbf4',
                      border: '2px solid #cfe9c6',
                      borderRadius: 14,
                      padding: '14px 16px',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#33482e',
                      fontWeight: 600,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {example.text}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={generateExample}
                    disabled={exLoading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 9,
                      background: exLoading ? '#a8ddb9' : lc.green,
                      color: '#fff',
                      border: 0,
                      padding: 14,
                      borderRadius: 14,
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: exLoading ? 'wait' : 'pointer',
                      boxShadow: `0 4px 0 ${exLoading ? '#8fc9a1' : lc.greenDark}`,
                    }}
                  >
                    <Icon name="bolt" size={16} color="#fff" />
                    {exLoading ? 'REWRITING YOUR ANSWER…' : 'SHOW ME HOW IT SHOULD SOUND'}
                  </button>
                  {exError && (
                    <p role="alert" style={{ fontSize: 12.5, color: '#c0392b', fontWeight: 700, marginTop: 10 }}>
                      {exError}
                    </p>
                  )}
                </>
              )}
            </Card>

            {/* What you said */}
            {d.transcript && (
              <Card title="What you said" icon="mic" iconColor={lc.coral} collapsible>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: lc.muted,
                    fontWeight: 600,
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{d.transcript}&rdquo;
                </p>
              </Card>
            )}

            {d.sessionsRemainingToday <= 3 && d.sessionsRemainingToday < 9999 && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: lc.faint, fontWeight: 700 }}>
                {d.sessionsRemainingToday} practice{' '}
                {d.sessionsRemainingToday === 1 ? 'session' : 'sessions'} left today
              </p>
            )}
          </div>
        </div>

        {/* ACTION BAR — the three things you can do next, always reachable at the
            end of the page: continue, retry, or go back. Previously the only
            navigation was small inline links buried mid-page. */}
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          style={{ marginTop: 4 }}
        >
          <Link
            href={d.nextHref}
            style={{
              ...actionBtn,
              background: lc.green,
              color: '#fff',
              boxShadow: `0 5px 0 ${lc.greenDark}`,
            }}
          >
            Next lesson
            <Icon name="arrow" size={16} color="#fff" />
          </Link>
          <Link
            href={d.retryHref}
            style={{
              ...actionBtn,
              background: '#fff',
              color: lc.greenDark,
              border: `2px solid ${lc.green}`,
              boxShadow: `0 5px 0 #cfe9c6`,
            }}
          >
            <Icon name="arrow" size={16} color={lc.greenDark} style={{ transform: 'scaleX(-1)' }} />
            Practice again
          </Link>
          <Link
            href={`/category/${d.categoryId}/modules?tone=${encodeURIComponent(d.tone)}&module=${d.moduleId}`}
            style={{
              ...actionBtn,
              background: '#fff',
              color: lc.muted,
              border: `2px solid ${lc.cardBorder}`,
              boxShadow: `0 5px 0 ${lc.cardBorder}`,
            }}
          >
            Back to lessons
          </Link>
        </div>
      </main>
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '14px 18px',
  borderRadius: 16,
  fontFamily: fontDisplay,
  fontWeight: 800,
  fontSize: 14,
  textDecoration: 'none',
}

function Card({
  title,
  icon,
  iconColor,
  children,
  collapsible = false,
}: {
  title: string
  icon: string
  iconColor: string
  children: React.ReactNode
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)
  return (
    <section
      className="p-[18px] lg:px-6 lg:py-5"
      style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 20, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
    >
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        aria-expanded={collapsible ? open : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: open ? 12 : 0,
          background: 'none',
          border: 0,
          padding: 0,
          width: '100%',
          textAlign: 'left',
          cursor: collapsible ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}
      >
        <Icon name={icon} size={19} color={iconColor} />
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 15.5, color: lc.ink, flex: 1 }}>{title}</span>
        {collapsible && (
          <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, color: lc.faint }}>
            {open ? '–' : '+'}
          </span>
        )}
      </button>
      {open && children}
    </section>
  )
}

function MiniScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#f6faf2', border: `2px solid ${lc.cardBorder}`, borderRadius: 14, padding: '10px 8px' }}>
      <div style={{ fontSize: 11, color: lc.faint, fontWeight: 800, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 21, color }}>{value}</div>
    </div>
  )
}

function Bar({ label, value, delay, visible }: { label: string; value: number; delay: number; visible: boolean }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setW(value), delay * 1000 + 120)
    return () => clearTimeout(t)
  }, [value, delay, visible])

  const color = value >= 80 ? lc.green : value >= 65 ? lc.yellowDark : lc.coral
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: lc.ink }}>{label}</span>
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color }}>{value}</span>
      </div>
      <div style={{ height: 9, background: '#eef2e8', borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${w}%`,
            background: color,
            borderRadius: 6,
            transition: 'width .9s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
    </div>
  )
}
