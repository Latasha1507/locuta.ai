import { ImageResponse } from 'next/og'
import { verifyScore } from '@/lib/quick-score-token'
import { promptById, verdict } from '@/lib/quick-score'

// Dynamically generated share PNG. Doubles as the link-unfurl image (WhatsApp,
// X, iMessage, Slack…) and the "Save image" download for IG/TikTok stories.
// Everything is decoded from the signed token — no DB, no fonts to fetch.

export const runtime = 'nodejs'
export const alt = 'My Locuta speaking score'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const score = verifyScore(token)
  const topic = score ? promptById(score.promptId)?.topic ?? 'Speaking' : 'Speaking'
  const overall = score?.overall ?? 0

  const chip = (label: string, value: string) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.16)',
        borderRadius: 20,
        padding: '18px 26px',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800 }}>{value}</div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #3fce6f 0%, #2fa552 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          padding: '58px 68px',
        }}
      >
        {/* top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: '#fff',
                color: '#2fa552',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                fontWeight: 800,
              }}
            >
              L
            </div>
            <div style={{ fontSize: 40, fontWeight: 800 }}>Locuta</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, opacity: 0.9 }}>30-SECOND SPEAKING TEST</div>
        </div>

        {/* middle */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 44 }}>
          <div style={{ display: 'flex', fontSize: 300, fontWeight: 800, lineHeight: 1 }}>{overall}</div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 34, gap: 14 }}>
            <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.9 }}>{`out of 100 · ${verdict(overall)}`}</div>
            <div style={{ fontSize: 56, fontWeight: 800 }}>{topic}</div>
            <div
              style={{
                display: 'flex',
                background: '#fff',
                color: '#2fa552',
                fontSize: 44,
                fontWeight: 800,
                padding: '6px 26px',
                borderRadius: 16,
              }}
            >
              BEAT ME.
            </div>
          </div>
        </div>

        {/* bottom chips */}
        <div style={{ display: 'flex', gap: 18 }}>
          {chip('Filler', String(score?.filler ?? 0))}
          {chip('Pace', `${score?.wpm ?? 0} wpm`)}
          {chip('Clarity', String(score?.clarity ?? 0))}
          {chip('Confidence', String(score?.confidence ?? 0))}
        </div>
      </div>
    ),
    { ...size },
  )
}
