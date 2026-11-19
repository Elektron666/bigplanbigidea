-- Undo of supabase/migrations/20261119000200_giydirme.sql. Drops the try-on
-- tables. The private bucket's files must be emptied in the Supabase
-- dashboard (Storage → giydirme) before the bucket itself can go; the bucket
-- row is removed only when it is empty.
-- NOTE: this deletes the call log (quota and cost history) and the test runs.
drop table if exists public.ai_test_items;
drop table if exists public.ai_test_runs;
drop table if exists public.firm_photos;
drop table if exists public.ai_calls;
drop table if exists public.photo_sessions;
delete from storage.buckets where id = 'giydirme' and not exists (select 1 from storage.objects where bucket_id = 'giydirme');
