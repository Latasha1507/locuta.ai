import { lc, fontDisplay } from './tokens'

// 2-tone line icons from the design handoff (viewBox 0 0 64 64, stroke ~4,
// currentColor). Rendered once as a hidden sprite, referenced via <use>.

export function LandingIconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="ic-mic" viewBox="0 0 64 64"><path d="M32 6c6 0 9 4 9 9v16c0 6-4 9-9 9s-9-3-9-9V15c0-5 3-9 9-9z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 28c0 10 6 17 14 17s14-7 14-17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M32 45v10M24 56h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></symbol>
        <symbol id="ic-flame" viewBox="0 0 64 64"><path d="M32 6c3 8-6 11-6 19 0 3 1 5 3 6-3-1-6-4-6-9 0 0-9 8-9 20 0 11 8 18 18 18s18-7 18-18c0-9-5-15-8-20 1 5-2 8-5 8-4 0-6-3-6-7 0-6 5-9 1-17z" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="ic-chat" viewBox="0 0 64 64"><path d="M8 18c0-6 5-10 12-10h24c7 0 12 4 12 10v16c0 6-5 10-12 10H26l-10 9v-9h-4c-3 0-4-4-4-10z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><circle cx="22" cy="26" r="2.6" fill="currentColor"/><circle cx="32" cy="26" r="2.6" fill="currentColor"/><circle cx="42" cy="26" r="2.6" fill="currentColor"/></symbol>
        <symbol id="ic-book" viewBox="0 0 64 64"><path d="M32 14c-5-4-13-5-22-4v34c9-1 17 0 22 4 5-4 13-5 22-4V10c-9-1-17 0-22 4z" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinejoin="round"/><path d="M32 14v34" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"/></symbol>
        <symbol id="ic-briefcase" viewBox="0 0 64 64"><rect x="8" y="22" width="48" height="30" rx="7" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M23 22v-4c0-3 2-5 5-5h8c3 0 5 2 5 5v4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 34h48" stroke="currentColor" strokeWidth="3.4"/></symbol>
        <symbol id="ic-camera" viewBox="0 0 64 64"><rect x="6" y="18" width="38" height="28" rx="7" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M44 27l12-7v24l-12-7z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><circle cx="25" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="3.4"/></symbol>
        <symbol id="ic-bulb" viewBox="0 0 64 64"><path d="M32 8c10 0 17 7 17 16 0 7-4 11-7 15-2 2-3 4-3 7H25c0-3-1-5-3-7-3-4-7-8-7-15 0-9 7-16 17-16z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M27 52h10M28 58h8" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"/></symbol>
        <symbol id="ic-trophy" viewBox="0 0 64 64"><path d="M20 10h24v14c0 8-5 14-12 14s-12-6-12-14z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M20 14c-7-1-10 3-10 8s4 9 11 9M44 14c7-1 10 3 10 8s-4 9-11 9" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"/><path d="M32 38v8M24 54h16l-2-8H26z" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinejoin="round" strokeLinecap="round"/></symbol>
        <symbol id="ic-gift" viewBox="0 0 64 64"><rect x="10" y="26" width="44" height="30" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M10 36h44M32 26v30" stroke="currentColor" strokeWidth="3.4"/><path d="M32 26c-6-10-20-8-14 0M32 26c6-10 20-8 14 0" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="ic-star" viewBox="0 0 64 64"><path d="M32 6l7 16 17 2-13 12 4 17-15-9-15 9 4-17-13-12 17-2z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></symbol>
        <symbol id="ic-crown" viewBox="0 0 64 64"><path d="M10 46l-3-24 13 10 12-18 12 18 13-10-3 24z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M10 46h44v6H10z" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round"/></symbol>
        <symbol id="ic-target" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="3.4"/><circle cx="32" cy="32" r="4" fill="currentColor"/></symbol>
        <symbol id="ic-heart" viewBox="0 0 64 64"><path d="M32 54S10 39 10 23c0-8 6-13 12-13 5 0 8 3 10 6 2-3 5-6 10-6 6 0 12 5 12 13 0 16-22 31-22 31z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></symbol>
        <symbol id="ic-bolt" viewBox="0 0 64 64"><path d="M36 6L15 37h13l-3 21 24-33H35z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></symbol>
        <symbol id="ic-smile" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="24" cy="27" r="2.8" fill="currentColor"/><circle cx="40" cy="27" r="2.8" fill="currentColor"/><path d="M22 38c3 5 15 5 20 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></symbol>
        <symbol id="ic-cog" viewBox="0 0 64 64"><circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M32 3v9M32 52v9M3 32h9M52 32h9M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></symbol>
        <symbol id="ic-grid" viewBox="0 0 64 64"><rect x="9" y="9" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="36" y="9" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="9" y="36" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="36" y="36" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/></symbol>
        <symbol id="ic-clock" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M32 18v15l10 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="ic-out" viewBox="0 0 64 64"><path d="M26 12H14c-2 0-4 2-4 4v32c0 2 2 4 4 4h12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M38 20l12 12-12 12M22 32h28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="ic-arrow" viewBox="0 0 64 64"><path d="M14 32h34M34 18l16 14-16 14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="ic-shield" viewBox="0 0 64 64"><path d="M32 6l20 7v13c0 14-9 24-20 28-11-4-20-14-20-28V13z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M23 31l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
      </defs>
    </svg>
  )
}

export function Icon({
  id,
  size = 24,
  color,
  className,
}: {
  id: string
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={color ? { color } : undefined}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${id}`} />
    </svg>
  )
}

// Brand lockup: green rounded square with 3 white audio bars + "locuta" wordmark.
export function LocutaLogo({ size = 36 }: { size?: number }) {
  const bar = (h: number) => ({
    width: Math.max(3, Math.round(size / 9)),
    height: h,
    background: '#fff',
    borderRadius: 2,
  })
  const s = size / 36 // scale relative to the 36px reference
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span
        style={{
          width: size,
          height: size,
          background: lc.green,
          borderRadius: Math.round(size / 3),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          boxShadow: `0 ${Math.max(2, Math.round(3 * s))}px 0 ${lc.greenDark}`,
        }}
        aria-hidden="true"
      >
        <span style={{ display: 'flex', gap: 2.5 * s, alignItems: 'center' }}>
          <span style={bar(9 * s)} />
          <span style={bar(16 * s)} />
          <span style={bar(11 * s)} />
        </span>
      </span>
      <span
        style={{
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: Math.round(23 * s),
          letterSpacing: '-0.5px',
          color: lc.greenText,
        }}
      >
        locuta
      </span>
    </span>
  )
}
