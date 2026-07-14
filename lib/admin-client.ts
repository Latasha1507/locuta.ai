import { createClient } from '@/lib/supabase/client'

export async function isAdminClient() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  // Display-only. The server (lib/admin.ts) is the actual gate.
  return user.app_metadata?.is_admin === true
}