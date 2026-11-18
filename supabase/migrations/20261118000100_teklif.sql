-- ORMEN Atelier: quotes and fabric order requests (Showroom package, job 3).
-- Only adds. Undo: supabase/geri-al/20261118000100_teklif.sql. Run after the earlier migrations.

-- ------------------------------------------------------------------ waste settings
-- One row, entered by ORMEN. Empty waste figures add nothing (the quote then says
-- "fire dahil değildir"); no default figure is invented. The rounding step's 0,5 m
-- default comes from the task itself.
create table public.meterage_settings (
  id integer primary key default 1 check (id = 1),
  waste_duz numeric check (waste_duz >= 0 and waste_duz <= 100),
  waste_donuk numeric check (waste_donuk >= 0 and waste_donuk <= 100),
  waste_raporlu numeric check (waste_raporlu >= 0 and waste_raporlu <= 100),
  round_step numeric not null default 0.5 check (round_step >= 0.05 and round_step <= 2),
  updated_at timestamptz not null default now()
);
insert into public.meterage_settings (id) values (1) on conflict (id) do nothing;
alter table public.meterage_settings enable row level security;
create trigger meterage_settings_touch before update on public.meterage_settings for each row execute function public.touch_updated_at();
create policy "staff reads waste" on public.meterage_settings for select using (public.is_staff());
create policy "admin writes waste" on public.meterage_settings for update using (public.is_admin()) with check (public.is_admin());

-- Parts a firm counts beyond Kasa / Kollar / Oturak / Sırt (Kırlent, Biye…),
-- [{ "name": "Kırlent", "metres": 0.6 }], for the same fabric width.
alter table public.models
  add column if not exists meterage_extra jsonb
  check (meterage_extra is null or (jsonb_typeof(meterage_extra) = 'array' and jsonb_array_length(meterage_extra) <= 8));

-- ------------------------------------------------------------------ quotes
-- What ORMEN may see: the fabrics, the metres, the totals. No customer.
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms (id) on delete set null,
  device_id uuid references public.devices (id) on delete set null,
  number text not null unique check (number ~ '^T-[0-9A-HJ-NP-Z]{6}$'),
  -- the link the customer's phone opens (/t/<token>): long and random, the only key to it
  view_token text not null unique check (view_token ~ '^[A-Za-z0-9_-]{22,64}$'),
  -- made once on the device: the same quote sent twice from the outbox is stored once
  client_id text unique check (client_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  -- what was quoted: pieces, fabrics, parts, metres, waste used (checked by the app)
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  -- per fabric: [{ "code": "SIENA-04", "metres": 9 }]; only fabrics that have a total
  totals jsonb not null default '[]'::jsonb check (jsonb_typeof(totals) = 'array'),
  waste_missing boolean not null default false,
  price numeric check (price >= 0 and price <= 100000000),
  created_at timestamptz not null default now()
);
create index quotes_firm on public.quotes (firm_id, created_at desc);
create index quotes_created on public.quotes (created_at desc);
alter table public.quotes enable row level security;
create policy "staff or owner reads quotes" on public.quotes for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));

-- What only the shop may see: the customer's name and the salesperson's note.
-- No policy for ORMEN at all: the centre cannot read these, by any query.
create table public.quote_private (
  quote_id uuid primary key references public.quotes (id) on delete cascade,
  firm_id uuid references public.firms (id) on delete cascade,
  customer_name text check (char_length(customer_name) between 1 and 80),
  note text check (char_length(note) <= 300)
);
alter table public.quote_private enable row level security;
create policy "owner reads own quote details" on public.quote_private for select using (firm_id in (select public.my_firm_ids()));

-- ------------------------------------------------------------------ order requests
-- "ORMEN'e sipariş talebi gönder": fabric codes and metres. One per quote, however
-- many times the button is pressed.
create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes (id) on delete cascade,
  firm_id uuid references public.firms (id) on delete set null,
  -- [{ "code": "SIENA-04", "metres": 9 }]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  status text not null default 'yeni' check (status in ('yeni', 'goruldu', 'hazirlaniyor', 'gonderildi', 'iptal')),
  status_at timestamptz,
  created_at timestamptz not null default now()
);
create index order_requests_created on public.order_requests (created_at desc);
create index order_requests_firm on public.order_requests (firm_id, created_at desc);
alter table public.order_requests enable row level security;
create policy "staff or owner reads orders" on public.order_requests for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff updates orders" on public.order_requests for update using (public.is_staff()) with check (public.is_staff());
