import { lc } from './tokens'

// The Locuta mascot — green rounded blob with eyes, smile and cheeks,
// built from CSS shapes exactly as specified in the design handoff.
// (Handoff note: consider commissioning illustrated art later; this CSS
// version defines the intended personality.)

export function Mascot() {
  const eye: React.CSSProperties = {
    width: 26,
    height: 30,
    background: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 5,
    animation: 'lp-blink 5s ease-in-out infinite',
  }
  const pupil: React.CSSProperties = {
    width: 11,
    height: 11,
    background: lc.ink,
    borderRadius: '50%',
  }
  const cheek: React.CSSProperties = {
    position: 'absolute',
    top: 56,
    width: 15,
    height: 9,
    background: '#ff9ba8',
    borderRadius: '50%',
    opacity: 0.75,
  }
  const bump: React.CSSProperties = {
    position: 'absolute',
    top: -10,
    width: 44,
    height: 44,
    background: lc.green,
    borderRadius: '50%',
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 132,
        height: 120,
        animation: 'lp-bob 4.5s ease-in-out infinite',
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
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <div style={eye}><div style={pupil} /></div>
          <div style={eye}><div style={pupil} /></div>
        </div>
        <div
          style={{
            width: 30,
            height: 16,
            border: `3.5px solid ${lc.ink}`,
            borderTop: 0,
            borderRadius: '0 0 24px 24px',
          }}
        />
        <div style={{ ...cheek, left: 20 }} />
        <div style={{ ...cheek, right: 20 }} />
      </div>
    </div>
  )
}
