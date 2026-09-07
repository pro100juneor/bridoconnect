-- 031: права администратора (role='admin' в profiles)
-- Админ может: менять профили (verified/role), скрывать товары,
-- останавливать эфиры, видеть все заказы и сделки (для статистики/споров).

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: админ может обновлять любой профиль (дополнительно к политике "свой профиль")
drop policy if exists "admin_update_profiles" on profiles;
create policy "admin_update_profiles" on profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- products: админ может обновлять любой товар (модерация: скрыть/вернуть)
drop policy if exists "admin_update_products" on products;
create policy "admin_update_products" on products
  for update using (public.is_admin()) with check (public.is_admin());

-- streams: админ может завершить любой эфир
drop policy if exists "admin_update_streams" on streams;
create policy "admin_update_streams" on streams
  for update using (public.is_admin()) with check (public.is_admin());

-- orders: админ видит все заказы (статистика, возвраты)
drop policy if exists "admin_read_orders" on orders;
create policy "admin_read_orders" on orders
  for select using (public.is_admin());

-- deals: админ видит все сделки
drop policy if exists "admin_read_deals" on deals;
create policy "admin_read_deals" on deals
  for select using (public.is_admin());

-- promotions: админ видит и может отключать промо
drop policy if exists "admin_all_promotions" on promotions;
create policy "admin_all_promotions" on promotions
  for all using (public.is_admin()) with check (public.is_admin());
