-- Undo of supabase/migrations/20261127000000_satici_modu.sql.
-- NOTE: this deletes the group prices shops entered and ORMEN's fabric price groups; export them first if they are needed.
drop function if exists public.shop_set_group_price(uuid, uuid, text, numeric);
drop table if exists public.firm_group_prices;
alter table public.fabrics drop column if exists price_group;
