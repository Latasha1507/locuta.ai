import type { SupabaseClient } from '@supabase/supabase-js'
import type { FounderPromo } from '@/components/dashboard/SidebarPromo'

// Loads the sidebar's founder-call promo state. Shared by every page that shows
// the sidebar (dashboard, paths, and future sidebar pages) so the slot count and
// eligibility never diverge between screens.
export async function loadFounderPromo(
  supabase: SupabaseClient,
  userId: string,
): Promise<FounderPromo | null> {
  const [settingsRes, bookingRes, sessionsRes] = await Promise.all([
    supabase.from('founder_call_settings').select('total_slots, slots_used').eq('id', 1).maybeSingle(),
    supabase.from('founder_call_bookings').select('id').eq('user_id', userId).maybeSingle(),
    // Only SCORED sessions count. A row with no feedback is a recording that
    // failed or was abandoned, and counting those would make the gate passable
    // by tapping record and stop fifty times.
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('feedback', 'is', null),
  ])
  const settings = settingsRes.data
  if (!settings) return null
  return {
    slotsRemaining: Math.max(0, (settings.total_slots as number) - (settings.slots_used as number)),
    hasBooked: !!bookingRes.data,
    sessionsCompleted: sessionsRes.count ?? 0,
  }
}
