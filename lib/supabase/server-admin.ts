import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS — never expose this to the browser and
 * never use it to answer a request without first checking who is asking.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials are not configured')
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
