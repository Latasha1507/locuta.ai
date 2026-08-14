-- Pin search_path on the flagged trigger functions (closes function_search_path_mutable),
-- and lock down handle_new_user's direct RPC surface.

-- handle_new_user: SECURITY DEFINER. Body already qualifies public.profiles, so an
-- empty search_path is safe and removes the privilege-escalation vector. It's a
-- trigger (fires regardless of EXECUTE grants), so nobody needs to call it via
-- PostgREST RPC — revoke that surface.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- initialize_user_trial: trigger, only assigns NEW.* — no object references, safe to pin.
alter function public.initialize_user_trial() set search_path = '';

-- populate_user_name: trigger that reads `profiles` UNQUALIFIED. Pinning an empty
-- search_path REQUIRES qualifying that reference or the lookup fails and breaks the
-- INSERT on sessions/user_progress. Qualify to public.profiles AND pin. Stays
-- SECURITY INVOKER (unchanged), so RLS on profiles still applies as before.
create or replace function public.populate_user_name()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  select full_name into new.user_name
  from public.profiles
  where id = new.user_id;
  return new;
end;
$function$;
