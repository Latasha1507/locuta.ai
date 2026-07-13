import { lc } from './tokens'

// The Locuta mascot — a green blob built from CSS shapes.
//
// Moods drive the auth screens' signature interaction:
//   happy — default: blinking, smiling (used on the landing page)
//   shy   — covers its eyes with both hands (while a password is typed)
//   cheer — eyes squeezed shut, big open smile (success moments)
//   oops  — flat mouth (error states)
export type MascotMood = 'happy' | 'shy' | 'cheer' | 'oops'

export function Mascot({ mood = 'happy' }: { mood?: MascotMood }) {
  const eye: React.CSSProperties = {
    width: 26,
    height: mood === 'cheer' ? 6 : 30,
    background: '#fff',
    borderRadius: mood === 'cheer' ? 4 : '50%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: mood === 'cheer' ? 0 : 5,
    transition: 'height .2s ease, border-radius .2s ease, padding .2s ease',
    animation: mood === 'happy' ? 'lp-blink 5s ease-in-out infinite' : undefined,
  }
  const pupil: React.CSSProperties = {
    width: 11,
    height: 11,
    background: lc.ink,
    borderRadius: '50%',
    opacity: mood === 'cheer' ? 0 : 1,
    transition: 'opacity .2s ease',
  }
  const cheek: React.CSSProperties = {
    position: 'absolute',
    top: 56,
    width: 15,
    height: 9,
    background: '#ff9ba8',
    borderRadius: '50%',
    opacity: mood === 'shy' ? 1 : 0.75,
    transition: 'opacity .2s ease',
  }
  const bump: React.CSSProperties = {
    position: 'absolute',
    top: -10,
    width: 44,
    height: 44,
    background: lc.green,
    borderRadius: '50%',
  }
  // Hands swing up over the eyes when shy.
  //
  // Geometry (measured from the rendered DOM, not guessed): the eyes occupy
  // x 32–58 / x 74–100, y 39–69 inside the 132px face. Because the hands are
  // ellipses (border-radius 50%), a bounding box that merely overlaps the eyes
  // still leaves their outer corners poking out. These values make each ellipse
  // fully *contain* its eye rect: centre (44,50) / (88,50), rx 26, ry 24.
  const hand: React.CSSProperties = {
    position: 'absolute',
    top: 26,
    width: 52,
    height: 48,
    background: lc.green,
    border: `3px solid ${lc.greenDark}`,
    borderRadius: '50% 50% 45% 45%',
    zIndex: 4,
    transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s ease',
    transform: mood === 'shy' ? 'translateY(0) scale(1)' : 'translateY(30px) scale(.6)',
    opacity: mood === 'shy' ? 1 : 0,
    pointerEvents: 'none',
  }

  let mouth: React.CSSProperties
  if (mood === 'cheer') {
    mouth = { width: 34, height: 22, background: '#3f3f3f', borderRadius: '4px 4px 20px 20px' }
  } else if (mood === 'oops') {
    mouth = { width: 26, height: 4, background: lc.ink, borderRadius: 4, margin: '6px 0' }
  } else {
    mouth = {
      width: 30,
      height: 16,
      border: `3.5px solid ${lc.ink}`,
      borderTop: 0,
      borderRadius: '0 0 24px 24px',
    }
  }

  return (
    <div
      data-mascot-mood={mood}
      style={{
        position: 'relative',
        width: 132,
        height: 120,
        animation:
          mood === 'cheer'
            ? 'lp-pop .45s ease both, lp-bob 2.4s ease-in-out .45s infinite'
            : 'lp-bob 4.5s ease-in-out infinite',
      }}
      aria-hidden="true"
    >
      <div style={{ ...bump, left: 22 }} />
      <div style={{ ...bump, right: 22 }} />
      <div
        style={{
          position: 'absolute',
          inset: '6px 0 0',
          background: lc.green,
          borderRadius: '44% 44% 46% 46%/40% 40% 60% 60%',
          boxShadow: `inset 0 -8px 0 rgba(0,0,0,.08), 0 8px 0 ${lc.greenDark}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, height: 30, alignItems: 'center' }}>
          <div style={eye}><div style={pupil} /></div>
          <div style={eye}><div style={pupil} /></div>
        </div>
        <div style={mouth} />
        <div style={{ ...cheek, left: 20 }} />
        <div style={{ ...cheek, right: 20 }} />
      </div>
      <div style={{ ...hand, left: 18 }} />
      <div style={{ ...hand, right: 18 }} />
    </div>
  )
}
