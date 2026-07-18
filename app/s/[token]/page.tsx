import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyScore } from '@/lib/quick-score-token'
import { promptById, verdict } from '@/lib/quick-score'
import { createClient } from '@/lib/supabase/server'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { ShareActions } from '@/components/landing/ShareActions'

// Public share card for a quick-score result. Stateless — everything is decoded
// from the signed token in the URL, so there's no DB lookup and the link works
// forever. Owners (freshly signed in) get a "practise to improve" CTA; strangers
// who clicked a shared link get a "beat this" CTA that funnels them into the tool.

export const dynamic = 'force-dynamic'

function scoreColor(o: number): string {
  if (o >= 75) return lc.green
  if (o >= 60) return lc.blue
  if (o >= 45) return lc.orange
  return lc.coral
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const score = verifyScore(token)
  if (!score) {
    return {
      title: 'Speaking score · Locuta',
      description: 'Take the free 30-second speaking test on Locuta.',
    }
  }
  const topic = promptById(score.promptId)?.topic ?? 'Speaking'
  const title = `I scored ${score.overall} on ${topic}. Beat me.`
  const description = 'Take the free 30-second speaking test on Locuta and see how you actually sound.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const score = verifyScore(token)

  if (!score) return <InvalidCard />

  const topic = promptById(score.promptId)?.topic ?? 'Speaking'
  const color = scoreColor(score.overall)

  // Owner vs stranger — only changes the CTA. Never blocks the page.
  let isOwner = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isOwner = !!user
  } catch {
    isOwner = false
  }

  const shareText = `I scored ${score.overall} on ${topic} on Locuta. Beat me. 🎤`

  const stats = [
    { label: 'Filler words', value: String(score.filler), color: lc.coral },
    { label: 'Pace', value: `${score.wpm} wpm`, color: lc.blue },
    { label: 'Clarity', value: String(score.clarity), color: lc.purple },
    { label: 'Confidence', value: String(score.confidence), color: lc.green },
  ]

  return (
    <main
      style={{
        fontFamily: fontBody,
        minHeight: '100vh',
        background: lc.pageBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 56px',
      }}
    >
      <Link
        href="/"
        style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: lc.greenDark, textDecoration: 'none', marginBottom: 20 }}
      >
        Locuta
      </Link>

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          border: `2px solid ${lc.cardBorder}`,
          borderRadius: 26,
          boxShadow: `0 10px 0 ${lc.cardBorder}`,
          padding: '28px 24px 26px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: lc.faint, letterSpacing: '0.06em' }}>
            30-SECOND SPEAKING TEST
          </div>
          <div
            style={{
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 88,
              lineHeight: 1,
              color,
              margin: '10px 0 2px',
            }}
          >
            {score.overall}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: lc.faint }}>
            out of 100 · {verdict(score.overall)}
          </div>
          <div
            style={{
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 26,
              color: '#2c3a26',
              marginTop: 14,
            }}
          >
            {topic}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 20 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: '#f7faf4',
                border: `2px solid ${lc.cardBorder}`,
                borderRadius: 14,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 800, color: lc.faint }}>{s.label}</div>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: s.color, marginTop: 2 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <ShareActions shareText={shareText} />
        </div>
      </div>

      {/* CTA — owner practises, stranger takes the test */}
      <div style={{ marginTop: 22, textAlign: 'center' }}>
        {isOwner ? (
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 16,
              color: lc.greenDark,
              textDecoration: 'none',
            }}
          >
            Want to fix it? Start practising →
          </Link>
        ) : (
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: lc.green,
              color: '#fff',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
              padding: '15px 26px',
              borderRadius: 16,
              boxShadow: `0 6px 0 ${lc.greenDark}`,
            }}
          >
            Think you can beat {score.overall}? Take the free test →
          </Link>
        )}
      </div>
    </main>
  )
}

function InvalidCard() {
  return (
    <main
      style={{
        fontFamily: fontBody,
        minHeight: '100vh',
        background: lc.pageBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 26, color: '#2c3a26' }}>
        This score link is invalid
      </div>
      <div style={{ color: lc.faint, fontWeight: 700, marginTop: 8, maxWidth: 360 }}>
        The link may be broken or incomplete. Take the free 30-second test and get your own score.
      </div>
      <Link
        href="/"
        style={{
          marginTop: 20,
          background: lc.green,
          color: '#fff',
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 15,
          textDecoration: 'none',
          padding: '14px 24px',
          borderRadius: 14,
          boxShadow: `0 5px 0 ${lc.greenDark}`,
        }}
      >
        Take the test →
      </Link>
    </main>
  )
}
