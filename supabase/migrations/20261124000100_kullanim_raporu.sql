-- ORMEN Atelier: the monthly usage report (Showroom package, job 11).
--
-- usage_report() sums one period of the event log by shop: showroom visits
-- and their length, web visits, fabrics tried and the five most tried,
-- models viewed and the five most viewed, quotes, order requests, swatch
-- cards read, photo try-ons, assistant questions. The same sums as
-- lib/rapor/kullanim.ts (tests/unit/kullanim-db.test.ts checks they agree).
--
-- It runs with the caller's rights (security invoker): the row rules of the
-- events table decide what it sees. A shop owner now reads the events of
-- their own shop, and only those; ORMEN's staff reads all, as before. Events
-- hold no personal data (no IP, no name).
--
-- Also a record of the monthly summaries handed to shops (one per shop and
-- month), so the panel shows "Ekim raporunuz hazır" once and ORMEN sees who
-- has been told.
--
-- Only adds. Undo: supabase/geri-al/20261124000100_kullanim_raporu.sql

-- the slugs of the signed-in owner's shops, whatever the shops' state (a hidden shop's owner still reads its report)
create or replace function public.my_firm_slugs() returns setof text
language sql stable security definer set search_path = public as $$
  select f.slug from public.firms f join public.firm_members m on m.firm_id = f.id where m.user_id = auth.uid();
$$;

create policy "owner reads own shop events" on public.events for select
  using (firm_slug is not null and firm_slug in (select public.my_firm_slugs()));

create or replace function public.usage_report(p_from timestamptz, p_to timestamptz, p_firm text default null)
returns jsonb
language sql stable security invoker set search_path = public as $$
  with e as (
    select type, session_id, firm_slug, model_slug, fabric_code, n
    from public.events
    where created_at >= p_from and created_at <= p_to and firm_slug is not null and (p_firm is null or firm_slug = p_firm)
  ),
  per as (
    select firm_slug,
      count(*) filter (where type = 'oturum_basladi') as sessions,
      coalesce(sum(n) filter (where type = 'oturum_bitti'), 0) as seconds,
      count(*) filter (where type = 'oturum_bitti' and n is not null) as ended,
      count(distinct session_id) filter (where type = 'sayfa_acildi') as web,
      count(*) filter (where type = 'kumas_denendi') as tries,
      count(*) filter (where type = 'model_goruntulendi') as views,
      count(*) filter (where type = 'teklif_olusturuldu') as quotes,
      count(*) filter (where type = 'siparis_talebi') as orders,
      count(*) filter (where type = 'kartela_okutuldu') as kartela,
      count(*) filter (where type = 'foto_istendi') as photo_requests,
      count(*) filter (where type = 'foto_basarili') as photo_ok,
      count(*) filter (where type = 'foto_basarisiz') as photo_failed,
      count(*) filter (where type = 'asistan_soru') as questions,
      count(*) filter (where type = 'danisman_tamamlandi') as advisor
    from e group by firm_slug
  ),
  fab as (
    select firm_slug, fabric_code, count(*) as n,
      row_number() over (partition by firm_slug order by count(*) desc, fabric_code collate "C") as r
    from e where type = 'kumas_denendi' and fabric_code is not null group by firm_slug, fabric_code
  ),
  mdl as (
    select firm_slug, model_slug, count(*) as n,
      row_number() over (partition by firm_slug order by count(*) desc, model_slug collate "C") as r
    from e where type = 'model_goruntulendi' and model_slug is not null group by firm_slug, model_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'firmSlug', p.firm_slug,
      'sessions', p.sessions, 'seconds', p.seconds, 'ended', p.ended, 'webVisits', p.web,
      'fabricTries', p.tries,
      'topFabrics', coalesce((select jsonb_agg(jsonb_build_object('code', f.fabric_code, 'n', f.n) order by f.r) from fab f where f.firm_slug = p.firm_slug and f.r <= 5), '[]'::jsonb),
      'modelViews', p.views,
      'topModels', coalesce((select jsonb_agg(jsonb_build_object('slug', m.model_slug, 'n', m.n) order by m.r) from mdl m where m.firm_slug = p.firm_slug and m.r <= 5), '[]'::jsonb),
      'quotes', p.quotes, 'orders', p.orders, 'kartela', p.kartela,
      'photoRequests', p.photo_requests, 'photoOk', p.photo_ok, 'photoFailed', p.photo_failed,
      'questions', p.questions, 'advisor', p.advisor
    ) order by p.firm_slug collate "C"), '[]'::jsonb)
  from per p;
$$;
grant execute on function public.usage_report(timestamptz, timestamptz, text) to authenticated;

-- each showroom screen's last visit (for "30 gündür kullanılmayan ekran"); the caller's row rules apply
create or replace function public.screen_last_sessions()
returns table (device_id uuid, last_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select device_id, max(created_at) from public.events where type = 'oturum_basladi' and device_id is not null group by device_id;
$$;
grant execute on function public.screen_last_sessions() to authenticated;

-- the monthly summary handed to a shop: once per shop and month
create table public.usage_notices (
  firm_id uuid not null references public.firms (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (firm_id, month)
);
alter table public.usage_notices enable row level security;
create policy "staff reads usage notices" on public.usage_notices for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff writes usage notices" on public.usage_notices for all using (public.is_staff()) with check (public.is_staff());
-- the owner marks the summary as seen (only that column matters; nothing else of the row can change hands)
create policy "owner marks own usage notice" on public.usage_notices for update using (firm_id in (select public.my_firm_ids())) with check (firm_id in (select public.my_firm_ids()));
