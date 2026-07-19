'use client'

import { useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'
import { MarketingShell, MarketingCard } from '@/components/marketing/MarketingShell'

const SUPPORT_EMAIL = 'info@locuta.in'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // No contact API yet — compose a mailto so the button does something real
  // instead of pretending to submit into a void.
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Locuta enquiry from ${name || 'a user'}`,
  )}&body=${encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`)}`

  const ready = name.trim() && message.trim()

  return (
    <MarketingShell eyebrow="SAY HELLO" title="Get in touch." subtitle="Questions, feedback, or something broke? We read everything.">
      <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <MarketingCard>
          <h3 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, margin: '0 0 14px' }}>Reach us directly</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: '#eafaef', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon id="ic-chat" size={18} color={lc.green} />
            </span>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ fontSize: 14, fontWeight: 800, color: lc.greenDark, textDecoration: 'none' }}>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: lc.muted, fontWeight: 600, margin: 0 }}>
            We usually reply within a day or two. For account or billing issues, include the email you signed up with.
          </p>
        </MarketingCard>

        <MarketingCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email (optional)" style={inputStyle} />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's on your mind?" rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
            <a
              href={ready ? mailtoHref : undefined}
              aria-disabled={!ready}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: ready ? lc.green : '#a8ddb9',
                color: '#fff',
                padding: 14,
                borderRadius: 14,
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: `0 4px 0 ${ready ? lc.greenDark : '#8fc9a1'}`,
                pointerEvents: ready ? 'auto' : 'none',
              }}
            >
              <Icon id="ic-arrow" size={16} color="#fff" />
              Send message
            </a>
          </div>
        </MarketingCard>
      </div>
    </MarketingShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 12,
  border: `2px solid ${lc.cardBorder}`,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: 14.5,
  fontWeight: 700,
  color: lc.ink,
  outline: 'none',
}
