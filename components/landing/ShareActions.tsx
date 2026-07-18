'use client'

import { useState } from 'react'
import { Share2, MessageCircle, Copy, Check, Download } from 'lucide-react'
import { lc, fontDisplay } from './tokens'

// Share buttons for the score card. Uses the Web Share API where available
// (that's the native sheet on mobile → IG / TikTok / WhatsApp / Messages), with
// explicit WhatsApp / X / copy / download fallbacks for desktop.

export function ShareActions({ shareText }: { shareText: string }) {
  const [copied, setCopied] = useState(false)

  const url = () => (typeof window !== 'undefined' ? window.location.href : '')

  const nativeShare = async () => {
    const u = url()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'My Locuta score', text: shareText, url: u })
        return
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    copyLink()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  // These read window at CLICK time (handlers are client-only), so nothing
  // window-derived appears at render — no SSR/client hydration mismatch.
  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url()}`)}`, '_blank', 'noopener')
  }
  const openX = () => {
    const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url())}`
    window.open(href, '_blank', 'noopener')
  }
  const saveImage = () => {
    const a = document.createElement('a')
    a.href = `${window.location.pathname}/opengraph-image`
    a.download = 'locuta-score.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const btn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 14px',
    borderRadius: 14,
    fontFamily: fontDisplay,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    border: `2px solid ${lc.cardBorder}`,
    background: '#fff',
    color: lc.ink,
    textDecoration: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <button
        type="button"
        onClick={nativeShare}
        style={{
          ...btn,
          background: lc.green,
          color: '#fff',
          border: 0,
          padding: 15,
          fontSize: 15,
          boxShadow: `0 5px 0 ${lc.greenDark}`,
        }}
      >
        <Share2 size={18} /> Share my score
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
        <button type="button" onClick={openWhatsApp} style={{ ...btn, color: '#128C7E' }}>
          <MessageCircle size={17} /> WhatsApp
        </button>
        <button type="button" onClick={openX} style={btn}>
          <XGlyph /> Post to X
        </button>
        <button type="button" onClick={saveImage} style={btn}>
          <Download size={17} /> Save image
        </button>
        <button type="button" onClick={copyLink} style={btn}>
          {copied ? <Check size={17} color={lc.green} /> : <Copy size={17} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

function XGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
