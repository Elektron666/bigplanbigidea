-- Undo of supabase/migrations/20261119000100_modul_setleri.sql. Removes the
-- module set tables and their functions. The uploaded GLB files stay in
-- Storage (atelier/moduller/…); the change-log rows stay (history).
-- NOTE: this deletes the module sets entered in the panel; export them first if they are needed.
drop table if exists public.module_set_firms;
drop table if exists public.module_set_modules;
drop table if exists public.module_sets;
drop function if exists public.module_sets_bump();
drop function if exists public.module_set_modules_bump();
