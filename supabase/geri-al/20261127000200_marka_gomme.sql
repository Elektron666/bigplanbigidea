-- Undo of supabase/migrations/20261127000200_marka_gomme.sql.
-- NOTE: this deletes the fabrics' brands and the shops' brand and embed settings.
alter table public.fabrics drop column if exists brand;
alter table public.firms drop column if exists brands, drop column if exists embed_domains;
