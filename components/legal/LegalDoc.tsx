import { lc, fontDisplay } from '@/components/landing/tokens'

export function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, margin: '0 0 8px', color: lc.ink }}>
        {n}. {title}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: '#4a5645', fontWeight: 500 }}>{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 10px' }}>{children}</p>
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ margin: '0 0 6px' }}>{children}</li>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>{children}</ul>
}

export function Updated({ date }: { date: string }) {
  return (
    <p style={{ fontSize: 13, color: lc.faint, fontWeight: 700, margin: '0 0 26px' }}>
      Last updated: {date}
    </p>
  )
}
