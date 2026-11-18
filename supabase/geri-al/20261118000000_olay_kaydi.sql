-- Undoes supabase/migrations/20261118000000_olay_kaydi.sql.
-- NOTE: events of the new types are deleted first, or the old type list
-- would refuse them; take a backup if they matter.
drop index if exists public.events_device;
drop index if exists public.events_client_id;
alter table public.events
  drop column if exists zone,
  drop column if exists n,
  drop column if exists n2,
  drop column if exists device_id,
  drop column if exists client_id;
delete from public.events where type not in ('sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi', 'plan_acildi');
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type in ('sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi', 'plan_acildi'));
