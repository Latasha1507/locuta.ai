-- idx_user_progress_user and idx_user_progress_user_id are identical (both on
-- user_id). Keep one, drop the redundant duplicate (wastes write throughput + space).
drop index if exists public.idx_user_progress_user;
