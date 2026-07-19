import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'
import { MarketingShell, MarketingCard } from '@/components/marketing/MarketingShell'

export const metadata = { title: 'About · Locuta' }

const VALUES = [
  { icon: 'ic-mic', color: lc.green, title: 'Reps beat theory', text: 'You get better at speaking by speaking. Locuta is built around short daily reps, not long lectures you never finish.' },
  { icon: 'ic-shield', color: lc.coral, title: 'Private by default', text: "Nobody hears your practice but you. No live audience, no judgement — just a space to be bad until you're good." },
  { icon: 'ic-chat', color: lc.blue, title: 'Coaching, your way', text: 'Six coaching voices, from gentle to no-nonsense. The feedback fits how you like to be pushed.' },
  { icon: 'ic-flame', color: lc.yellow, title: 'Small, sticky habits', text: 'Streaks and stickers exist for one reason: to get you back tomorrow. Sixty seconds a day compounds.' },
]

export default function AboutPage() {
  return (
    <MarketingShell eyebrow="OUR STORY" title="Train your speaking brain." subtitle="Locuta is a speaking gym: a private place to do one short rep a day and slowly become the communicator you want to be.">
      <MarketingCard style={{ padding: 30, marginBottom: 22 }}>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4a5645', fontWeight: 600, margin: 0 }}>
          Most people don&apos;t freeze up in conversations because they lack ideas — they freeze because they never
          practise saying them out loud. Reading tips doesn&apos;t fix that. Reps do. We built Locuta so anyone can get
          real, personalised feedback on their own speaking, as often as they like, without booking a coach or
          performing in front of a room.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4a5645', fontWeight: 600, margin: '16px 0 0' }}>
          One 60-second rep, an AI coach in the voice you choose, and a score you can actually move. That&apos;s the
          whole idea.
        </p>
      </MarketingCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {VALUES.map((v) => (
          <MarketingCard key={v.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 3px 0 rgba(0,0,0,.12)' }}>
                <Icon id={v.icon} size={20} color="#fff" />
              </span>
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, margin: 0 }}>{v.title}</h3>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: lc.muted, fontWeight: 600, margin: 0 }}>{v.text}</p>
          </MarketingCard>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: lc.green, color: '#fff', padding: '15px 28px', borderRadius: 15, fontFamily: fontDisplay, fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: `0 5px 0 ${lc.greenDark}` }}>
          <Icon id="ic-mic" size={18} color="#fff" />
          START YOUR FREE TRIAL
        </Link>
      </div>
    </MarketingShell>
  )
}
