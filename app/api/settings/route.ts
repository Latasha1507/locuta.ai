import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTone } from '@/lib/tones'
import { readPreferences } from '@/lib/preferences'

// Saves profile + preference changes. profiles has a user-level UPDATE policy
// (onboarding writes to it with the user client), so we update as the user —
// no service role needed, and RLS keeps them scoped to their own row.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { fullName?: string; defaultTone?: string; dailyReminder?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Load current preferences so we merge rather than clobber.
  const { data: current } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle()

  const prefs = readPreferences(current?.preferences)

  if (typeof body.defaultTone === 'string') prefs.defaultTone = resolveTone(body.defaultTone)
  if (typeof body.dailyReminder === 'boolean') prefs.dailyReminder = body.dailyReminder

  const update: Record<string, unknown> = { preferences: prefs }

  if (typeof body.fullName === 'string') {
    const name = body.fullName.trim().slice(0, 80)
    if (name) update.full_name = name
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) {
    return NextResponse.json({ error: 'Could not save your settings' }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferences: prefs })
}
