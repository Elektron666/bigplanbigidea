-- Undo of supabase/migrations/20261124000100_kullanim_raporu.sql. The events
-- themselves are not touched; only the report function, the shop owner's
-- read rule and the record of summaries handed out go.
drop table if exists public.usage_notices;
drop function if exists public.usage_report(timestamptz, timestamptz, text);
drop policy if exists "owner reads own shop events" on public.events;
drop function if exists public.my_firm_slugs();
