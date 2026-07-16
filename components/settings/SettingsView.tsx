'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon } from '@/components/landing/icons'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'
import { TONES } from '@/lib/tones'
import { GOALS, PROFICIENCY, ageFromDob } from '@/lib/profile-details'

export interface SettingsData {
  isAdmin: boolean
  promo: FounderPromo | null
  fullName: string
  email: string
  initial: string
  planLabel: string
  // preferences (all resolved with defaults)
  defaultTone: string
  defaultPath: string
  dailyGoal: string
  dailyReminder: boolean
  reminderTime: string
  streakAtRisk: boolean
  newStickerAlert: boolean
  weeklyEmail: boolean
  restDays: boolean
  saveRecordings: boolean
  shareData: boolean
  soundEffects: boolean
  // profile details
  dateOfBirth: string
  gender: string
  primaryGoal: string
  currentProficiency: string
  paths: string[]
}

const GOAL_OPTS = ['Casual', 'Regular', 'Serious']
const REMINDER_TIMES = ['7:00 AM', '8:00 AM', '12:00 PM', '5:00 PM', '7:00 PM', '9:00 PM']

export function SettingsView(d: SettingsData) {
  const router = useRouter()
  const supabase = createClient()

  const [tone, setTone] = useState(d.defaultTone)
  const [path, setPath] = useState(d.defaultPath)
  const [goal, setGoal] = useState(d.dailyGoal)
  const [reminderTime, setReminderTime] = useState(d.reminderTime)
  const [tg, setTg] = useState({
    dailyReminder: d.dailyReminder,
    streakAtRisk: d.streakAtRisk,
    newStickerAlert: d.newStickerAlert,
    weeklyEmail: d.weeklyEmail,
    restDays: d.restDays,
    saveRecordings: d.saveRecordings,
    shareData: d.shareData,
    soundEffects: d.soundEffects,
  })

  const [editing, setEditing] = useState(false)
  const [savedName, setSavedName] = useState(d.fullName)
  const [toast, setToast] = useState('')
  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2400)
  }

  // Every control autosaves. One tiny helper posts a partial patch.
  const save = async (patch: Record<string, unknown>) => {
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
      flash('Could not save that.')
    }
  }
  const flip = (k: keyof typeof tg) => {
    const next = !tg[k]
    setTg((s) => ({ ...s, [k]: next }))
    save({ preferences: { [k]: next } })
  }

  const age = ageFromDob(d.dateOfBirth)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody }}>
      <LandingIconSprite />
      <Sidebar isAdmin={d.isAdmin} promo={d.promo} />

      <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col gap-[18px] px-4 pb-16 pt-5 lg:gap-5 lg:px-8 lg:pt-8">
        {/* HEADER with top-right profile chip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 className="text-[26px] lg:text-[32px]" style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
              Settings
            </h1>
            <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, margin: '5px 0 0' }}>
              Tune Locuta to fit how you like to practise.
            </p>
          </div>
          <span
            aria-hidden="true"
            style={{
              width: 44, height: 44, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: lc.green, color: '#fff', fontFamily: fontDisplay, fontWeight: 800,
              fontSize: 19, boxShadow: `0 3px 0 ${lc.greenDark}`, border: '2px solid #fff',
            }}
          >
            {d.initial}
          </span>
        </div>

        {/* PROFILE CARD */}
        <section className="p-5 lg:p-6" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <span
              style={{
                width: 60, height: 60, borderRadius: '50%', background: lc.green, color: '#fff', flex: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontDisplay,
                fontWeight: 800, fontSize: 26, boxShadow: `0 3px 0 ${lc.greenDark}`,
              }}
            >
              {d.initial}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: lc.ink }}>{savedName || 'Your name'}</div>
              <div style={{ fontSize: 13, color: lc.faint, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={planPill}>✦ {d.planLabel}</span>
                {age !== null && <span style={{ fontSize: 12, color: lc.faint, fontWeight: 700 }}>{age} yrs</span>}
              </div>
            </div>
            <button type="button" onClick={() => setEditing(true)} style={editBtn}>
              Edit profile
            </button>
          </div>
        </section>

        {/* COACHING */}
        <Card title="Coaching" sub="How your practice starts" icon="ic-chat" color={lc.blue}>
          <SelectRow
            label="Default coach"
            hint="The voice you hear first each session"
            value={tone}
            options={TONES.map((t) => t.name)}
            onChange={(v) => {
              setTone(v)
              save({ preferences: { defaultTone: v } })
            }}
          />
          <Divider />
          <SelectRow
            label="Default path"
            hint="Where Practice starts by default"
            value={path}
            options={d.paths}
            onChange={(v) => {
              setPath(v)
              save({ preferences: { defaultPath: v } })
            }}
          />
          <Divider />
          <SegRow
            label="Daily goal"
            hint="How much you want to practise a day"
            value={goal}
            options={GOAL_OPTS}
            onChange={(v) => {
              setGoal(v)
              save({ preferences: { dailyGoal: v } })
            }}
          />
        </Card>

        {/* NOTIFICATIONS */}
        <Card title="Notifications" sub="What Locuta pings you about" icon="ic-bolt" color={lc.yellow}>
          <ToggleRow label="Daily practice reminder" hint="A gentle nudge to keep your streak" on={tg.dailyReminder} onChange={() => flip('dailyReminder')} />
          <Divider />
          <SelectRow
            label="Reminder time"
            hint="When we send your daily nudge"
            value={reminderTime}
            options={REMINDER_TIMES}
            disabled={!tg.dailyReminder}
            onChange={(v) => {
              setReminderTime(v)
              save({ preferences: { reminderTime: v } })
            }}
          />
          <Divider />
          <ToggleRow label="Streak at risk" hint="Alert me if my streak is about to break" on={tg.streakAtRisk} onChange={() => flip('streakAtRisk')} />
          <Divider />
          <ToggleRow label="New sticker unlocked" hint="Celebrate when I earn a sticker" on={tg.newStickerAlert} onChange={() => flip('newStickerAlert')} />
          <Divider />
          <ToggleRow label="Weekly progress email" hint="A Sunday recap of my week" on={tg.weeklyEmail} onChange={() => flip('weeklyEmail')} />
        </Card>

        {/* STREAK RULES */}
        <Card title="Streak rules" sub="Keep your streak fair" icon="ic-flame" color={lc.coral}>
          <ToggleRow label="Rest days" hint="One skipped day a week won't break your streak" on={tg.restDays} onChange={() => flip('restDays')} />
        </Card>

        {/* RECORDINGS & DATA — no delete option, per request */}
        <Card title="Recordings & data" sub="What we keep and why" icon="ic-mic" color={lc.green}>
          <ToggleRow label="Save my recordings" hint="Keep audio so I can replay past reps" on={tg.saveRecordings} onChange={() => flip('saveRecordings')} />
          <Divider />
          <ToggleRow label="Improve Locuta with my data" hint="Share anonymised audio to train the coach" on={tg.shareData} onChange={() => flip('shareData')} />
        </Card>

        {/* PRACTICE / ACCOUNT */}
        <Card title="Practice & account" sub="The rest" icon="ic-cog" color={lc.purple}>
          <ToggleRow label="Sound effects" hint="Chimes and pops during practice" on={tg.soundEffects} onChange={() => flip('soundEffects')} />
          <Divider />
          <PasswordRow supabase={supabase} onDone={() => flash('Password updated')} />
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <RowText label="Manage subscription" hint={d.planLabel} />
            <a href="/pricing" style={linkBtn}>Manage</a>
          </div>
        </Card>

        {/* SIGN OUT */}
        <form action="/auth/signout" method="post">
          <button type="submit" style={signOutBtn}>
            <Icon id="ic-out" size={17} color="#c04333" />
            Sign out
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: lc.faint, fontWeight: 600, marginTop: 4 }}>
          Made for people who&apos;d rather speak than stall.
        </p>
      </main>

      {editing && (
        <EditProfileModal
          initialName={savedName}
          initialEmail={d.email}
          initialDob={d.dateOfBirth}
          initialGender={d.gender}
          initialGoal={d.primaryGoal}
          initialProficiency={d.currentProficiency}
          onClose={() => setEditing(false)}
          onSaved={(name, emailPending) => {
            setSavedName(name)
            setEditing(false)
            flash(emailPending ? 'Saved — check your inbox to confirm the new email' : 'Profile saved')
            router.refresh()
          }}
        />
      )}

      {toast && <Toast>{toast}</Toast>}
    </div>
  )
}

