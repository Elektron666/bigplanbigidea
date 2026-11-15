-- ORMEN Atelier: the central catalogue as a list (Showroom package, job 0).
-- One page of products with how many shops each was given to, searched and
-- filtered in the database so the screen stays quick with 2 000 products.
-- Undo: supabase/geri-al/20261115000100_katalog.sql. Run after the earlier migrations.

create or replace function public.atelier_products(p_search text default null, p_owner text default null, p_category text default null, p_manufacturer text default null,
  p_shop uuid default null, p_unassigned boolean default false, p_limit integer default 50, p_offset integer default 0)
returns jsonb
language sql stable set search_path = public as $$
  with counts as (
    select model_id, count(*) as n from firm_models group by model_id
  ),
  base as (
    select m.id, m.name, m.slug, m.firm_id, f.name as owner_name, m.manufacturer, m.category, m.is_active,
           coalesce(c.n, 0) as shops, m.width_cm, m.depth_cm, m.height_cm
    from models m
    left join firms f on f.id = m.firm_id
    left join counts c on c.model_id = m.id
    where (p_search is null or m.name ilike '%' || p_search || '%' or m.slug ilike '%' || p_search || '%' or m.manufacturer ilike '%' || p_search || '%')
      and (p_owner is null or (p_owner = 'ortak') = (m.firm_id is null))
      and (p_category is null or m.category = p_category)
      and (p_manufacturer is null or m.manufacturer = p_manufacturer)
      and (p_shop is null or m.firm_id = p_shop or exists (select 1 from firm_models fm where fm.firm_id = p_shop and fm.model_id = m.id))
      and (not p_unassigned or (m.firm_id is null and coalesce(c.n, 0) = 0))
  ),
  page as (
    select * from base order by name, id limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by page.name, page.id) from page), '[]'::jsonb)
  );
$$;
revoke all on function public.atelier_products(text, text, text, text, uuid, boolean, integer, integer) from public, anon, authenticated;
