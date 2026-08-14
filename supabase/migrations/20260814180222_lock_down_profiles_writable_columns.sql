-- CRITICAL payment-bypass / privilege-escalation fix.
--
-- Every public table grants full-column UPDATE to anon/authenticated, and RLS
-- only restricts WHICH ROW — so a logged-in user could write ANY column on their
-- own profiles row from the browser: set plan_type='lifetime' (free paid access),
-- reset daily_sessions_used / trial_started_at (dodge limits / infinite trial),
-- forge subscription_status, or self-assign referred_by_affiliate_id.
--
-- Fix: the authenticated role may UPDATE only the columns a user is genuinely
-- allowed to self-edit. Everything else becomes writable ONLY by the service-role
-- client used in trusted server routes (start-trial, razorpay webhook, cron,
-- feedback daily-counter, auth callback — the last two were moved to the admin
-- client alongside this migration).
revoke update on public.profiles from anon, authenticated;

grant update (full_name, avatar_url, preferences, onboarding_completed, onboarding_data)
  on public.profiles to authenticated;
