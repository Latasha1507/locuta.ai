import Link from 'next/link'
import { lc, fontDisplay } from './tokens'
import { Icon } from '@/components/ui/icons'
import { LocutaLogo } from '@/components/ui/LocutaLogo'
import { Button, ButtonStyles } from '@/components/ui/Button'
import { Mascot } from './Mascot'
import { LandingNav } from './LandingNav'
import { DemoRecorder } from './DemoRecorder'
import { ToneShowcase } from './ToneShowcase'
import { FaqSection } from './FaqSection'

// ---------------------------------------------------------------------------
// Content — kept in sync with the real product:
// - Trial terms match lib/check-session-limit.ts (14 days, 10 sessions/day).
// - Category names match app/dashboard/page.tsx.
// - Prices match app/pricing/page.tsx.
// ---------------------------------------------------------------------------

const HERO_PROOF = [
  { big: 'Real-time', small: 'AI feedback', icon: 'star', color: lc.green },
  { big: '6', small: 'Coaching styles', icon: 'chat', color: lc.blue },
  { big: 'Private', small: 'Judgment-free space', icon: 'shield', color: lc.coral },
]

const TICKER = [
  'toast', 'job interview', 'investor pitch', 'wedding speech', 'stand-up', 'tough feedback',
  'first date', 'keynote', 'sales call', 'podcast intro', 'the big ask', 'small talk',
]

const RESEARCH = [
  { big: '85%', text: 'of career success comes down to communication skills, not technical ability.', source: 'Carnegie Foundation & Stanford Research' },
  { big: '75%', text: 'of people feel anxious speaking in front of others. You are far from alone.', source: 'National Institute of Mental Health' },
  { big: '#1', text: 'Communication ranks as the most in-demand skill employers look for today.', source: 'LinkedIn Global Talent Trends' },
]

const WHY = [
  { icon: 'bulb', title: 'AI that learns your voice', desc: 'Get specific feedback on your pace, clarity, filler words and delivery. Your coach adapts to how you actually speak and tailors every session.', pill: 'Personalized coaching that adapts to you' },
  { icon: 'chat', title: 'Six coaching styles', desc: 'From supportive to bossy, choose the energy that brings out your best, and switch whenever your goal or mood changes.', pill: 'A coaching personality for every moment' },
  { icon: 'target', title: 'Every real scenario', desc: 'Rehearse the moments that count: interviews, pitches, tough talks, toasts. If you will say it out loud, you can practice it here first.', pill: 'Confidence for the conversations that matter' },
]

const WEEK = [
  { day: 'MON', icon: 'mic', color: lc.green, state: 'done' as const, tilt: -5 },
  { day: 'TUE', icon: 'star', color: lc.yellow, state: 'done' as const, tilt: 4 },
  { day: 'WED', icon: 'chat', color: lc.blue, state: 'done' as const, tilt: -3 },
  { day: 'THU', icon: 'flame', color: lc.coral, state: 'today' as const, tilt: 0 },
  { day: 'FRI', icon: 'bulb', color: '#cfd8c8', state: 'locked' as const, tilt: 0 },
  { day: 'SAT', icon: 'gift', color: '#cfd8c8', state: 'locked' as const, tilt: 0 },
  { day: 'SUN', icon: 'crown', color: '#cfd8c8', state: 'locked' as const, tilt: 0 },
]

const LOOP = [
  { icon: 'book', title: 'Pick a path', desc: 'Public speaking, storytelling, pitching. Choose what matters to you today.', color: lc.blue },
  { icon: 'chat', title: 'Pick a coach', desc: 'Supportive, funny, bossy. Set the exact energy you want in your ear.', color: lc.purple },
  { icon: 'mic', title: 'Speak out loud', desc: 'Answer a real scenario. Sixty seconds, spoken, not typed or overthought.', color: lc.coral },
  { icon: 'star', title: 'Collect your sticker', desc: 'Instant scores on delivery, clarity and confidence, then keep your streak alive.', color: lc.green },
]

// Names match the six real product categories (app/dashboard/page.tsx).
const CATEGORIES = [
  { name: 'Public Speaking', desc: 'From a five-minute update to a full keynote, without the nerves.', icon: 'mic', color: lc.green },
  { name: 'Storytelling', desc: 'Craft narratives people actually remember and repeat.', icon: 'book', color: lc.yellow },
  { name: 'Creator Speaking', desc: 'Sound natural and hold attention on video, podcasts and recordings.', icon: 'camera', color: lc.coral },
  { name: 'Casual Conversation', desc: 'Build easy confidence for small talk and quick conversations.', icon: 'chat', color: lc.blue },
  { name: 'Workplace Communication', desc: 'Own meetings, reviews and the tough conversations that count.', icon: 'briefcase', color: lc.purple },
  { name: 'Pitch Anything', desc: 'Win over investors, customers and your team with clarity.', icon: 'target', color: lc.green },
]

