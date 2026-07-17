import { lc, fontDisplay } from './tokens'
import { Icon } from './icons'

// The 6 coaching tones. This is a SHOWCASE, not a picker — on the landing page
// the visitor isn't choosing anything yet, so there are no check circles, no
// selected state, and no button semantics. Each card just shows a voice, in its
// own colour, so the section reads as "here are your six coaches" rather than
// "select one now".
const TONES = [
  { name: 'Normal', tag: 'everyday', icon: 'ic-chat', desc: 'Clear, simple, everyday conversational style.', color: lc.green },
  { name: 'Supportive', tag: 'gentle', icon: 'ic-heart', desc: 'Soft, kind and reassuring, like a supportive friend.', color: lc.coral },
  { name: 'Inspiring', tag: 'high energy', icon: 'ic-bolt', desc: 'Energizing and passionate, like a motivational coach.', color: lc.yellowDark },
  { name: 'Funny', tag: 'playful', icon: 'ic-smile', desc: 'Entertaining, playful and casual with light humor.', color: lc.blue },
  { name: 'Diplomatic', tag: 'balanced', icon: 'ic-crown', desc: 'Calm, professional and trustworthy. A balanced approach.', color: lc.purple },
  { name: 'Bossy', tag: 'no-nonsense', icon: 'ic-shield', desc: 'Commanding, no-nonsense, authoritative leadership.', color: '#f2545b' },
]

export function ToneShowcase() {
  return (
    <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-[14px] lg:grid-cols-2">
      {TONES.map((t) => (
        <div
          key={t.name}
          className="transition-transform duration-150 hover:-translate-y-[3px]"
          style={{
            display: 'flex',
            gap: 15,
            alignItems: 'center',
            background: '#fff',
            border: `2px solid ${lc.cardBorder}`,
            borderRadius: 18,
            padding: '16px 18px',
            boxShadow: `0 4px 0 ${lc.cardBorder}`,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${t.color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <Icon id={t.icon} size={26} color={t.color} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16.5, color: lc.ink }}>{t.name}</span>
              <span
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 9.5,
                  color: t.color,
                  background: `${t.color}18`,
                  padding: '3px 9px',
                  borderRadius: 999,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {t.tag}
              </span>
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: lc.muted, lineHeight: 1.45, marginTop: 3, fontWeight: 600 }}>
              {t.desc}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
