-- ORMEN Atelier: fabric properties, stock and alternatives (Showroom package,
-- job 8, "Kumaş özellikleri, stok ve filtreler").
--
-- Three properties ORMEN marks by hand: stain resistant, pet resistant, easy
-- to clean. null = not entered (never shown, never matched by a filter);
-- nothing is filled in from the fabric type. Wear (Martindale) and
-- composition were already there.
--
-- Stock is kept apart from the fabric: status (var / az / yok) and the lead
-- time in days. It is not public: no policy lets the anon key read it; the
-- server reads it with the service role and gives it only to the screens of
-- shops that show stock (lib/central/features.ts, "stok").
--
-- Links between fabrics: "muadil" (what to offer when a fabric is out of
-- stock) and "uyumlu" (fabrics that go together, for the set scene, job 6).
-- Both are entered by ORMEN; an empty list is never filled in by a rule here.
--
-- Only adds. Undo: supabase/geri-al/20261124000000_kumas_ozellik_stok.sql

alter table public.fabrics
  add column if not exists stain_resistant boolean,
  add column if not exists pet_resistant boolean,
  add column if not exists easy_clean boolean;

create table public.fabric_stock (
  fabric_id uuid primary key references public.fabrics (id) on delete cascade,
  status text not null check (status in ('var', 'az', 'yok')),
  lead_days integer check (lead_days between 1 and 365),
  updated_at timestamptz not null default now()
);
alter table public.fabric_stock enable row level security;
-- staff only: the screens get stock through the server, never from the browser's key
create policy "staff reads stock" on public.fabric_stock for select using (public.is_staff());
create policy "staff writes stock" on public.fabric_stock for all using (public.is_staff()) with check (public.is_staff());

create table public.fabric_links (
  fabric_id uuid not null references public.fabrics (id) on delete cascade,
  other_id uuid not null references public.fabrics (id) on delete cascade,
  kind text not null check (kind in ('muadil', 'uyumlu')),
  sort_order integer not null default 0,
  primary key (fabric_id, kind, other_id),
  check (fabric_id <> other_id)
);
alter table public.fabric_links enable row level security;
create policy "public reads fabric links" on public.fabric_links for select using (true);
create policy "staff writes fabric links" on public.fabric_links for all using (public.is_staff()) with check (public.is_staff());

-- a change shows on every shop's screen, like any fabric change
create trigger fabric_stock_bump after insert or update or delete on public.fabric_stock for each statement execute function public.fabrics_bump();
create trigger fabric_links_bump after insert or update or delete on public.fabric_links for each statement execute function public.fabrics_bump();
