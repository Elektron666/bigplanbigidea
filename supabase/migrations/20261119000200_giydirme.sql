-- ORMEN Atelier: photo try-on (Showroom package, job 5, "Anında giydirme").
--
-- The customer's photo and the pictures made from it live in a PRIVATE
-- storage bucket ("giydirme"): no row rule opens it to anyone; only the
-- server (service key) reads and writes it, and hands each picture only to
-- the screen of the session it belongs to. A session's files are deleted
-- when the session ends (the screen's showroom loop starts) unless the shop
-- keeps the photo as a product photo; sessions left open are swept.
--
-- New tables and one new bucket only; nothing existing is changed.
-- Undo: supabase/geri-al/20261119000200_giydirme.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('giydirme', 'giydirme', false, 15728640, array['image/jpeg'])
on conflict (id) do nothing;

-- One try-on session on a screen: its one-time code also lets a phone send
-- one photo to it (/y/<code>), without signing in.
create table public.photo_sessions (
  code text primary key check (code ~ '^[0-9A-HJ-NP-Z]{8}$'),
  firm_id uuid not null references public.firms (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  photo_path text,
  photo_from text check (photo_from in ('ekran', 'telefon', 'kayitli')),
  -- the phone may send one photo; after that the code no longer takes uploads
  phone_used boolean not null default false,
  -- "ürün fotoğrafı olarak sakla": kept as the shop's photo when the session ends
  keep boolean not null default false,
  ended_at timestamptz
);
create index photo_sessions_open on public.photo_sessions (expires_at) where ended_at is null;

-- Every provider call (and every try refused by the quota), for the quota and the cost report.
create table public.ai_calls (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null default 'giydirme' check (kind in ('giydirme', 'test', 'salon')),
  firm_id uuid references public.firms (id) on delete set null,
  device_id uuid references public.devices (id) on delete set null,
  provider text not null check (char_length(provider) <= 40),
  fabric_code text check (char_length(fabric_code) <= 24),
  ms integer check (ms >= 0),
  cost_usd numeric(10, 4) check (cost_usd >= 0),
  status text not null check (status in ('basarili', 'basarisiz', 'zaman-asimi', 'kota')),
  error text check (char_length(error) <= 300)
);
create index ai_calls_firm_month on public.ai_calls (firm_id, at desc);
create index ai_calls_at on public.ai_calls (at desc);

-- Photos a shop chose to keep ("ürün fotoğrafı olarak sakla"), offered again in later sessions.
create table public.firm_photos (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index firm_photos_firm on public.firm_photos (firm_id, created_at desc);

-- The panel's try-on test bench (job 5: "Giydirme testi"): runs over a photo set, each result judged by ORMEN.
create table public.ai_test_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  provider text not null,
  fabric_codes text[] not null default '{}'
);
create table public.ai_test_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_test_runs (id) on delete cascade,
  photo_path text not null,
  fabric_code text not null,
  result_path text,
  status text not null default 'bekliyor' check (status in ('bekliyor', 'basarili', 'basarisiz', 'zaman-asimi')),
  ms integer,
  cost_usd numeric(10, 4),
  error text check (char_length(error) <= 300),
  verdict text check (verdict in ('gosterilebilir', 'gosterilemez')),
  note text check (char_length(note) <= 300)
);
create index ai_test_items_run on public.ai_test_items (run_id);

alter table public.photo_sessions enable row level security;
alter table public.ai_calls enable row level security;
alter table public.firm_photos enable row level security;
alter table public.ai_test_runs enable row level security;
alter table public.ai_test_items enable row level security;
-- sessions: the server alone (the code is the key, never a row rule)
create policy "staff reads ai calls" on public.ai_calls for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff or owner reads firm photos" on public.firm_photos for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff reads test runs" on public.ai_test_runs for select using (public.is_staff());
create policy "staff reads test items" on public.ai_test_items for select using (public.is_staff());
