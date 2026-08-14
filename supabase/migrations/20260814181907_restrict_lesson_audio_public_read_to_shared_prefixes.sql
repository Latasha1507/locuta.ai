-- The lesson-audio bucket mixes SHARED content (intros/, greetings/) with PRIVATE
-- user data (recordings/<uid>/..., examples/<uid>/...). The old policy granted the
-- public role SELECT over the ENTIRE bucket, so anyone with the anon key could
-- .list() and enumerate + download every user's voice recording.
--
-- Restrict public SELECT (which governs the list/search API) to the shared
-- prefixes only. The app reads/writes these objects with the service-role client
-- (bypasses RLS), and public-URL playback is unaffected, so nothing legit breaks —
-- but anon/authenticated can no longer enumerate recordings/ or examples/.
--
-- NOTE: full privacy for recordings still wants a separate PRIVATE bucket + signed
-- URLs (recordings remain directly fetchable by exact URL while the bucket is
-- public). This migration closes the mass-enumeration hole; the bucket split is a
-- tracked follow-up.
drop policy if exists "lesson-audio public read" on storage.objects;

create policy "lesson-audio public shared read" on storage.objects
  for select to public
  using (
    bucket_id = 'lesson-audio'
    and (name like 'intros/%' or name like 'greetings/%')
  );
