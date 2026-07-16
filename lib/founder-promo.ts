import type { SupabaseClient } from '@supabase/supabase-js'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'

// Loads the sidebar's founder-call promo state. Shared by every page that shows
// the sidebar (dashboard, paths, and future sidebar pages) so the slot count and
// eligibility never diverge between screens.
export async function loadFounderPromo(
  supabase: SupabaseClient,
  userId: string,
  userCreatedAt: string,
): Promise<FounderPromo | null> {
  const [settingsRes, bookingRes] = await Promise.all([
    supabase.from('founder_call_settings').select('total_slots, slots_used').eq('id', 1).maybeSingle(),
    supabase.from('founder_call_bookings').select('id').eq('user_id', userId).maybeSingle(),
  ])
  const settings = settingsRes.data
  if (!settings) return null
  return {
    slotsRemaining: Math.max(0, (settings.total_slots as number) - (settings.slots_used as number)),
    hasBooked: !!bookingRes.data,
    daysUsed: Math.floor((Date.now() - new Date(userCreatedAt).getTime()) / 864e5),
  }
}
