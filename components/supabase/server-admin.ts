// DEAD FILE — do not import from here.
//
// The canonical service-role (RLS-bypassing) client lives in
// `lib/supabase/server-admin.ts`. This module was an identical duplicate; it is
// imported by nothing and should be deleted outright:
//
//     git rm components/supabase/server-admin.ts
//
// A service-role client must never live under `components/` (that directory is
// where client components live — a stray client import of a service-role client
// is exactly the mistake to design out). Until this file is removed, it only
// re-exports the canonical implementation so there is a single source of truth
// for the secret-handling logic. Import from `@/lib/supabase/server-admin`.
export { createAdminClient } from '@/lib/supabase/server-admin'
