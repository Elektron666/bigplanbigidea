-- Undo of supabase/migrations/20261127000100_takim.sql.
-- NOTE: this deletes the sofa sets entered in the panel; export them first if they are needed.
drop table if exists public.firm_sets;
