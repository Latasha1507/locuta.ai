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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-slate-600 hover:text-slate-900">
                ← Back to Admin
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  Coach Accounts
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                    ADMIN
                  </span>
                </h1>
                <p className="text-sm text-slate-600">Complimentary coach evaluation accounts</p>
              </div>
            </div>
            <img src="/Icon.png" alt="Locuta" className="w-10 h-10" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
                  : '⚠️ Email not sent (sender domain not verified in Resend yet) — copy the sign-in link below and send it manually.'}
              </p>
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
            <p className="text-slate-500 text-sm py-8 text-center">No coach accounts yet. Invite one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-semibold">Coach</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3 font-semibold">Sessions</th>
                    <th className="py-2 px-3 font-semibold">Days left</th>
                    <th className="py-2 px-3 font-semibold">Started</th>
                    <th className="py-2 pl-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{c.email ?? '—'}</div>
                        {c.fullName && <div className="text-xs text-slate-500">{c.fullName}</div>}
                        {c.revokedAt && c.revokedReason && (
                          <div className="text-xs text-red-500 mt-0.5">Revoked: {c.revokedReason}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge c={c} />
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {c.used}/{c.cap}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{c.active ? c.daysRemaining : '—'}</td>
                      <td className="py-3 px-3 text-slate-500">{fmtDate(c.startedAt)}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
