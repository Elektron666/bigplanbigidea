-- ORMEN Atelier: module sets for the corner set builder (Showroom package,
-- job 4, second part). A set stands for one sofa series: its modules (arm,
-- seat, corner, chaise, pouf), each with its GLB file, its size, where its
-- neighbours join and its metres; the set is given to shops.
--
-- New tables only; nothing existing is changed. A set is never deleted from
-- the panel, only taken off (is_active). Undo: supabase/geri-al/20261119000100_modul_setleri.sql

create table public.module_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  -- the fabric width the modules' metres were measured at
  ref_width_cm numeric not null default 140 check (ref_width_cm > 0 and ref_width_cm <= 400),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger module_sets_touch before update on public.module_sets for each row execute function public.touch_updated_at();

create table public.module_set_modules (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.module_sets (id) on delete cascade,
  -- the module's name in links (?mk=set:key.key…): kept when the module is edited
  key text not null check (key ~ '^[a-z0-9-]{1,40}$'),
  type text not null check (type in ('kol-sol', 'kol-sag', 'tekli', 'kose', 'sezlong-sol', 'sezlong-sag', 'puf')),
  name text not null check (char_length(name) between 1 and 60),
  width_cm numeric not null check (width_cm > 0 and width_cm <= 400),
  depth_cm numeric not null check (depth_cm > 0 and depth_cm <= 400),
  height_cm numeric not null check (height_cm > 0 and height_cm <= 200),
  glb_path text,
  -- { "sol": { "x": 0, "z": 0 }, "sag": { "x": 65, "z": 0 } } in the GLB's own cm; null = from its box
  joints jsonb check (joints is null or jsonb_typeof(joints) = 'object'),
  -- { "zones": { "govde": 1, "oturak": 0.7 }, "extra": [{ "name": "Kırlent", "metres": 0.4 }] }
  metres jsonb check (metres is null or jsonb_typeof(metres) = 'object'),
  sort_order integer not null default 0,
  unique (set_id, key)
);
create index module_set_modules_set on public.module_set_modules (set_id, sort_order);

create table public.module_set_firms (
  set_id uuid not null references public.module_sets (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  primary key (set_id, firm_id)
);
create index module_set_firms_firm on public.module_set_firms (firm_id);

alter table public.module_sets enable row level security;
alter table public.module_set_modules enable row level security;
alter table public.module_set_firms enable row level security;
-- the shop pages and screens read them without signing in (as they read models)
create policy "public reads active module sets" on public.module_sets for select using (is_active or public.is_staff());
create policy "public reads modules of readable sets" on public.module_set_modules for select using (exists (select 1 from public.module_sets s where s.id = set_id and (s.is_active or public.is_staff())));
create policy "public reads module set shops" on public.module_set_firms for select using (true);
create policy "staff writes module sets" on public.module_sets for all using (public.is_staff()) with check (public.is_staff());
create policy "staff writes modules" on public.module_set_modules for all using (public.is_staff()) with check (public.is_staff());
create policy "staff writes module set shops" on public.module_set_firms for all using (public.is_staff()) with check (public.is_staff());
-- a set itself is taken off, never deleted, except by the yönetici
create policy "only admin deletes module sets" on public.module_sets as restrictive for delete using (public.is_admin());

-- content version: a shop's screens hear about a set given to them, taken
-- away, or changed (once per statement, see 20261115000000_merkez.sql)
create trigger module_set_firms_bump_ins after insert on public.module_set_firms referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger module_set_firms_bump_del after delete on public.module_set_firms referencing old table as old_rows for each statement execute function public.bump_firms_old();

create or replace function public.module_sets_bump() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1
   where id in (select f.firm_id from public.module_set_firms f where f.set_id in (select id from changed_rows));
  return null;
end;
$$;
create or replace function public.module_set_modules_bump() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.firms set content_version = content_version + 1
   where id in (select f.firm_id from public.module_set_firms f where f.set_id in (select set_id from changed_rows));
  return null;
end;
$$;
create trigger module_sets_bump after update on public.module_sets referencing new table as changed_rows for each statement execute function public.module_sets_bump();
create trigger module_set_modules_bump_ins after insert on public.module_set_modules referencing new table as changed_rows for each statement execute function public.module_set_modules_bump();
create trigger module_set_modules_bump_upd after update on public.module_set_modules referencing new table as changed_rows for each statement execute function public.module_set_modules_bump();
create trigger module_set_modules_bump_del after delete on public.module_set_modules referencing old table as changed_rows for each statement execute function public.module_set_modules_bump();