/* ---------- Edit Profile modal ---------- */

function EditProfileModal({
  initialName,
  initialEmail,
  initialDob,
  initialGender,
  initialGoal,
  initialProficiency,
  onClose,
  onSaved,
}: {
  initialName: string
  initialEmail: string
  initialDob: string
  initialGender: string
  initialGoal: string
  initialProficiency: string
  onClose: () => void
  onSaved: (name: string, emailPending: boolean) => void
}) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [dob, setDob] = useState(initialDob)
  const [gender, setGender] = useState(initialGender)
  const [goal, setGoal] = useState(initialGoal)
  const [prof, setProf] = useState(initialProficiency)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!name.trim()) return setError('Name cannot be empty.')
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email: email !== initialEmail ? email : undefined,
          profile: {
            dateOfBirth: dob || undefined,
            gender: gender || undefined,
            primaryGoal: goal || undefined,
            currentProficiency: prof || undefined,
          },
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not save')
      onSaved(name.trim(), !!j.emailPending)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(40,55,38,.5)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] p-6"
        style={{ background: '#fff', border: `3px solid ${lc.cardBorder}`, borderRadius: 24, boxShadow: `0 10px 0 ${lc.cardBorder}`, margin: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, margin: 0 }}>Edit profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, fontSize: 22, cursor: 'pointer', color: lc.faint, lineHeight: 1 }}>
            ×
          </button>
        </div>

        <FieldLabel>Full name</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={input} />

        <FieldLabel>Email</FieldLabel>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={input} />
        {email !== initialEmail && (
          <p style={{ fontSize: 11.5, color: '#a86a12', fontWeight: 700, margin: '-6px 0 12px' }}>
            Changing your email needs confirmation — we&apos;ll send a link to the new address.
          </p>
        )}

        <FieldLabel>Date of birth</FieldLabel>
        <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" style={input} />

        <FieldLabel>Gender</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((g) => (
            <Chip key={g} label={g} active={gender === g} onClick={() => setGender(g)} />
          ))}
        </div>

        <FieldLabel>Primary goal</FieldLabel>
        <select value={goal} onChange={(e) => setGoal(e.target.value)} style={input}>
          <option value="">Choose one…</option>
          {GOALS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <FieldLabel>Current level</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {PROFICIENCY.map((p) => (
            <Chip key={p} label={p} active={prof === p} onClick={() => setProf(p)} />
          ))}
        </div>

        {error && <p role="alert" style={{ fontSize: 12.5, color: '#c0392b', fontWeight: 700, margin: '0 0 12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} style={{ ...primaryBtn, flex: 2, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PasswordRow({ supabase, onDone }: { supabase: ReturnType<typeof createClient>; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setErr('')
    if (pw.length < 8) return setErr('Use at least 8 characters.')
    if (pw !== pw2) return setErr("The passwords don't match.")
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) return setErr(error.message)
    setPw('')
    setPw2('')
    setOpen(false)
    onDone()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <RowText label="Change password" hint="" />
        <button type="button" onClick={() => setOpen((v) => !v)} style={linkBtn}>
          {open ? 'Close' : 'Update'}
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8)" autoComplete="new-password" style={input} />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" style={input} />
          {err && <p role="alert" style={{ fontSize: 12, color: '#c0392b', fontWeight: 700, margin: 0 }}>{err}</p>}
          <button type="button" onClick={submit} disabled={saving || !pw || !pw2} style={{ ...primaryBtn, alignSelf: 'flex-start', opacity: pw && pw2 ? 1 : 0.6 }}>
            {saving ? 'Updating…' : 'Save password'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------- small pieces ---------- */

const cardStyle: React.CSSProperties = {
  background: '#fff', border: `2px solid ${lc.cardBorder}`, borderRadius: 22, boxShadow: `0 5px 0 ${lc.cardBorder}`,
}
const planPill: React.CSSProperties = {
  fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, color: lc.greenDark, background: '#eafaef',
  border: '2px solid #c7edd2', borderRadius: 999, padding: '4px 11px',
}
const editBtn: React.CSSProperties = {
  flex: 'none', background: '#fff', color: lc.greenDark, border: `2px solid ${lc.cardBorder}`, borderRadius: 12,
  padding: '10px 16px', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: `0 3px 0 ${lc.cardBorder}`,
}
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: `2px solid ${lc.cardBorder}`,
  background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: lc.ink, outline: 'none', marginBottom: 14,
}
const primaryBtn: React.CSSProperties = {
  background: lc.green, color: '#fff', border: 0, borderRadius: 12, padding: '11px 20px', fontFamily: fontDisplay,
  fontWeight: 800, fontSize: 13.5, cursor: 'pointer', boxShadow: `0 4px 0 ${lc.greenDark}`,
}
const ghostBtn: React.CSSProperties = {
  background: '#fff', color: lc.muted, border: `2px solid ${lc.cardBorder}`, borderRadius: 12, padding: '11px 20px',
  fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
}
const linkBtn: React.CSSProperties = {
  background: 'none', border: 0, cursor: 'pointer', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13,
  color: lc.greenDark, textDecoration: 'none', whiteSpace: 'nowrap',
}
const signOutBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, background: '#fff5f3', color: '#c04333', border: '2px solid #ffdcd6',
  borderRadius: 13, padding: '12px 18px', fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 0 #ffdcd6',
}

function Divider() {
  return <div style={{ height: 1, background: '#f0f4ec', margin: '2px 0' }} />
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5, color: lc.ink, marginBottom: 7 }}>{children}</label>
}
function RowText({ label, hint }: { label: string; hint: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14, color: lc.ink }}>{label}</div>
      {hint && <div style={{ fontSize: 12.5, color: lc.faint, fontWeight: 600, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}
function Card({ title, sub, icon, color, children }: { title: string; sub: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <section className="p-5 lg:p-6" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '2px solid #f0f4ec' }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 3px 0 rgba(0,0,0,.12)' }}>
          <Icon id={icon} size={19} color="#fff" />
        </span>
        <div>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16.5, margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 12, color: lc.faint, fontWeight: 600, margin: '1px 0 0' }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  )
}
function ToggleRow({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <RowText label={label} hint={hint} />
      </div>
      <button
        type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
        style={{
          flex: 'none', width: 48, height: 28, borderRadius: 999, border: 0, cursor: 'pointer',
          background: on ? lc.green : '#d7e0cd', position: 'relative', transition: 'background .18s ease',
        }}
      >
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .18s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
      </button>
    </div>
  )
}
function SelectRow({ label, hint, value, options, onChange, disabled }: { label: string; hint: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <RowText label={label} hint={hint} />
      </div>
      <select
        value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 'none', background: '#f4f8ef', border: `2px solid ${lc.cardBorder}`, borderRadius: 12, padding: '9px 12px',
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 13, color: lc.ink, cursor: disabled ? 'default' : 'pointer', maxWidth: 170,
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
function SegRow({ label, hint, value, options, onChange }: { label: string; hint: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <RowText label={label} hint={hint} />
      </div>
      <div style={{ display: 'flex', gap: 5, background: '#f2f6ee', border: `2px solid ${lc.cardBorder}`, borderRadius: 13, padding: 4, flex: 'none' }}>
        {options.map((o) => {
          const active = value === o
          return (
            <button
              key={o} type="button" onClick={() => onChange(o)}
              style={{
                font: `800 12px ${fontDisplay}`, padding: '7px 13px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
                border: 0, background: active ? lc.green : 'transparent', color: active ? '#fff' : lc.muted,
              }}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        padding: '8px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: fontDisplay, fontWeight: 800, fontSize: 12.5,
        background: active ? lc.green : '#fff', color: active ? '#fff' : lc.muted,
        border: `2px solid ${active ? lc.green : lc.cardBorder}`,
      }}
    >
      {label}
    </button>
  )
}
function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: lc.ink, color: '#fff',
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 13.5, padding: '11px 20px', borderRadius: 999, zIndex: 120,
        boxShadow: '0 6px 20px rgba(0,0,0,.2)', maxWidth: '90vw', textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
