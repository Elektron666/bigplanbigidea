-- ORMEN Atelier: fabric brands and the web embed (Showroom package, job 16).
--
-- Every fabric gets a brand; the fabrics there are now are ORMEN's. A shop
-- may be limited to some brands (null = every brand); a fabric of a brand
-- that is off for the shop is on none of its screens. The web embed works
-- only on the sites (host names) the shop allows.
--
-- Only adds. Undo: supabase/geri-al/20261127000200_marka_gomme.sql

alter table public.fabrics add column if not exists brand text not null default 'ORMEN' check (char_length(brand) between 1 and 40);
alter table public.firms
  add column if not exists brands text[],
  add column if not exists embed_domains text[] not null default '{}';
