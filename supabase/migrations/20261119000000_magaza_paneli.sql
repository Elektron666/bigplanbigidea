-- ORMEN Atelier: the shop panel (Showroom package, job 0, "Mağaza paneli").
--
-- A shop owner signs in with their own account (a row in firm_members, no
-- row in profiles) and works with the user's own session, so the row rules
-- decide what they see: their quotes and order requests, their screens,
-- their prices (all already readable by them, see 20261115000000_merkez.sql
-- and 20261118000100_teklif.sql).
--
-- Changing how a product shows in their shop goes through the two functions
-- below rather than a row rule on firm_models: a row rule cannot keep an
-- owner off the other columns (which product, its order in ORMEN's list).
-- Each function checks the shop is the caller's and writes the change log
-- itself, so neither the check nor the log can be skipped.
--
-- Nothing existing is changed or removed. Undo: supabase/geri-al/20261119000000_magaza_paneli.sql

create or replace function public.shop_save_product(
  p_firm_id uuid,
  p_model_id uuid,
  p_display_name text,
  p_product_code text,
  p_description text,
  p_featured boolean,
  p_hidden boolean
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_firm text;
  v_actor text;
begin
  if p_firm_id is null or p_firm_id not in (select public.my_firm_ids()) then
    raise exception 'not your shop' using errcode = '42501';
  end if;
  select jsonb_build_object('displayName', display_name, 'productCode', product_code, 'description', description, 'featured', featured, 'hidden', hidden)
    into v_before from firm_models where firm_id = p_firm_id and model_id = p_model_id;
  if v_before is null then
    return false;
  end if;
  update firm_models
     set display_name = p_display_name, product_code = p_product_code, description = p_description, featured = coalesce(p_featured, false), hidden = coalesce(p_hidden, false)
   where firm_id = p_firm_id and model_id = p_model_id;
  v_after := jsonb_build_object('displayName', p_display_name, 'productCode', p_product_code, 'description', p_description, 'featured', coalesce(p_featured, false), 'hidden', coalesce(p_hidden, false));
  if v_after is distinct from v_before then
    select name into v_firm from firms where id = p_firm_id;
    v_actor := coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), (auth.jwt() ->> 'email'), auth.uid()::text);
    insert into audit_log (actor, actor_role, firm_id, entity, entity_id, action, summary, before, after)
    values (left(v_actor, 120), 'sahip', p_firm_id, 'urun', p_model_id::text, 'gosterim-degisti',
            left(v_firm || ': ' || coalesce(p_display_name, (select name from models where id = p_model_id)) || ' mağazada değişti (mağaza)', 300), v_before, v_after);
  end if;
  return true;
end;
$$;

-- The shop's selling price of one of its products; null takes it away.
-- The log says that a price changed, never the price: ORMEN elemanı reads
-- the log and has no business with a shop's prices.
create or replace function public.shop_set_price(p_firm_id uuid, p_model_id uuid, p_price numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_firm text;
  v_actor text;
begin
  if p_firm_id is null or p_firm_id not in (select public.my_firm_ids()) then
    raise exception 'not your shop' using errcode = '42501';
  end if;
  if not exists (select 1 from firm_models where firm_id = p_firm_id and model_id = p_model_id) then
    return false;
  end if;
  if p_price is null then
    delete from firm_prices where firm_id = p_firm_id and model_id = p_model_id;
  else
    insert into firm_prices (firm_id, model_id, price) values (p_firm_id, p_model_id, p_price)
    on conflict (firm_id, model_id) do update set price = excluded.price;
  end if;
  select name into v_firm from firms where id = p_firm_id;
  v_actor := coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), (auth.jwt() ->> 'email'), auth.uid()::text);
  insert into audit_log (actor, actor_role, firm_id, entity, entity_id, action, summary)
  values (left(v_actor, 120), 'sahip', p_firm_id, 'urun', p_model_id::text, 'fiyat-degisti', left(v_firm || ': bir ürünün satış fiyatı değişti (mağaza)', 300));
  return true;
end;
$$;

revoke all on function public.shop_save_product(uuid, uuid, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.shop_set_price(uuid, uuid, numeric) from public, anon;
grant execute on function public.shop_save_product(uuid, uuid, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.shop_set_price(uuid, uuid, numeric) to authenticated;