// Trial terms mirror lib/check-session-limit.ts: 14 days, 10 sessions/day.
const PLANS = [
  { name: 'Free Trial', price: '$0', period: '', billNote: '14 days, then pick a plan', cta: 'START FREE', highlight: false, badge: '', features: ['Up to 10 sessions a day', 'Communication analysis', 'AI feedback summary', 'Daily streak & stickers'] },
  { name: 'Monthly', price: '$16.99', period: '/mo', billNote: 'Billed monthly', cta: 'GET STARTED', highlight: true, badge: 'MOST POPULAR', features: ['Unlimited sessions', 'Full analytics dashboard', 'Personalized AI coaching', 'All 6 paths & coaches'] },
  { name: 'Yearly', price: '$12.99', period: '/mo', billNote: 'Billed annually. Save 24%.', cta: 'GET STARTED', highlight: false, badge: '', features: ['Everything in Monthly', 'Priority support', 'Early access to new modules'] },
]

const FOOTER_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

// Shared bits ---------------------------------------------------------------

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: 12.5,
        letterSpacing: '0.14em',
        color: lc.green,
        background: '#eafaef',
        border: '2px solid #c7edd2',
        padding: '5px 14px',
        borderRadius: 999,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <h2
        className="text-[28px] lg:text-[42px]"
        style={{
          fontFamily: fontDisplay,
          fontWeight: 800,
          letterSpacing: '-0.9px',
          color: lc.ink,
          lineHeight: 1.02,
          margin: 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 15,
            color: lc.muted,
            marginTop: 10,
            fontWeight: 600,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {sub}
        </p>
      )}
    </>
  )
}

