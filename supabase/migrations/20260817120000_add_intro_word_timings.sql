-- Karaoke read-along on the practice page: highlight each word of the coach's
-- lesson as it is spoken. The coach audio is TTS (no inherent word timings), so
-- we align it once with Whisper word timestamps and cache the result here,
-- alongside the audio it belongs to. Shape: jsonb array of
--   [{ "word": "Today's", "start": 0.0, "end": 0.34 }, ...]
-- on the LESSON clip's own 0-based timeline (the greeting is a separate clip).
-- Nullable: legacy rows are backfilled lazily on first serve, and a row with no
-- timings simply renders the transcript without highlighting.
alter table public.cached_lesson_intros
  add column if not exists intro_word_timings jsonb;
