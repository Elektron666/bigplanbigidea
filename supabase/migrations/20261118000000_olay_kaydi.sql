-- ORMEN Atelier: the event log grows with the Showroom package (task section 9).
-- New event types; which part a fabric went on; one or two numbers (a session's
-- seconds, a corner set's module count and length); the showroom screen; and a
-- record id made on the device, so a record sent twice (an offline queue that
-- retries) is stored once. Still anonymous: no IP, no name, no photo.
-- Only adds. Undo: supabase/geri-al/20261118000000_olay_kaydi.sql. Run after the earlier migrations.

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi', 'plan_acildi',
  'oturum_basladi', 'oturum_bitti', 'model_goruntulendi', 'kartela_okutuldu', 'foto_istendi', 'foto_basarili', 'foto_basarisiz',
  'kose_kuruldu', 'teklif_olusturuldu', 'siparis_talebi', 'vitrin_basladi', 'vitrin_bitti'));

alter table public.events
  add column if not exists zone text check (zone in ('govde', 'kol', 'oturak', 'sirt', 'biye')),
  add column if not exists n numeric check (n >= 0 and n <= 100000),
  add column if not exists n2 numeric check (n2 >= 0 and n2 <= 100000),
  add column if not exists device_id uuid references public.devices (id) on delete set null,
  add column if not exists client_id text check (client_id ~ '^[A-Za-z0-9_-]{8,64}$');

-- the same record twice is one record
create unique index if not exists events_client_id on public.events (client_id) where client_id is not null;
create index if not exists events_device on public.events (device_id, created_at desc) where device_id is not null;
