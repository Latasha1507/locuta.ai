'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { isAdminClient } from '@/lib/admin-client'

interface Coach {
  id: string
  email: string | null
  fullName: string | null
  startedAt: string | null
  cap: number
  used: number
  revokedAt: string | null
  revokedReason: string | null
  active: boolean
  reason: string
  daysRemaining: number
  sessionsRemaining: number
}

interface InviteResult {
  status?: string
  created?: boolean
  emailSent?: boolean
  emailError?: string
  email?: string
  userId?: string
  actionLink?: string
  error?: string
  detail?: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function StatusBadge({ c }: { c: Coach }) {
  const [label, cls] = c.revokedAt
    ? ['Revoked', 'bg-red-50 text-red-700 border-red-200']
    : c.active
      ? ['Active', 'bg-green-50 text-green-700 border-green-200']
      : ['Expired', 'bg-slate-100 text-slate-600 border-slate-200']
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>{label}</span>
}

export default function CoachAccountsPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [cap, setCap] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const [coaches, setCoaches] = useState<Coach[]>([])
  const [listError, setListError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadCoaches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coach-accounts')
      const data = await res.json()
      if (res.ok) {
        setCoaches(data.coaches ?? [])
        setListError('')
      } else {
        setListError(data.error ?? 'Could not load coach accounts.')
      }
    } catch {
      setListError('Could not load coach accounts.')
    }
  }, [])

  useEffect(() => {
    const check = async () => {
      const ok = await isAdminClient()
      if (!ok) {
        window.location.href = '/dashboard'
        return
      }
      setIsAdmin(true)
      setLoading(false)
      loadCoaches()
    }
    check()
  }, [loadCoaches])

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || inviting) return
    setInviting(true)
    setInvite(null)
    setCopied(false)
    try {
      const body: { email: string; name?: string; sessionCap?: number } = { email: email.trim() }
      if (name.trim()) body.name = name.trim()
      if (cap.trim() && Number(cap) > 0) body.sessionCap = Math.floor(Number(cap))
      const res = await fetch('/api/admin/coach-accounts/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: InviteResult = await res.json()
      setInvite(data)
      if (res.ok) {
        setEmail('')
        setName('')
        setCap('')
        loadCoaches()
      }
    } catch (err) {
      setInvite({ error: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setInviting(false)
    }
  }

  const revoke = async (c: Coach) => {
    const reason = window.prompt(`Revoke coach access for ${c.email}?\nEnter a short reason (required — kept for the record):`)
    if (!reason || !reason.trim()) return
    setBusyId(c.id)
    try {
      const res = await fetch('/api/admin/coach-accounts/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: c.id, reason: reason.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Revoke failed')
      }
      await loadCoaches()
    } catch {
      alert('Revoke failed')
    } finally {
      setBusyId(null)
    }
  }

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the link is still visible to copy manually */
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🔐</div>
          <p className="text-slate-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const activeCount = coaches.filter((c) => c.active).length
  const revokedCount = coaches.filter((c) => c.revokedAt).length
  const expiredCount = coaches.filter((c) => !c.active && !c.revokedAt).length
  const totalUsed = coaches.reduce((sum, c) => sum + (c.used || 0), 0)
  const stats = [
    { label: 'Active', value: activeCount, accent: 'text-emerald-600' },
    { label: 'Sessions used', value: totalUsed, accent: 'text-slate-900' },
    { label: 'Expired', value: expiredCount, accent: 'text-slate-500' },
    { label: 'Revoked', value: revokedCount, accent: 'text-red-500' },
  ]
  const initials = (c: Coach) => {
    const parts = (c.fullName || c.email || '?').trim().split(/[\s@.]+/).filter(Boolean)
    return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header — purple hero */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin" className="text-purple-200 hover:text-white text-sm font-medium">
            ← Back to Admin
          </Link>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 flex-wrap">
                <span>🎤</span> Coach Accounts
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-bold rounded-full tracking-wider">
                  ADMIN
                </span>
              </h1>
              <p className="text-purple-100 text-sm mt-1">
                Complimentary evaluation accounts — 30 days, all lessons unlocked.
              </p>
            </div>
            <img src="/Icon.png" alt="Locuta" className="hidden sm:block w-12 h-12 rounded-xl bg-white/10 p-1.5 flex-none" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
              <div className={`text-2xl font-extrabold ${s.accent}`}>{s.value}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Invite */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Invite a coach</h2>
          <p className="text-sm text-slate-600 mb-5">
            Creates (or reuses) their account, unlocks all lessons for 30 days with a session cap, and emails a
            one-click sign-in link. Paid accounts are never overwritten.
          </p>

          <form onSubmit={submitInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@email.com"
              className="sm:col-span-5 px-4 py-3 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="sm:col-span-4 px-4 py-3 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
            />
            <input
              type="number"
              min={1}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="Cap (100)"
              className="sm:col-span-3 px-4 py-3 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
            />
            <button
              type="submit"
              disabled={!email.trim() || inviting}
              className="sm:col-span-12 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {inviting ? 'Provisioning…' : 'Invite coach'}
            </button>
          </form>

          {/* Result */}
          {invite?.error && (
            <div className="mt-5 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <p className="font-semibold">❌ {invite.error}</p>
              {invite.detail && <p className="text-sm mt-1 opacity-80">{invite.detail}</p>}
            </div>
          )}

          {invite && !invite.error && (
            <div className="mt-5 p-4 rounded-lg bg-green-50 border border-green-200 text-green-900">
              <p className="font-semibold">
                ✅ {invite.created ? 'Account created' : 'Existing account reused'} for {invite.email}
              </p>
              <p className="text-sm mt-1">
                {invite.emailSent
                  ? '📧 Invite email sent.'
                  : '⚠️ Invite email could not be sent — copy the sign-in link below and send it to the coach manually.'}
              </p>
              {!invite.emailSent && invite.emailError && (
                <p className="text-xs mt-1 font-semibold text-amber-700">Why: {invite.emailError}</p>
              )}
              {invite.actionLink && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={invite.actionLink}
                      className="flex-1 px-3 py-2 rounded-md border border-green-300 bg-white text-slate-700 text-xs font-mono truncate"
                    />
                    <button
                      onClick={() => copyLink(invite.actionLink!)}
                      className="px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-semibold whitespace-nowrap"
                    >
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-1.5">Single-use, expires ~24h. Sign-in secret — share only with the coach.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Current coach accounts <span className="text-slate-400 font-medium">({coaches.length})</span>
            </h2>
            <button onClick={loadCoaches} className="text-sm text-purple-600 hover:text-purple-800 font-semibold">
              ↻ Refresh
            </button>
          </div>

          {listError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm mb-4">{listError}</div>
          )}

          {coaches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🎓</div>
              <p className="text-slate-500 text-sm">No coach accounts yet. Invite one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <th className="py-2.5 pr-3 font-semibold">Coach</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Sessions</th>
                    <th className="py-2.5 px-3 font-semibold">Days left</th>
                    <th className="py-2.5 px-3 font-semibold">Started</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((c) => {
                    const pct = Math.min(100, Math.round((c.used / Math.max(1, c.cap)) * 100))
                    return (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-none">
                              {initials(c)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{c.email ?? '—'}</div>
                              {c.fullName && <div className="text-xs text-slate-500 truncate">{c.fullName}</div>}
                              {c.revokedAt && c.revokedReason && (
                                <div className="text-xs text-red-500 mt-0.5">Revoked: {c.revokedReason}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge c={c} />
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-700 font-medium">
                            {c.used}
                            <span className="text-slate-400">/{c.cap}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{c.active ? `${c.daysRemaining}d` : '—'}</td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{fmtDate(c.startedAt)}</td>
                        <td className="py-3 pl-3 text-right">
                          {!c.revokedAt && (
                            <button
                              onClick={() => revoke(c)}
                              disabled={busyId === c.id}
                              className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-50"
                            >
                              {busyId === c.id ? '…' : 'Revoke'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
