-- Budget circuit-breaker for the PUBLIC /api/quick-score endpoint.
-- The in-memory per-IP limiter in the route resets on serverless cold start and
-- is per-instance, so it cannot bound total daily OpenAI spend. This gives a
-- hard, durable global ceiling: one row per UTC day, atomically incremented
-- before any Whisper/GPT call. Only the service-role client (via the SECURITY
-- DEFINER function) can touch it.

create table if not exists public.quick_score_usage (
  day   date    primary key,
  count integer not null default 0
);

alter table public.quick_score_usage enable row level security;
-- No policies: anon/authenticated are denied; service-role bypasses RLS.

-- Atomic increment. INSERT ... ON CONFLICT DO UPDATE ... RETURNING is a single
-- statement, so concurrent requests can't race the read-modify-write.
create or replace function public.bump_quick_score_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.quick_score_usage (day, count)
  values (current_date, 1)
  on conflict (day)
    do update set count = public.quick_score_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- Lock the function down: it must NOT be callable by public API roles. Only the
-- server, using the service-role key, invokes it.
revoke all on function public.bump_quick_score_usage() from public, anon, authenticated;
grant execute on function public.bump_quick_score_usage() to service_role;
