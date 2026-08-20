-- Coach complimentary accounts — see lib/coach-account.ts.
--
-- Comped evaluation accounts for communication-coach partners who may buy in
-- bulk for their students or push Locuta via an affiliate deal. Access is
-- 30 days OR N sessions (default 100), whichever comes first, with all lessons
-- unlocked, plus an admin kill-switch (coach_revoked_at) for policy breaches
-- (e.g. one account shared across a coach's whole cohort).
--
-- NOTE ON PARITY: these objects were first applied directly to the production
-- database during development (the valid_plan_type constraint predates the
-- migrations dir and lived dashboard-only). This migration is written
-- idempotently so it is a safe no-op against that database, and exists so the
-- schema is finally represented in version control.

-- 1. New columns on profiles. Counters carry a fresh, unused default so a row
--    that somehow lacks them still reads as "no sessions used yet".
alter table public.profiles
  add column if not exists coach_started_at     timestamptz,
  add column if not exists coach_session_cap    integer not null default 100,
  add column if not exists coach_sessions_used  integer not null default 0,
  add column if not exists coach_revoked_at     timestamptz,
  add column if not exists coach_revoked_reason text;

-- 2. Allow 'coach_complimentary' as a plan_type. The constraint is recreated in
--    full (rather than ALTERed) because its prior definition was never
--    versioned; this makes the allowed set explicit and self-documenting.
alter table public.profiles drop constraint if exists valid_plan_type;
alter table public.profiles add constraint valid_plan_type
  check (
    plan_type is null
    or lower(plan_type) = any (array[
      'explore', 'trial', 'expired', 'free', 'monthly', 'yearly',
      'pro', 'paid', 'premium', 'founder', 'lifetime', 'coach_complimentary'
    ])
  );

-- 3. The coach counters are limit state — a user must NEVER be able to write
--    them from the browser (they could reset their own cap or clear a revoke).
--    profiles already REVOKEs table-wide UPDATE from authenticated and re-grants
--    only genuinely self-editable columns
--    (20260814180222_lock_down_profiles_writable_columns.sql), so these new
--    columns are non-writable by authenticated automatically. service_role — the
--    client used by grant/revoke and the feedback counter — keeps full UPDATE.
--    The revokes below are defensive/no-op, asserting that intent in one place.
revoke update (coach_started_at, coach_session_cap, coach_sessions_used, coach_revoked_at, coach_revoked_reason)
  on public.profiles from anon, authenticated;
