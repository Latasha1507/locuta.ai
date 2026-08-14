-- cached_lesson_intros was the only public table with RLS disabled, leaving it
-- fully open to the anon/authenticated roles (cache-poisoning risk). The app only
-- ever touches this table via the service-role client (app/api/lesson-intro),
-- which bypasses RLS, so enabling RLS with NO policy is the correct fix:
-- service-role keeps working, anon/authenticated are denied.
ALTER TABLE public.cached_lesson_intros ENABLE ROW LEVEL SECURITY;
