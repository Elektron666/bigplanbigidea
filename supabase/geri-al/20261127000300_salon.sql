-- Undo of supabase/migrations/20261127000300_salon.sql.
alter table public.photo_sessions drop constraint if exists photo_sessions_salon_not_kept;
alter table public.photo_sessions drop column if exists purpose;
