import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyScore } from '@/lib/quick-score-token'
import { promptById } from '@/lib/quick-score'
import { createClient } from '@/lib/supabase/server'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { ScoreCard } from '@/components/landing/ScoreCard'

// Public share card for a quick-score result. Stateless — everything is decoded
// from the signed token in the URL, so there's no DB lookup and the link works
// forever. The interactive card (confetti, count-up, feedback) lives in the
// ScoreCard client component; this server page handles the token, metadata and
// owner-vs-stranger check.

export const dynamic = 'force-dynamic'

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

  // Owner vs stranger — only changes the CTA + whether feedback shows. Never
  // blocks the page.
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

      <ScoreCard
        overall={score.overall}
        topic={topic}
        clarity={score.clarity}
        confidence={score.confidence}
        wpm={score.wpm}
        filler={score.filler}
        strengths={score.strengths}
        improvements={score.improvements}
        isOwner={isOwner}
        shareText={shareText}
      />
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
