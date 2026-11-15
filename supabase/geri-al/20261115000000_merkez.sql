-- Undoes supabase/migrations/20261115000000_merkez.sql. Removes only what that
-- file added; the tables and columns that existed before it are left as they were.
-- NOTE: this drops the data in the tables it removes (shops' devices, prices,
-- subscriptions, change log). Take a backup first.

drop function if exists public.atelier_shops(text, text, text, text, text, integer, integer);

drop policy if exists "only admin deletes fabrics" on public.fabrics;
drop policy if exists "only admin deletes firms" on public.firms;
drop policy if exists "only admin deletes models" on public.models;
drop policy if exists "only admin deletes feedback" on public.feedback;

drop trigger if exists fabric_textures_bump on public.fabric_textures;
drop trigger if exists fabrics_bump on public.fabrics;
drop trigger if exists models_bump_ins on public.models;
drop trigger if exists models_bump_upd on public.models;
drop trigger if exists models_bump_del on public.models;
drop trigger if exists firm_models_bump_ins on public.firm_models;
drop trigger if exists firm_models_bump_upd on public.firm_models;
drop trigger if exists firm_models_bump_del on public.firm_models;
drop trigger if exists firms_bump on public.firms;
drop trigger if exists firm_models_only_shared on public.firm_models;

drop table if exists public.audit_log;
drop table if exists public.device_pairings;
drop table if exists public.devices;
drop table if exists public.firm_fabric_off;
drop table if exists public.firm_prices;
drop table if exists public.subscriptions;
drop table if exists public.firm_templates;
drop table if exists public.firm_admin;
drop table if exists public.firm_members;

drop function if exists public.fabrics_bump();
drop function if exists public.models_bump_new();
drop function if exists public.models_bump_old();
drop function if exists public.bump_for_models(uuid[], uuid[], boolean);
drop function if exists public.bump_firms_new();
drop function if exists public.bump_firms_old();
drop function if exists public.bump_firms_both();
drop function if exists public.firms_bump();
drop function if exists public.bump_firm_content(uuid);
drop function if exists public.firm_models_only_shared();
drop function if exists public.my_firm_ids();
drop function if exists public.is_admin();

drop index if exists public.firm_models_model;
alter table public.firm_models
  drop column if exists display_name,
  drop column if exists product_code,
  drop column if exists description,
  drop column if exists featured,
  drop column if exists hidden;

drop index if exists public.models_manufacturer;
alter table public.models
  drop column if exists manufacturer,
  drop column if exists category,
  drop column if exists style_tags;

alter table public.firms
  drop column if exists status,
  drop column if exists city,
  drop column if exists region,
  drop column if exists features,
  drop column if exists settings,
  drop column if exists update_mode,
  drop column if exists content_version;
