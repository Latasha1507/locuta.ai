'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import { TONES } from '@/lib/tones'

export interface SettingsData {
  isAdmin: boolean
  promo: FounderPromo | null
  fullName: string
  email: string
  initial: string
  planLabel: string
  defaultTone: string
  dailyReminder: boolean
}

export function SettingsView(d: SettingsData) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(d.fullName)
  const [savedName, setSavedName] = useState(d.fullName)
  const [tone, setTone] = useState(d.defaultTone)
  const [reminder, setReminder] = useState(d.dailyReminder)

  const [savingProfile, setSavingProfile] = useState(false)
  const [toast, setToast] = useState('')

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [pwError, setPwError] = useState('')

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      })
      if (!res.ok) throw new Error()
      setSavedName(fullName.trim())
      flash('Profile saved')
      router.refresh()
    } catch {
      flash('Could not save. Try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Preferences autosave on change — no separate button.
  const savePref = async (patch: { defaultTone?: string; dailyReminder?: boolean }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      flash('Saved')
      router.refresh()
    } catch {
      flash('Could not save that preference.')
    }
  }

  const changePassword = async () => {
    setPwError('')
    if (pw.length < 8) return setPwError('Use at least 8 characters.')
    if (pw !== pw2) return setPwError("The two passwords don't match.")
    setPwState('saving')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      setPwError(error.message)
      setPwState('idle')
      return
    }
    setPw('')
    setPw2('')
    setPwState('done')
    flash('Password updated')
    setTimeout(() => setPwState('idle'), 2000)
  }

  const nameChanged = fullName.trim() !== savedName.trim() && fullName.trim().length > 0

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      <LandingIconSprite />
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="mx-auto flex w-full max-w-[780px] flex-1 flex-col gap-[18px] px-4 pb-14 pt-5 lg:gap-5 lg:px-8 lg:pt-8">
        <div>
          <h1 className="text-[26px] lg:text-[32px]" style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
            Settings
          </h1>
          <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, margin: '5px 0 0' }}>
            Your account, your coach, your preferences.
          </p>
        </div>

        {/* PROFILE */}
        <Section title="Profile" icon="ic-smile" color={lc.green}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span
              style={{
                width: 56, height: 56, borderRadius: '50%', background: lc.green, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, flex: 'none', boxShadow: `0 3px 0 ${lc.greenDark}`,
              }}
            >
              {d.initial}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16, color: lc.ink }}>{savedName || 'Your name'}</div>
              <div style={{ fontSize: 13, color: lc.faint, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.email}</div>
            </div>
            <span
              style={{
                marginLeft: 'auto', fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, color: lc.greenDark,
                background: '#eafaef', border: '2px solid #c7edd2', borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
              }}
            >
              {d.planLabel}
            </span>
          </div>

          <Label>Display name</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} style={inputStyle} />
            <button
              type="button"
              onClick={saveProfile}
              disabled={!nameChanged || savingProfile}
              style={{
                flex: 'none', background: nameChanged && !savingProfile ? lc.green : '#a8ddb9', color: '#fff', border: 0,
                borderRadius: 12, padding: '0 20px', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5,
                cursor: nameChanged && !savingProfile ? 'pointer' : 'default',
                boxShadow: `0 4px 0 ${nameChanged && !savingProfile ? lc.greenDark : '#8fc9a1'}`,
              }}
            >
              {savingProfile ? '…' : 'Save'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: lc.faint, fontWeight: 600, margin: '8px 0 0' }}>
            Email is tied to your login and can&apos;t be changed here.
          </p>
        </Section>

        {/* COACHING PREFERENCES */}
        <Section title="Coaching" icon="ic-chat" color={lc.blue}>
          <Label>Default coach</Label>
          <p style={{ fontSize: 12.5, color: lc.faint, fontWeight: 600, margin: '0 0 10px' }}>
            The voice you start every new practice with. You can still switch per-lesson.
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {TONES.map((t) => {
              const active = tone === t.name
              return (
                <button
                  key={t.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setTone(t.name)
                    savePref({ defaultTone: t.name })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 13, cursor: 'pointer',
                    textAlign: 'left', background: active ? `${t.color}14` : '#fff',
                    border: `2px solid ${active ? t.color : lc.cardBorder}`, boxShadow: `0 3px 0 ${active ? t.color : lc.cardBorder}`,
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 34, height: 34, borderRadius: 10, background: active ? t.color : `${t.color}1f`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    }}
                  >
                    <Icon id={t.icon} size={17} color={active ? '#fff' : t.color} />
                  </span>
                  <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, color: lc.ink }}>{t.name}</span>
                </button>
              )
            })}
          </div>

          <div style={{ height: 1, background: lc.cardBorder, margin: '20px 0' }} />

          <Toggle
            label="Daily practice reminder"
            hint="A gentle nudge to keep your streak alive."
            on={reminder}
            onChange={(v) => {
              setReminder(v)
              savePref({ dailyReminder: v })
            }}
          />
        </Section>

        {/* ACCOUNT */}
        <Section title="Account" icon="ic-shield" color={lc.purple}>
          <Label>Change password</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8 characters)" autoComplete="new-password" style={inputStyle} />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" style={inputStyle} />
            {pwError && (
              <p role="alert" style={{ fontSize: 12.5, color: '#c0392b', fontWeight: 700, margin: 0 }}>
                {pwError}
              </p>
            )}
            <button
              type="button"
              onClick={changePassword}
              disabled={pwState === 'saving' || !pw || !pw2}
              style={{
                alignSelf: 'flex-start', background: pwState === 'done' ? lc.greenDark : lc.ink, color: '#fff', border: 0,
                borderRadius: 12, padding: '11px 20px', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5,
                cursor: pw && pw2 && pwState !== 'saving' ? 'pointer' : 'default', opacity: pw && pw2 ? 1 : 0.6,
              }}
            >
              {pwState === 'saving' ? 'Updating…' : pwState === 'done' ? '✓ Updated' : 'Update password'}
            </button>
          </div>

          <div style={{ height: 1, background: lc.cardBorder, margin: '20px 0' }} />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', gap: 9, background: '#fff5f3', color: '#c04333',
                border: '2px solid #ffdcd6', borderRadius: 13, padding: '12px 18px', fontFamily: fontDisplay,
                fontWeight: 800, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 0 #ffdcd6',
              }}
            >
              <Icon id="ic-out" size={17} color="#c04333" />
              Sign out
            </button>
          </form>
        </Section>
      </main>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: lc.ink, color: '#fff',
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, padding: '11px 20px', borderRadius: 999, zIndex: 50,
            animation: 'lp-rise .2s ease both', boxShadow: '0 6px 20px rgba(0,0,0,.2)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1, width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
  border: `2px solid ${lc.cardBorder}`, background: '#fff', fontFamily: 'inherit', fontSize: 14.5,
  fontWeight: 700, color: lc.ink, outline: 'none', boxShadow: `0 3px 0 ${lc.cardBorder}`,
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: lc.ink, marginBottom: 8 }}>
      {children}
    </label>
  )
}

function Section({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <section
      className="p-5 lg:p-6"
      style={{ background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span
          style={{
            width: 34, height: 34, borderRadius: 10, background: color, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 3px 0 rgba(0,0,0,.12)',
          }}
        >
          <Icon id={icon} size={18} color="#fff" />
        </span>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 17, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: lc.ink }}>{label}</div>
        <div style={{ fontSize: 12.5, color: lc.faint, fontWeight: 600, marginTop: 2 }}>{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        style={{
          flex: 'none', width: 52, height: 30, borderRadius: 999, border: 0, cursor: 'pointer',
          background: on ? lc.green : '#d6ded0', position: 'relative', transition: 'background .18s ease',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.12)',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: '50%',
            background: '#fff', transition: 'left .18s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 2px 4px rgba(0,0,0,.2)',
          }}
        />
      </button>
    </div>
  )
}
