-- ORMEN Atelier: the assistant and sofa advisor (Showroom package, job 10;
-- Fatih Bey: "soru sorabileceği, fikir alacağı, metraj hesaplatacağı").
-- A model's use tags (its style tags came with 20261115000000_merkez.sql),
-- and two more event types: a question asked, an advisor round finished.
-- No question text is stored: only that one was asked and what kind.
-- Only adds. Undo: supabase/geri-al/20261123000000_asistan.sql

alter table public.models
  add column if not exists use_tags text[] not null default '{}';

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi', 'plan_acildi',
  'oturum_basladi', 'oturum_bitti', 'model_goruntulendi', 'kartela_okutuldu', 'foto_istendi', 'foto_basarili', 'foto_basarisiz',
  'kose_kuruldu', 'teklif_olusturuldu', 'siparis_talebi', 'vitrin_basladi', 'vitrin_bitti',
  'asistan_soru', 'danisman_tamamlandi'));
