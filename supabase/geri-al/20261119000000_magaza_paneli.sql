-- Undo of supabase/migrations/20261119000000_magaza_paneli.sql. Removes the
-- two functions only; no data was added by the migration. The change-log
-- rows the functions wrote stay (they are history).
drop function if exists public.shop_set_price(uuid, uuid, numeric);
drop function if exists public.shop_save_product(uuid, uuid, text, text, text, boolean, boolean);
