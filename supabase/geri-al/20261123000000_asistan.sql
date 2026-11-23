-- Undoes supabase/migrations/20261123000000_asistan.sql.
-- NOTE: the models' use tags and the two new kinds of events are deleted.
delete from public.events where type in ('asistan_soru', 'danisman_tamamlandi');
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi', 'plan_acildi',
  'oturum_basladi', 'oturum_bitti', 'model_goruntulendi', 'kartela_okutuldu', 'foto_istendi', 'foto_basarili', 'foto_basarisiz',
  'kose_kuruldu', 'teklif_olusturuldu', 'siparis_talebi', 'vitrin_basladi', 'vitrin_bitti'));
alter table public.models drop column if exists use_tags;