function PrimaryCta({ children, big = false }: { children: React.ReactNode; big?: boolean }) {
  return (
    <Link
      href="/auth/signup"
      style={{
        background: lc.green,
        color: '#fff',
        padding: big ? '16px 24px' : '14px 22px',
        borderRadius: 16,
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: big ? 15 : 14,
        letterSpacing: '0.02em',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: `0 5px 0 ${lc.greenDark}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  )
}

// Page ----------------------------------------------------------------------

export function LandingPage() {
  return (
    <div style={{ background: lc.pageBg, overflowX: 'hidden', color: lc.ink }}>
      <ButtonStyles />
      <LandingNav />

      {/* HERO */}
      <section className="mx-auto max-w-[1200px] px-[18px] pb-10 pt-[26px] lg:px-10 lg:pb-14 lg:pt-[52px]">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_1fr] lg:gap-[52px]">
          <div className="text-center lg:text-left">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#eafaef',
                border: '2px solid #c7edd2',
                color: lc.greenDark,
                fontWeight: 800,
                fontSize: 12.5,
                padding: '7px 15px',
                borderRadius: 999,
                marginBottom: 20,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: lc.green, display: 'inline-block' }} />
              Your personal AI speaking coach
            </div>
            <h1
              className="text-[44px] lg:text-[68px]"
              style={{ fontFamily: fontDisplay, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.2px', margin: '0 0 18px', color: lc.ink }}
            >
              Master your
              <br />
              <span style={{ color: lc.green }}>speaking skills.</span>
            </h1>
            <p
              className="mx-auto text-[15.5px] lg:mx-0 lg:text-[17px]"
              style={{ lineHeight: 1.6, color: lc.muted, maxWidth: 470, marginBottom: 26, fontWeight: 600 }}
            >
              Locuta helps you master communication through personalized, real-time AI coaching. Practice real
              scenarios, get instant feedback, and build the confidence to be heard, 60 seconds at a time.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-[14px] lg:justify-start">
              <PrimaryCta big>
                <Icon name="mic" size={19} color="#fff" />
                START 14 DAYS FREE TRIAL
              </PrimaryCta>
              <a
                href="#loop"
                style={{
                  background: '#fff',
                  color: '#7a8a72',
                  border: '2px solid #dfe7d6',
                  padding: '16px 22px',
                  borderRadius: 16,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 5px 0 #dfe7d6',
                  whiteSpace: 'nowrap',
                }}
              >
                SEE HOW IT WORKS
              </a>
            </div>
            <p
              className="text-center lg:text-left"
              style={{ fontSize: 13, color: lc.faint, fontWeight: 700, margin: '14px 0 0' }}
            >
              14 days free · no card required · start with one 60-second rep
            </p>
            <div className="mt-[34px] flex flex-wrap justify-center gap-4 lg:flex-nowrap lg:justify-start lg:gap-[22px]">
              {HERO_PROOF.map((p) => (
                <div key={p.small} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                      boxShadow: '0 3px 0 rgba(0,0,0,.12)',
                    }}
                  >
                    <Icon name={p.icon} size={18} color="#fff" />
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block', fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, color: lc.ink, lineHeight: 1 }}>
                      {p.big}
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: lc.faint, fontWeight: 700 }}>{p.small}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mascot + demo card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: -30, zIndex: 3 }}>
              <div
                style={{
                  position: 'relative',
                  background: '#fff',
                  border: `2px solid ${lc.sidebarBorder}`,
                  borderRadius: 16,
                  padding: '11px 16px',
                  fontFamily: fontDisplay,
                  fontWeight: 700,
                  fontSize: 14,
                  color: lc.ink,
                  boxShadow: `0 4px 0 ${lc.sidebarBorder}`,
                  marginBottom: 14,
                  animation: 'lp-float 4s ease-in-out infinite',
                }}
              >
                Ready for today&apos;s rep? <span style={{ color: lc.green }}>Let&apos;s go!</span>
                <span
                  style={{
                    position: 'absolute',
                    bottom: -9,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 14,
                    height: 14,
                    background: '#fff',
                    borderRight: `2px solid ${lc.sidebarBorder}`,
                    borderBottom: `2px solid ${lc.sidebarBorder}`,
                  }}
                />
              </div>
              <Mascot />
            </div>
            <div className="w-full max-w-[440px] lg:max-w-full">
              <DemoRecorder />
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ background: lc.green, overflow: 'hidden', padding: '13px 0', borderTop: `3px solid ${lc.greenDark}` }} aria-hidden="true">
        <div style={{ display: 'flex', gap: 30, width: 'max-content', alignItems: 'center', animation: 'lp-marquee 32s linear infinite' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: fontDisplay, fontWeight: 800, fontSize: 15, color: '#fff', whiteSpace: 'nowrap' }}
            >
              {t}
              <span style={{ fontSize: 13, opacity: 0.7 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* WHY IT MATTERS */}
      <section className="mx-auto max-w-[1120px] px-[18px] pb-7 pt-10 lg:px-10 lg:pb-10 lg:pt-[58px]">
        <div className="mb-7 text-center lg:mb-10">
          <Eyebrow>WHY IT MATTERS</Eyebrow>
          <SectionHeading sub="The good news: unlike talent, it's trainable. Here's what the research says.">
            Communication is the skill
            <br />
            that moves careers.
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3 lg:gap-[18px]">
          {RESEARCH.map((r) => (
            <div
              key={r.big}
              className="p-6 lg:p-7"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
            >
              <div className="text-[44px] lg:text-[52px]" style={{ fontFamily: fontDisplay, fontWeight: 800, color: lc.green, lineHeight: 1, marginBottom: 10 }}>
                {r.big}
              </div>
              <div style={{ fontSize: 14.5, color: lc.ink, lineHeight: 1.5, fontWeight: 700 }}>{r.text}</div>
              <div style={{ fontSize: 11.5, color: '#a3b099', fontWeight: 700, marginTop: 14, paddingTop: 12, borderTop: '2px solid #eef2e8' }}>
                {r.source}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY LOCUTA */}
      <section className="mx-auto max-w-[1120px] px-[18px] pb-11 pt-[34px] lg:px-10 lg:pb-16 lg:pt-11">
        <div className="mb-7 text-center lg:mb-[42px]">
          <Eyebrow>WHY LOCUTA</Eyebrow>
          <SectionHeading sub="Three things that turn nervous speakers into people others lean in to hear.">
            Built to make you a<br />
            confident communicator.
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3 lg:gap-[18px]">
          {WHY.map((w) => (
            <div
              key={w.title}
              className="p-6 lg:p-[30px]"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 24, boxShadow: `0 6px 0 ${lc.cardBorder}` }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 17,
                  background: lc.green,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 0 ${lc.greenDark}`,
                }}
              >
                <Icon name={w.icon} size={28} color="#fff" />
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, margin: '18px 0 8px', color: lc.ink, lineHeight: 1.1 }}>
                {w.title}
              </h3>
              <p style={{ fontSize: 13.5, color: lc.muted, lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{w.desc}</p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: '2px solid #eef2e8',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 13,
                  color: lc.greenDark,
                  lineHeight: 1.35,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: lc.green, flex: 'none' }} />
                {w.pill}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WEEKLY STICKERS */}
      <section className="mx-auto max-w-[1100px] px-[18px] pb-[34px] pt-2 lg:px-10 lg:pb-11">
        <div
          className="flex flex-col items-center gap-5 p-6 text-center lg:flex-row lg:justify-between lg:gap-8 lg:px-[34px] lg:py-[30px] lg:text-left"
          style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 26, boxShadow: `0 6px 0 ${lc.cardBorder}` }}
        >
          <div style={{ flex: 'none' }}>
            <h2 className="text-[22px] lg:text-[26px]" style={{ fontFamily: fontDisplay, fontWeight: 800, color: lc.ink, lineHeight: 1.05, margin: 0 }}>
              Collect a sticker
              <br />
              every day you show up.
            </h2>
            <p style={{ fontSize: 13.5, color: lc.muted, fontWeight: 600, marginTop: 8, maxWidth: 300 }}>
              Finish your daily rep, peel the sticker, keep the flame alive. Fill the week to unlock a rare one.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-[9px] lg:flex-nowrap lg:gap-[14px]">
            {WEEK.map((w) => {
              const base: React.CSSProperties = {
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }
              let style: React.CSSProperties
              let fg: string
              let labelColor: string
              if (w.state === 'done') {
                style = { ...base, background: w.color, boxShadow: '0 4px 0 rgba(0,0,0,.13)', transform: `rotate(${w.tilt}deg)` }
                fg = '#fff'
                labelColor = lc.muted
              } else if (w.state === 'today') {
                style = { ...base, background: w.color, boxShadow: `0 0 0 4px ${w.color}33, 0 4px 0 rgba(0,0,0,.13)` }
                fg = '#fff'
                labelColor = lc.coral
              } else {
                style = { ...base, background: '#f4f7f0', border: '2px dashed #d3ddc8' }
                fg = '#c2cdb6'
                labelColor = '#b5c2aa'
              }
              return (
                <div key={w.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <div className="h-[50px] w-[50px] lg:h-[58px] lg:w-[58px]" style={style}>
                    <Icon name={w.icon} size={24} color={fg} />
                  </div>
                  <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, color: labelColor }}>{w.day}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* THE DAILY LOOP */}
      <section id="loop" className="mx-auto max-w-[1180px] scroll-mt-20 px-[18px] py-11 lg:px-10 lg:py-16">
        <div className="mb-[30px] text-center lg:mb-[42px]">
          <Eyebrow>THE DAILY LOOP</Eyebrow>
          <SectionHeading>Four taps. Sixty seconds.</SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4 lg:gap-[18px]">
          {LOOP.map((s, i) => (
            <div
              key={s.title}
              className="p-5 lg:p-6"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 58,
                  height: 58,
                  borderRadius: 17,
                  background: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 0 rgba(0,0,0,.13)',
                }}
              >
                <Icon name={s.icon} size={30} color="#fff" />
                <span
                  style={{
                    position: 'absolute',
                    top: -9,
                    right: -9,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#fff',
                    color: s.color,
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${s.color}`,
                  }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, margin: '18px 0 6px', color: lc.ink }}>{s.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: lc.muted, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SKILL PATHS */}
      <section id="categories" className="mx-auto max-w-[1180px] scroll-mt-20 px-[18px] py-11 lg:px-10 lg:py-16">
        <div className="mb-9 text-center">
          <Eyebrow>SKILL PATHS</Eyebrow>
          <SectionHeading sub="Six skill paths built with speaking experts, covering the situations that matter most.">
            Pick a path. Level it up.
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]">
          {CATEGORIES.map((c) => (
            <div
              key={c.name}
              className="p-5 lg:p-6"
              style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 17,
                  background: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 0 rgba(0,0,0,.13)',
                }}
              >
                <Icon name={c.icon} size={30} color="#fff" />
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 19, color: lc.ink, lineHeight: 1.1, margin: '16px 0 6px' }}>
                {c.name}
              </h3>
              <p style={{ fontSize: 13.5, color: lc.muted, lineHeight: 1.5, fontWeight: 600, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COACHES */}
      <section
        id="tones"
        className="scroll-mt-20 px-[18px] py-11 lg:px-10 lg:py-16"
        style={{ background: '#fff', borderTop: `2px solid ${lc.cardBorder}`, borderBottom: `2px solid ${lc.cardBorder}` }}
      >
        <div className="mb-8 text-center">
          <Eyebrow>PICK YOUR COACH</Eyebrow>
          <SectionHeading sub="Same lesson, six coaches in your ear. Pick the energy you want, then switch anytime, even mid-streak.">
            Six voices. Your kind of energy.
          </SectionHeading>
        </div>
        <ToneShowcase />
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-20 px-[18px] py-11 lg:px-10 lg:py-16" style={{ background: '#f4f9ef' }}>
        <div className="mb-10 text-center">
          <Eyebrow>JOIN THE CLUB</Eyebrow>
          <SectionHeading>Start free. Keep improving.</SectionHeading>
        </div>
        <div className="mx-auto grid max-w-[1040px] grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`p-6 lg:p-[30px] ${p.highlight ? 'lg:scale-[1.04]' : ''}`}
              style={{
                position: 'relative',
                background: '#fff',
                border: `3px solid ${p.highlight ? lc.green : '#e2ead9'}`,
                borderRadius: 24,
                boxShadow: `0 6px 0 ${p.highlight ? lc.greenDark : '#dbe4d2'}`,
              }}
            >
              {p.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: lc.yellow,
                    color: '#7a5600',
                    padding: '6px 16px',
                    borderRadius: 999,
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 3px 0 ${lc.yellowDark}`,
                  }}
                >
                  {p.badge}
                </div>
              )}
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, marginBottom: 14, color: lc.ink }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span className="text-[34px] lg:text-[40px]" style={{ fontFamily: fontDisplay, fontWeight: 800, color: lc.ink }}>
                  {p.price}
                </span>
                <span style={{ fontSize: 14, color: lc.faint, fontWeight: 800 }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 12.5, color: lc.faint, marginBottom: 22, fontWeight: 700 }}>{p.billNote}</div>
              <Link
                href="/auth/signup"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  background: p.highlight ? lc.green : '#fff',
                  color: p.highlight ? '#fff' : lc.ink,
                  border: p.highlight ? 0 : '2px solid #dfe7d6',
                  padding: 14,
                  borderRadius: 14,
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  boxShadow: `0 4px 0 ${p.highlight ? lc.greenDark : '#dfe7d6'}`,
                  boxSizing: 'border-box',
                }}
              >
                {p.cta}
              </Link>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#556150', lineHeight: 1.4, fontWeight: 700 }}>
                    <span
                      style={{
                        color: '#fff',
                        fontWeight: 900,
                        flex: 'none',
                        background: lc.green,
                        width: 19,
                        height: 19,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1180px] px-[18px] py-11 lg:px-10 lg:py-16">
        <div className="mb-7 text-center">
          <Eyebrow>GOOD QUESTIONS</Eyebrow>
          <SectionHeading>Frequently asked questions.</SectionHeading>
        </div>
        <FaqSection />
      </section>

      {/* FINAL CTA */}
      {/* Compact by design. This was a full-height slab with a mascot sitting on
          a white disc — the disc existed only because a green mascot on a green
          band is invisible, and a plate added purely to solve contrast always
          reads as tacked on. The mascot already greets people in the hero, so
          repeating it here bought nothing and cost a lot of height. What a
          closing CTA needs is one line, one reason, one button. */}
      <section
        className="px-5 py-8 lg:px-11 lg:py-10"
        style={{ background: lc.green, color: '#fff', borderTop: `4px solid ${lc.greenDark}` }}
      >
        <div
          className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:text-left"
        >
          <div>
            <h2
              className="text-[22px] lg:text-[29px]"
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                lineHeight: 1.18,
                margin: 0,
                color: '#fff',
                // Stops the last word dropping alone onto a second line, which
                // left an orphaned "be." hanging under the headline.
                textWrap: 'balance',
              }}
            >
              Become the confident communicator you want to be.
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,.9)',
                fontWeight: 700,
                margin: '6px 0 0',
              }}
            >
              One 60-second rep today. 14 days free, no card required.
            </p>
          </div>

          <div style={{ flex: 'none' }}>
            <Button href="/auth/signup" variant="onDark" size="md">
              <Icon name="mic" size={17} color={lc.greenText} />
              START YOUR FREE TRIAL
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: lc.pageBg }} className="px-[14px] pt-6 lg:px-10 lg:pt-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-[18px] py-6 lg:px-10 lg:py-[30px]">
          <LocutaLogo size={28} />
          <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{ textDecoration: 'none', color: '#7a8a72', fontWeight: 700, fontSize: 13 }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ fontSize: 13, color: lc.faint, fontWeight: 700 }}>© 2026 Locuta.ai. Train your speaking brain.</div>
        </div>
      </footer>
    </div>
  )
}
