import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'
import { MarketingShell, MarketingCard } from '@/components/marketing/MarketingShell'

export const metadata = { title: 'Use cases · Locuta' }

const CASES = [
  { icon: 'ic-briefcase', color: lc.blue, title: 'Job interviews', text: 'Rehearse "tell me about yourself" and tough behavioural questions until your answers land clean and confident.', path: 'workplace-communication' },
  { icon: 'ic-mic', color: lc.green, title: 'Public speaking', text: 'Practise talks, toasts and presentations out loud — pacing, hooks, and finishing strong without notes.', path: 'public-speaking' },
  { icon: 'ic-camera', color: lc.coral, title: 'Content creators', text: 'Get to camera-ready delivery: crisp intros, natural energy, and fewer takes to a clip you\u2019d actually post.', path: 'creator-speaking' },
  { icon: 'ic-chat', color: lc.purple, title: 'Everyday conversation', text: 'Small talk, networking, saying the thing you meant to say — the reps that make you smoother in the moment.', path: 'casual-conversation' },
  { icon: 'ic-target', color: lc.yellowDark, title: 'Pitching', text: 'Sharpen an investor pitch or a sales ask so the value is obvious in the first fifteen seconds.', path: 'pitch-anything' },
  { icon: 'ic-book', color: lc.teal, title: 'Storytelling', text: 'Turn flat anecdotes into stories people lean in for — structure, detail, and a payoff that sticks.', path: 'storytelling' },
]

export default function UseCasesPage() {
  return (
    <MarketingShell eyebrow="WHERE IT HELPS" title="Whatever you need to say better." subtitle="Six paths, one habit. Pick the situation you keep freezing in and practise it until it feels easy.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c) => (
          <MarketingCard key={c.title}>
            <span style={{ width: 44, height: 44, borderRadius: 13, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon id={c.icon} size={22} color={c.color} />
            </span>
            <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17.5, margin: '0 0 8px' }}>{c.title}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: lc.muted, fontWeight: 600, margin: '0 0 14px' }}>{c.text}</p>
            <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: lc.greenDark, textDecoration: 'none' }}>
              Try this path <Icon id="ic-arrow" size={13} color={lc.greenDark} />
            </Link>
          </MarketingCard>
        ))}
      </div>
    </MarketingShell>
  )
}
