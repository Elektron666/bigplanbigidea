-- Undoes supabase/migrations/20261118000100_teklif.sql. Undo files run newest first.
-- NOTE: this deletes every quote and order request. Take a backup first.
drop table if exists public.order_requests;
drop table if exists public.quote_private;
drop table if exists public.quotes;
drop table if exists public.meterage_settings;
alter table public.models drop column if exists meterage_extra;
