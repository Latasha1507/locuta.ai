// app/api/admin/coach-accounts/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getCoachStatus } from '@/lib/coach-account'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CoachRow {
  id: string
  email: string | null
  full_name: string | null
  coach_started_at: string | null
  coach_session_cap: number
  coach_sessions_used: number
  coach_revoked_at: string | null
  coach_revoked_reason: string | null
  plan_type: string
}

/**
 * Lists every coach_complimentary account with its live status, for the admin
 * console. Naturally-expired accounts that have already self-healed into 'trial'
 * drop off (they're regular users now); active, revoked, and expired-but-not-
 * yet-converted accounts remain.
 *
 * SECURITY: gated by requireAdmin(); reads via the service-role client because
 * a normal user can only see their own profile row under RLS.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select(
      'id, email, full_name, coach_started_at, coach_session_cap, coach_sessions_used, coach_revoked_at, coach_revoked_reason, plan_type',
    )
    .eq('plan_type', 'coach_complimentary')
    .order('coach_started_at', { ascending: false })

  if (error) {
    console.error('coach-accounts list error:', error.message)
    return NextResponse.json({ error: 'Could not load coach accounts.' }, { status: 500 })
  }

  const coaches = ((data ?? []) as CoachRow[]).map((p) => {
    const status = getCoachStatus(p)
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      startedAt: p.coach_started_at,
      cap: p.coach_session_cap,
      used: p.coach_sessions_used,
      revokedAt: p.coach_revoked_at,
      revokedReason: p.coach_revoked_reason,
      active: status.isCoachAccount ? status.active : false,
      reason: status.isCoachAccount ? status.reason : 'not_started',
      daysRemaining: status.isCoachAccount ? status.daysRemaining : 0,
      sessionsRemaining: status.isCoachAccount ? status.sessionsRemaining : 0,
    }
  })

  return NextResponse.json({ coaches })
}
