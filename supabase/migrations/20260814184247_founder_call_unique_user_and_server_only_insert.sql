-- One booking per user, race-safe (the old client-side "already booked?" check
-- was a read-then-insert race with no constraint behind it).
alter table public.founder_call_bookings
  add constraint founder_call_bookings_user_id_key unique (user_id);

-- Bookings are now created ONLY by the server route (/api/founder-call-notification)
-- via the service-role client. Remove the client INSERT policy so a user can't
-- insert bookings directly from the browser (spam / bypass the slot cap and the
-- session-derived identity). SELECT-own stays so they can still see their booking.
drop policy if exists "Users can insert their own bookings" on public.founder_call_bookings;
