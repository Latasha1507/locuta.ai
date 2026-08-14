-- cached_lesson_intros.lesson_number was a dead legacy column: NOT NULL, no
-- default, and set by NO current code (the app standardized on level_number).
-- Its presence made EVERY cache insert fail silently, so lesson intros were never
-- cached and every lesson open re-ran GPT-4o + TTS (a real, ongoing cost leak).
-- Preserve the one legacy row by backfilling level_number from it, then drop the
-- column so the cache path works.
update public.cached_lesson_intros
   set level_number = lesson_number
 where level_number is null;

alter table public.cached_lesson_intros drop column lesson_number;
