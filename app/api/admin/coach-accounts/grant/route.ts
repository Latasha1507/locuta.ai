// app/api/admin/coach-accounts/grant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { COACH_DEFAULT_SESSION_CAP } from '@/lib/coach-account'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Provisions (or re-provisions) a complimentary coach evaluation account:
 * 30 days from NOW, a fresh 100-session counter, all lessons unlocked.
 * Existing production learners are never touched — this only ever writes
 * the row identified by userId.
 *
 * SECURITY: gated by requireAdmin() (app_metadata.is_admin, service-role
 * only — not user-writable). This route class (privileged write via the
 * service-role client) is exactly where two P1s were previously found in
 * this repo from a missing role check — don't repeat that here.
 *
 * Body: { userId: string, sessionCap?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = body?.userId as string | undefined
  const sessionCap = Number.isFinite(Number(body?.sessionCap))
    ? Math.max(1, Math.floor(Number(body.sessionCap)))
    : COACH_DEFAULT_SESSION_CAP

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .update({
      plan_type: 'coach_complimentary',
      coach_started_at: new Date().toISOString(),
      coach_session_cap: sessionCap,
      coach_sessions_used: 0,
      coach_revoked_at: null,
      coach_revoked_reason: null,
    })
    .eq('id', userId)
    .select('id, email, plan_type, coach_started_at, coach_session_cap')

  if (error) {
    console.error('coach-accounts/grant update error:', error.message)
    return NextResponse.json(
      { error: 'Could not grant coach access.', detail: error.message },
      { status: 500 },
    )
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No profile found for that userId.' }, { status: 404 })
  }

  return NextResponse.json({ status: 'granted', profile: data[0] })
}
