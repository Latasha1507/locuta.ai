import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadFounderPromo } from '@/lib/founder-promo'
import { readPreferences } from '@/lib/preferences'
import { SettingsView } from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

function planLabel(profile: Record<string, unknown> | null, admin: boolean): string {
  if (admin) return 'Admin'
  const p = String(profile?.plan_type ?? profile?.plan ?? '').toLowerCase()
  if (['pro', 'paid', 'premium'].includes(p)) return 'Pro'
  if (['founder', 'lifetime'].includes(p)) return 'Lifetime'
  const trialEnds = (profile?.trial_ends_at ?? profile?.trial_end) as string | null
  if (trialEnds && new Date(trialEnds).getTime() > Date.now()) return 'Trial'
  return 'Free'
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = await isAdmin().catch(() => false)

  const [profileRes, promo] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    loadFounderPromo(supabase, user.id, user.created_at),
  ])

  const profile = profileRes.data as Record<string, unknown> | null
  const prefs = readPreferences(profile?.preferences)

  const fullName = (profile?.full_name as string) || (user.user_metadata?.full_name as string) || ''
  const email = user.email || ''
  const initial = (fullName.trim()[0] || email[0] || 'A').toUpperCase()

  return (
    <SettingsView
      isAdmin={admin}
      promo={promo}
      fullName={fullName}
      email={email}
      initial={initial}
      planLabel={planLabel(profile, admin)}
      defaultTone={prefs.defaultTone ?? 'Normal'}
      dailyReminder={prefs.dailyReminder === true}
    />
  )
}
