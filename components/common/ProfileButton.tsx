'use client'

import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'

// Quick-access profile chip for the top-right of a page. Shows the first letter
// of the user's name (or email) and links to Settings.
export function ProfileButton({ name, email }: { name?: string; email?: string }) {
  const initial = (name?.trim()[0] || email?.trim()[0] || 'A').toUpperCase()
  return (
    <Link
      href="/settings"
      aria-label="Profile and settings"
      title={name || email || 'Profile'}
      style={{
        width: 42, height: 42, borderRadius: '50%', flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: lc.green, color: '#fff', fontFamily: fontDisplay, fontWeight: 800,
        fontSize: 18, textDecoration: 'none', boxShadow: `0 3px 0 ${lc.greenDark}`, border: '2px solid #fff',
      }}
    >
      {initial}
    </Link>
  )
}
