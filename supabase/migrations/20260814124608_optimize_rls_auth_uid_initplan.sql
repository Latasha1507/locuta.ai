-- Wrap auth.uid() as (select auth.uid()) so Postgres evaluates it ONCE per query
-- instead of once per row (auth_rls_initplan). Expression-only ALTERs — same
-- names, commands, roles, semantics. Also drop the exact-duplicate sessions
-- policies (multiple_permissive_policies).

-- sessions: drop redundant twins, optimize the kept ones.
drop policy "Users can insert own sessions" on public.sessions;
drop policy "Users can read own sessions" on public.sessions;
alter policy "Users can insert their own sessions" on public.sessions with check ((select auth.uid()) = user_id);
alter policy "Users can read their own sessions"   on public.sessions using ((select auth.uid()) = user_id);

-- profiles
alter policy "Users can view their own profile"   on public.profiles using ((select auth.uid()) = id);
alter policy "Users can update their own profile" on public.profiles using ((select auth.uid()) = id);

-- user_progress
alter policy "Users can insert their own progress" on public.user_progress with check ((select auth.uid()) = user_id);
alter policy "Users can view their own progress"   on public.user_progress using ((select auth.uid()) = user_id);
alter policy "Users can update their own progress" on public.user_progress using ((select auth.uid()) = user_id);

-- user_rating_history
alter policy "Users can insert own rating history" on public.user_rating_history with check ((select auth.uid()) = user_id);
alter policy "Users can view own rating history"   on public.user_rating_history using ((select auth.uid()) = user_id);
alter policy "Users can update own rating history" on public.user_rating_history using ((select auth.uid()) = user_id);

-- founder_call_bookings
alter policy "Users can insert their own bookings" on public.founder_call_bookings with check ((select auth.uid()) = user_id);
alter policy "Users can view their own bookings"   on public.founder_call_bookings using ((select auth.uid()) = user_id);
