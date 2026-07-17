import { lc, fontDisplay } from '@/components/landing/tokens'
import { MarketingShell, MarketingCard } from '@/components/marketing/MarketingShell'

export const metadata = { title: 'Blog · Locuta' }

// Placeholder posts until the real blog/CMS is wired. Kept honest — these link
// nowhere yet rather than faking article pages that 404.
const POSTS = [
  { tag: 'PRACTICE', color: lc.green, title: 'Why 60 seconds a day beats an hour a week', excerpt: 'Short, frequent reps build speaking fluency faster than rare marathon sessions. Here\u2019s the reasoning — and how to make the habit stick.' },
  { tag: 'CONFIDENCE', color: lc.blue, title: 'Filler words aren\u2019t the enemy you think they are', excerpt: 'Cutting every "um" can make you sound robotic. What actually moves the needle on sounding confident.' },
  { tag: 'INTERVIEWS', color: lc.coral, title: 'The 3-sentence answer that nails "tell me about yourself"', excerpt: 'A simple structure you can rehearse in a week that works for almost any interview opener.' },
  { tag: 'STORYTELLING', color: lc.purple, title: 'Show, don\u2019t tell: making people feel your point', excerpt: 'Concrete detail beats abstract claims. A quick framework for turning flat updates into stories people remember.' },
]

export default function BlogPage() {
  return (
    <MarketingShell eyebrow="THE BLOG" title="Speak better, one idea at a time." subtitle="Short reads on practice, confidence and communication. New posts land here soon.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {POSTS.map((p) => (
          <MarketingCard key={p.title} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ alignSelf: 'flex-start', fontFamily: fontDisplay, fontWeight: 800, fontSize: 10, letterSpacing: '0.06em', color: p.color, background: `${p.color}18`, padding: '4px 11px', borderRadius: 999, marginBottom: 12 }}>
              {p.tag}
            </span>
            <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, lineHeight: 1.2, margin: '0 0 8px' }}>{p.title}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: lc.muted, fontWeight: 600, margin: '0 0 14px' }}>{p.excerpt}</p>
            <span style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5, color: lc.faint }}>
              Coming soon
            </span>
          </MarketingCard>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 13.5, color: lc.faint, fontWeight: 600, marginTop: 28 }}>
        Want these in your inbox? Turn on the weekly email in your settings once you&apos;ve signed up.
      </p>
    </MarketingShell>
  )
}
