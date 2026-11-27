-- ORMEN Atelier: the video to the phone and the customer's own contact
-- (Showroom package, job 13).
--
-- Videos: a private bucket; the phone opens a video by its long random link
-- only (the server hands it out). At most 10 MB each.
--
-- Interested customers: a name and a phone a customer chose to leave, with
-- the consent box ticked (the server refuses anything else). They are the
-- shop's: only the shop's owner reads and deletes them. There is no rule at
-- all for ORMEN's staff or yönetici: no query of an ORMEN account reaches a
-- name or a phone (the panel shows counts, computed on the server). Each shop
-- sets how long they are kept; the daily job deletes the older ones. A shop
-- that has set no period collects none (the form is not shown).
--
-- Only adds. Undo: supabase/geri-al/20261127000400_video_musteri.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video', 'video', false, 10485760, array['video/mp4', 'video/webm', 'application/json'])
on conflict (id) do nothing;

alter table public.firms add column if not exists lead_retention_days integer check (lead_retention_days between 7 and 730);

create table public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[0-9]{10,13}$'),
  -- what they looked at: "Lara Üçlü · LUMA-02"
  product text check (char_length(product) <= 300),
  created_at timestamptz not null default now()
);
create index customer_leads_firm on public.customer_leads (firm_id, created_at desc);
alter table public.customer_leads enable row level security;
-- the shop's owner only; nobody else, ORMEN included
create policy "owner reads own leads" on public.customer_leads for select using (firm_id in (select public.my_firm_ids()));
create policy "owner deletes own leads" on public.customer_leads for delete using (firm_id in (select public.my_firm_ids()));

-- the owner sets the shop's keeping period (days); null stops collecting
create or replace function public.shop_set_lead_retention(p_firm_id uuid, p_days integer) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_firm_id is null or p_firm_id not in (select public.my_firm_ids()) then
    raise exception 'not your shop' using errcode = '42501';
  end if;
  update firms set lead_retention_days = p_days where id = p_firm_id;
  return found;
end;
$$;
revoke all on function public.shop_set_lead_retention(uuid, integer) from public, anon;
grant execute on function public.shop_set_lead_retention(uuid, integer) to authenticated;
