-- ORMEN Atelier: sofa sets (Showroom package, job 6, "Takım sahnesi").
-- A shop's set: which of its models (üçlü, ikili, berjer, puf…) and where each
-- stands relative to the main piece (cm, degrees). Entered by ORMEN in the
-- panel; shown on the shop's screens. No prices or personal data in it.
-- Only adds. Undo: supabase/geri-al/20261127000100_takim.sql

create table public.firm_sets (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$'),
  name text not null check (char_length(name) between 2 and 60),
  -- [{ "modelId": "…", "x": 0, "z": 0, "rot": 0 }], checked by the app (lib/takim/takim.ts)
  pieces jsonb not null check (jsonb_typeof(pieces) = 'array' and jsonb_array_length(pieces) between 2 and 6),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (firm_id, slug)
);
alter table public.firm_sets enable row level security;
create policy "public reads active sets" on public.firm_sets for select using (is_active or public.is_staff() or firm_id in (select public.my_firm_ids()));
create policy "staff writes sets" on public.firm_sets for all using (public.is_staff()) with check (public.is_staff());
create policy "only admin deletes sets" on public.firm_sets as restrictive for delete using (public.is_admin());
-- a change reaches the shop's screens
create trigger firm_sets_bump_ins after insert on public.firm_sets referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger firm_sets_bump_upd after update on public.firm_sets referencing old table as old_rows new table as new_rows for each statement execute function public.bump_firms_both();
create trigger firm_sets_bump_del after delete on public.firm_sets referencing old table as old_rows for each statement execute function public.bump_firms_old();
