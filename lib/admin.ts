import { createClient } from '@/lib/supabase/server'

/**
 * SECURITY: admin status is read from `app_metadata`, NOT `user_metadata`.
 *
 * In Supabase, `user_metadata` (raw_user_meta_data) is writable by the user
 * themselves — any signed-in user could run
 *
 *     supabase.auth.updateUser({ data: { is_admin: true } })
 *
 * from the browser console and grant themselves admin. `app_metadata` can only
 * be written with the service-role key, so it is safe to trust.
 *
 * MIGRATION REQUIRED — run once in the Supabase SQL editor to keep your own
 * admin access (replace the email):
 *
 *   update auth.users
 *      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
 *                              || '{"is_admin": true}'::jsonb
 *    where email = 'you@example.com';
 *
 * And strip the unsafe flag from everyone:
 *
 *   update auth.users
 *      set raw_user_meta_data = raw_user_meta_data - 'is_admin';
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  return user.app_metadata?.is_admin === true
}

export async function requireAdmin(): Promise<true> {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized: Admin access required')
  }
  return true
}
