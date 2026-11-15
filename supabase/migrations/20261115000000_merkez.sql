-- ORMEN Atelier: the central panel (Showroom package, job 0).
-- One database, many shops. Adds roles, shop management, the central product
-- catalogue with per-shop overrides, devices, content versions and the change
-- log. Only adds; nothing existing is dropped or rewritten. Undo:
-- supabase/geri-al/20261115000000_merkez.sql. Run after the earlier migrations.

-- ------------------------------------------------------------------ roles
-- profiles.role already exists: 'admin' = ORMEN yöneticisi (everything),
-- 'staff' = ORMEN elemanı (setup and content; no price, subscription, delete).
-- A shop owner is not in profiles: they are a row in firm_members.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table public.firm_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, firm_id)
);
alter table public.firm_members enable row level security;

-- the shops the signed-in user owns (empty for everyone else)
create or replace function public.my_firm_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select firm_id from public.firm_members where user_id = auth.uid();
$$;

create policy "member reads own membership" on public.firm_members for select using (user_id = auth.uid() or public.is_staff());
create policy "staff writes memberships" on public.firm_members for insert with check (public.is_staff());
create policy "admin deletes memberships" on public.firm_members for delete using (public.is_admin());

-- ------------------------------------------------------------------ shops
-- firms is readable by the public (the shop's page), so only what the page
-- may know goes here. Everything else is in firm_admin.

alter table public.firms
  add column status text not null default 'aktif' check (status in ('pilot', 'aktif', 'askida', 'ayrildi')),
  add column city text check (char_length(city) <= 60),
  add column region text check (char_length(region) <= 60),
  -- feature flags: { "showroom": true, "kartela": true, … }; a missing key is off
  add column features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  -- settings the screen needs: { "vitrinSn": 60, "onerilenler": [...], … }
  add column settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  add column update_mode text not null default 'otomatik' check (update_mode in ('otomatik', 'onayli')),
  -- goes up whenever something this shop shows changes; its screens compare it with what they hold
  add column content_version bigint not null default 1;

create table public.firm_admin (
  firm_id uuid primary key references public.firms (id) on delete cascade,
  package text check (char_length(package) <= 40),
  tags text[] not null default '{}',
  contact text check (char_length(contact) <= 120),
  installed_on date,
  -- monthly photo try-on quota; null = not set by ORMEN yet (then nothing is generated)
  ai_quota integer check (ai_quota >= 0),
  -- scrypt hash of the shop PIN (leaving the screen, seller mode)
  pin_hash text,
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.firm_admin enable row level security;
create trigger firm_admin_touch before update on public.firm_admin for each row execute function public.touch_updated_at();
create policy "staff reads firm admin" on public.firm_admin for select using (public.is_staff());
create policy "staff inserts firm admin" on public.firm_admin for insert with check (public.is_staff());
create policy "staff updates firm admin" on public.firm_admin for update using (public.is_staff()) with check (public.is_staff());

-- Ready-made settings a new shop starts from.
create table public.firm_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  fabric_series text[] not null default '{}',
  ai_quota integer check (ai_quota >= 0),
  update_mode text not null default 'otomatik' check (update_mode in ('otomatik', 'onayli')),
  package text check (char_length(package) <= 40),
  created_at timestamptz not null default now()
);
alter table public.firm_templates enable row level security;
create policy "staff reads templates" on public.firm_templates for select using (public.is_staff());
create policy "staff inserts templates" on public.firm_templates for insert with check (public.is_staff());
create policy "staff updates templates" on public.firm_templates for update using (public.is_staff()) with check (public.is_staff());
create policy "admin deletes templates" on public.firm_templates for delete using (public.is_admin());

-- Maintenance fee, kept by hand (collecting the money is not this system's job).
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  amount numeric check (amount >= 0),
  period text not null default 'aylik' check (period in ('aylik', 'yillik')),
  due_on date not null,
  paid_on date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index subscriptions_due on public.subscriptions (due_on) where paid_on is null;
create index subscriptions_firm on public.subscriptions (firm_id, due_on desc);
alter table public.subscriptions enable row level security;
create policy "admin only subscriptions" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ central catalogue
-- A product is defined once (models). firm_id null = "ortak" (a maker's
-- product, can be given to many shops through firm_models); firm_id set =
-- "mağazaya özel" (that shop's own design, never shown to another shop).
-- The model, its sizes and its metres come from the centre; the shop changes
-- only how it is shown.

alter table public.models
  add column manufacturer text check (char_length(manufacturer) <= 80),
  add column category text check (category in ('koltuk-takimi', 'kanepe', 'kose', 'berjer', 'puf', 'diger')),
  add column style_tags text[] not null default '{}';
create index models_manufacturer on public.models (manufacturer) where manufacturer is not null;

alter table public.firm_models
  add column display_name text check (char_length(display_name) between 1 and 80),
  add column product_code text check (char_length(product_code) between 1 and 40),
  add column description text check (char_length(description) <= 500),
  add column featured boolean not null default false,
  add column hidden boolean not null default false;
create index firm_models_model on public.firm_models (model_id);

-- a shop's own product cannot be given to another shop, whoever asks
create or replace function public.firm_models_only_shared() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.models m where m.id = new.model_id and m.firm_id is not null) then
    raise exception 'magazaya ozel urun baska magazaya atanamaz' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger firm_models_only_shared before insert or update of model_id on public.firm_models
  for each row execute function public.firm_models_only_shared();

-- firm_models is readable by the public, so the shop's selling price is kept apart
create table public.firm_prices (
  firm_id uuid not null references public.firms (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  price numeric not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (firm_id, model_id)
);
alter table public.firm_prices enable row level security;
create trigger firm_prices_touch before update on public.firm_prices for each row execute function public.touch_updated_at();
create policy "admin or owner reads prices" on public.firm_prices for select using (public.is_admin() or firm_id in (select public.my_firm_ids()));
create policy "admin or owner inserts prices" on public.firm_prices for insert with check (public.is_admin() or firm_id in (select public.my_firm_ids()));
create policy "admin or owner updates prices" on public.firm_prices for update using (public.is_admin() or firm_id in (select public.my_firm_ids())) with check (public.is_admin() or firm_id in (select public.my_firm_ids()));
create policy "admin or owner deletes prices" on public.firm_prices for delete using (public.is_admin() or firm_id in (select public.my_firm_ids()));

-- One fabric switched off for one shop (a whole collection is firms.fabric_series).
create table public.firm_fabric_off (
  firm_id uuid not null references public.firms (id) on delete cascade,
  fabric_id uuid not null references public.fabrics (id) on delete cascade,
  primary key (firm_id, fabric_id)
);
alter table public.firm_fabric_off enable row level security;
create policy "staff reads fabric off" on public.firm_fabric_off for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff inserts fabric off" on public.firm_fabric_off for insert with check (public.is_staff());
create policy "staff deletes fabric off" on public.firm_fabric_off for delete using (public.is_staff());

-- ------------------------------------------------------------------ devices

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  branch text check (char_length(branch) <= 60),
  -- sha-256 of the secret the screen keeps; the secret itself is never stored
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  quality text not null default 'oto' check (quality in ('oto', 'hafif', 'tam')),
  app_version text check (char_length(app_version) <= 40),
  content_version bigint,
  sync_status text not null default 'bekliyor' check (sync_status in ('guncel', 'bekliyor', 'indiriyor', 'hata')),
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  -- "şimdi eşitle" / "yenile" asked from the panel; the screen acts on it at its next check
  sync_requested_at timestamptz,
  created_at timestamptz not null default now()
);
create index devices_firm on public.devices (firm_id);
create index devices_seen on public.devices (last_seen_at);
alter table public.devices enable row level security;
create policy "staff or owner reads devices" on public.devices for select using (public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff inserts devices" on public.devices for insert with check (public.is_staff());
create policy "staff updates devices" on public.devices for update using (public.is_staff()) with check (public.is_staff());
create policy "admin deletes devices" on public.devices for delete using (public.is_admin());

-- Short-lived 6-digit codes that tie a new screen to a shop. Server only.
create table public.device_pairings (
  code text primary key check (code ~ '^[0-9]{6}$'),
  firm_id uuid not null references public.firms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  branch text check (char_length(branch) <= 60),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.device_pairings enable row level security;
create policy "staff reads pairings" on public.device_pairings for select using (public.is_staff());

-- ------------------------------------------------------------------ change log
-- Who changed what, when, for which shop or product. Written by the server.
-- "before" lets a settings or assignment change be undone from the log.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null check (char_length(actor) <= 120),
  actor_role text not null check (actor_role in ('admin', 'staff', 'sahip', 'sistem')),
  firm_id uuid references public.firms (id) on delete set null,
  entity text not null check (entity in ('magaza', 'urun', 'atama', 'kumas', 'cihaz', 'abonelik', 'sablon', 'uye', 'destek')),
  entity_id text check (char_length(entity_id) <= 80),
  action text not null check (char_length(action) between 2 and 60),
  summary text not null check (char_length(summary) <= 300),
  before jsonb,
  after jsonb,
  -- the rows of one bulk action share a batch
  batch_id uuid,
  undone_at timestamptz
);
create index audit_log_at on public.audit_log (at desc);
create index audit_log_firm on public.audit_log (firm_id, at desc);
create index audit_log_batch on public.audit_log (batch_id) where batch_id is not null;
alter table public.audit_log enable row level security;
create policy "staff reads audit log" on public.audit_log for select using (public.is_staff());

-- ------------------------------------------------------------------ content version

create or replace function public.bump_firm_content(p_firm uuid) returns void
language sql security definer set search_path = public as $$
  update public.firms set content_version = content_version + 1 where id = p_firm;
$$;
revoke all on function public.bump_firm_content(uuid) from public, anon, authenticated;

-- the shop's own row: a visible change raises the version (unless the version itself is what changed)
create or replace function public.firms_bump() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.content_version = old.content_version and
     (new.name, new.logo_path, new.accent_color, new.whatsapp, new.fabric_series, new.presets, new.features, new.settings, new.status, new.update_mode, new.is_active)
     is distinct from
     (old.name, old.logo_path, old.accent_color, old.whatsapp, old.fabric_series, old.presets, old.features, old.settings, old.status, old.update_mode, old.is_active)
  then
    new.content_version = old.content_version + 1;
  end if;
  return new;
end;
$$;
create trigger firms_bump before update on public.firms for each row execute function public.firms_bump();

-- Rows that belong to one shop (assignment, price, fabric switched off): the
-- shops touched by a statement go up once, however many rows it changed
-- (a bulk assignment of 2 000 products is one statement).
create or replace function public.bump_firms_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1 where id in (select firm_id from new_rows);
  return null;
end;
$$;
create or replace function public.bump_firms_old() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1 where id in (select firm_id from old_rows);
  return null;
end;
$$;
create or replace function public.bump_firms_both() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1 where id in (select firm_id from new_rows union select firm_id from old_rows);
  return null;
end;
$$;

create trigger firm_models_bump_ins after insert on public.firm_models referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger firm_models_bump_upd after update on public.firm_models referencing old table as old_rows new table as new_rows for each statement execute function public.bump_firms_both();
create trigger firm_models_bump_del after delete on public.firm_models referencing old table as old_rows for each statement execute function public.bump_firms_old();
create trigger firm_prices_bump_ins after insert on public.firm_prices referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger firm_prices_bump_upd after update on public.firm_prices referencing old table as old_rows new table as new_rows for each statement execute function public.bump_firms_both();
create trigger firm_prices_bump_del after delete on public.firm_prices referencing old table as old_rows for each statement execute function public.bump_firms_old();
create trigger firm_fabric_off_bump_ins after insert on public.firm_fabric_off referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger firm_fabric_off_bump_del after delete on public.firm_fabric_off referencing old table as old_rows for each statement execute function public.bump_firms_old();

-- A product: its own shop, or every shop it is given to (a shop with no picks
-- shows the whole showcase). Also once per statement.
create or replace function public.bump_for_models(p_ids uuid[], p_firms uuid[], p_shared boolean) returns void
language sql security definer set search_path = public as $$
  update public.firms f set content_version = content_version + 1
  where f.id = any (p_firms)
     or exists (select 1 from public.firm_models fm where fm.firm_id = f.id and fm.model_id = any (p_ids))
     or (p_shared and not exists (select 1 from public.firm_models fm where fm.firm_id = f.id));
$$;
revoke all on function public.bump_for_models(uuid[], uuid[], boolean) from public, anon, authenticated;

create or replace function public.models_bump_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.bump_for_models(
    coalesce((select array_agg(id) from new_rows where firm_id is null), '{}'),
    coalesce((select array_agg(distinct firm_id) from new_rows where firm_id is not null), '{}'),
    exists (select 1 from new_rows where firm_id is null));
  return null;
end;
$$;
create or replace function public.models_bump_old() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.bump_for_models(
    coalesce((select array_agg(id) from old_rows where firm_id is null), '{}'),
    coalesce((select array_agg(distinct firm_id) from old_rows where firm_id is not null), '{}'),
    exists (select 1 from old_rows where firm_id is null));
  return null;
end;
$$;
create trigger models_bump_ins after insert on public.models referencing new table as new_rows for each statement execute function public.models_bump_new();
create trigger models_bump_upd after update on public.models referencing new table as new_rows for each statement execute function public.models_bump_new();
create trigger models_bump_del after delete on public.models referencing old table as old_rows for each statement execute function public.models_bump_old();

-- fabrics are central: any change may show on every shop's screen (once per statement, not per row)
create or replace function public.fabrics_bump() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1;
  return null;
end;
$$;
create trigger fabrics_bump after insert or update or delete on public.fabrics for each statement execute function public.fabrics_bump();
create trigger fabric_textures_bump after insert or update or delete on public.fabric_textures for each statement execute function public.fabrics_bump();

-- ------------------------------------------------------------------ "silme yok" for ORMEN elemanı
-- The older policies let every panel user delete. Restrictive policies narrow
-- that to the yönetici without touching the old ones.

create policy "only admin deletes fabrics" on public.fabrics as restrictive for delete using (public.is_admin());
create policy "only admin deletes firms" on public.firms as restrictive for delete using (public.is_admin());
create policy "only admin deletes models" on public.models as restrictive for delete using (public.is_admin());
create policy "only admin deletes feedback" on public.feedback as restrictive for delete using (public.is_admin());

-- ------------------------------------------------------------------ the centre's overview (numbers only)
-- One row per shop for the list screen: no personal data of anyone's customer.

create or replace function public.atelier_shops(p_search text default null, p_status text default null, p_city text default null, p_tag text default null,
  p_sort text default 'ad', p_limit integer default 50, p_offset integer default 0)
returns jsonb
language sql stable set search_path = public as $$
  with base as (
    select f.id, f.name, f.slug, f.status, f.city, f.region, f.is_active, f.content_version, f.update_mode,
           a.package, a.tags, a.contact, a.installed_on,
           (select count(*) from devices d where d.firm_id = f.id) as devices,
           (select max(d.last_seen_at) from devices d where d.firm_id = f.id) as last_seen,
           (select count(*) from devices d where d.firm_id = f.id and d.sync_status = 'hata') as sync_errors,
           (select count(*) from firm_models fm where fm.firm_id = f.id) + (select count(*) from models m where m.firm_id = f.id) as products,
           (select min(s.due_on) from subscriptions s where s.firm_id = f.id and s.paid_on is null) as next_due
    from firms f
    left join firm_admin a on a.firm_id = f.id
    where (p_search is null or f.name ilike '%' || p_search || '%' or f.slug ilike '%' || p_search || '%' or a.contact ilike '%' || p_search || '%')
      and (p_status is null or f.status = p_status)
      and (p_city is null or f.city = p_city)
      and (p_tag is null or p_tag = any (a.tags))
  ),
  page as (
    select * from base
    order by
      case when p_sort = 'kurulum' then installed_on end desc nulls last,
      case when p_sort = 'son-gorulme' then last_seen end desc nulls last,
      case when p_sort = 'vade' then next_due end asc nulls last,
      name
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'rows', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb)
  );
$$;
revoke all on function public.atelier_shops(text, text, text, text, text, integer, integer) from public, anon, authenticated;
