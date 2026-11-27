-- Undo of supabase/migrations/20261127000400_video_musteri.sql.
-- NOTE: this deletes the interested customers the shops collected. The video
-- bucket goes only when empty (empty it in the dashboard first).
drop function if exists public.shop_set_lead_retention(uuid, integer);
drop table if exists public.customer_leads;
alter table public.firms drop column if exists lead_retention_days;
delete from storage.buckets where id = 'video' and not exists (select 1 from storage.objects where bucket_id = 'video');
