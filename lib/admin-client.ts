import { createClient } from '@/lib/supabase/client'

export async function isAdminClient() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  return user.user_metadata?.is_admin === true
}