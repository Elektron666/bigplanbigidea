-- ORMEN Atelier: seller mode and prices by fabric group (Showroom package, job 7).
--
-- ORMEN puts each fabric in a price group (A, B, C…). A shop enters its sale
-- price per model (firm_prices, already there: the price for every group) and,
-- where it differs, per model and group (firm_group_prices). Prices are the
-- shop's: only its owner and ORMEN's yönetici read them; a showroom screen gets
-- them from the server only after the shop PIN (seller mode), or when the shop
-- chose to show prices to customers.
--
-- Only adds. Undo: supabase/geri-al/20261127000000_satici_modu.sql

alter table public.fabrics add column if not exists price_group text check (price_group ~ '^[A-Z0-9]{1,3}$');

create table public.firm_group_prices (
  firm_id uuid not null references public.firms (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  price_group text not null check (price_group ~ '^[A-Z0-9]{1,3}$'),
  price numeric not null check (price >= 0 and price <= 100000000),
  updated_at timestamptz not null default now(),
  primary key (firm_id, model_id, price_group)
);
alter table public.firm_group_prices enable row level security;
create trigger firm_group_prices_touch before update on public.firm_group_prices for each row execute function public.touch_updated_at();
create policy "admin or owner reads group prices" on public.firm_group_prices for select using (public.is_admin() or firm_id in (select public.my_firm_ids()));
create policy "admin writes group prices" on public.firm_group_prices for all using (public.is_admin()) with check (public.is_admin());
create trigger firm_group_prices_bump_ins after insert on public.firm_group_prices referencing new table as new_rows for each statement execute function public.bump_firms_new();
create trigger firm_group_prices_bump_upd after update on public.firm_group_prices referencing old table as old_rows new table as new_rows for each statement execute function public.bump_firms_both();
create trigger firm_group_prices_bump_del after delete on public.firm_group_prices referencing old table as old_rows for each statement execute function public.bump_firms_old();

-- the owner sets one group's price (null takes it off); checked and logged like shop_set_price, the price never in the log
create or replace function public.shop_set_group_price(p_firm_id uuid, p_model_id uuid, p_group text, p_price numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_firm text;
  v_actor text;
begin
  if p_firm_id is null or p_firm_id not in (select public.my_firm_ids()) then
    raise exception 'not your shop' using errcode = '42501';
  end if;
  if p_group is null or p_group !~ '^[A-Z0-9]{1,3}$' then
    raise exception 'bad group' using errcode = '22023';
  end if;
  if not exists (select 1 from firm_models where firm_id = p_firm_id and model_id = p_model_id) then
    return false;
  end if;
  if p_price is null then
    delete from firm_group_prices where firm_id = p_firm_id and model_id = p_model_id and price_group = p_group;
  else
    insert into firm_group_prices (firm_id, model_id, price_group, price) values (p_firm_id, p_model_id, p_group, p_price)
    on conflict (firm_id, model_id, price_group) do update set price = excluded.price;
  end if;
  select name into v_firm from firms where id = p_firm_id;
  v_actor := coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), (auth.jwt() ->> 'email'), auth.uid()::text);
  insert into audit_log (actor, actor_role, firm_id, entity, entity_id, action, summary)
  values (left(v_actor, 120), 'sahip', p_firm_id, 'urun', p_model_id::text, 'fiyat-degisti', left(v_firm || ': bir ürünün ' || p_group || ' grubu satış fiyatı değişti (mağaza)', 300));
  return true;
end;
$$;
revoke all on function public.shop_set_group_price(uuid, uuid, text, numeric) from public, anon;
grant execute on function public.shop_set_group_price(uuid, uuid, text, numeric) to authenticated;
