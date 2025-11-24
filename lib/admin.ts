import { createClient } from '@/lib/supabase/server'

export async function isAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  return user.user_metadata?.is_admin === true
}

export async function requireAdmin() {
  const admin = await isAdmin()
  
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
  
  return true
}