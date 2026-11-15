-- Undoes supabase/migrations/20261115000100_katalog.sql (a function only; no data is lost).
drop function if exists public.atelier_products(text, text, text, text, uuid, boolean, integer, integer);
