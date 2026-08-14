-- Score/progress writes now go through the service-role client in the feedback
-- route, so the user role must NOT have direct write access to these tables —
-- otherwise a user could INSERT a fake overall_score or mark a level completed
-- straight from the browser and unlock content. Keep SELECT-own (the app reads
-- history/progress with the user client); drop only the write policies.
drop policy if exists "Users can insert their own sessions" on public.sessions;
drop policy if exists "Users can insert their own progress" on public.user_progress;
drop policy if exists "Users can update their own progress" on public.user_progress;
