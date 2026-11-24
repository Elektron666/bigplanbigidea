-- Undo of supabase/migrations/20261124000000_kumas_ozellik_stok.sql. Removes
-- the stock and fabric link tables and the three property columns.
-- NOTE: this deletes the stock, alternatives and properties entered in the panel; export them first if they are needed.
drop table if exists public.fabric_links;
drop table if exists public.fabric_stock;
alter table public.fabrics
  drop column if exists stain_resistant,
  drop column if exists pet_resistant,
  drop column if exists easy_clean;
