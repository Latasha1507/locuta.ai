import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadFounderPromo } from '@/lib/founder-promo'
import { withDefaults } from '@/lib/preferences'
import { readProfileDetails } from '@/lib/profile-details'
import { CATEGORY_MAP } from '@/lib/category-map'
import { SettingsView } from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

function planLabel(profile: Record<string, unknown> | null, admin: boolean): string {
  if (admin) return 'Admin'
  const p = String(profile?.plan_type ?? profile?.plan ?? '').toLowerCase()
  if (['pro', 'paid', 'premium'].includes(p)) return 'Pro'
  if (['founder', 'lifetime'].includes(p)) return 'Lifetime'
  const trialEnds = (profile?.trial_ends_at ?? profile?.trial_end) as string | null
  if (trialEnds) {
    const daysLeft = Math.ceil((new Date(trialEnds).getTime() - Date.now()) / 864e5)
    if (daysLeft > 0) return `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
  }
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
    loadFounderPromo(supabase, user.id),
  ])

  const profile = profileRes.data as Record<string, unknown> | null
  const prefs = withDefaults(profile?.preferences)
  const details = readProfileDetails(profile?.onboarding_data)

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
      defaultTone={prefs.defaultTone}
      defaultPath={prefs.defaultPath}
      dailyGoal={prefs.dailyGoal}
      dailyReminder={prefs.dailyReminder}
      reminderTime={prefs.reminderTime}
      streakAtRisk={prefs.streakAtRisk}
      newStickerAlert={prefs.newStickerAlert}
      weeklyEmail={prefs.weeklyEmail}
      restDays={prefs.restDays}
      saveRecordings={prefs.saveRecordings}
      shareData={prefs.shareData}
      soundEffects={prefs.soundEffects}
      dateOfBirth={details.dateOfBirth ?? ''}
      gender={details.gender ?? ''}
      primaryGoal={details.primaryGoal ?? ''}
      currentProficiency={details.currentProficiency ?? ''}
      paths={Object.values(CATEGORY_MAP)}
    />
  )
}
