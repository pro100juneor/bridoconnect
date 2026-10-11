-- Rebuild Phase 1: роль 'merchant' (продавец маркетплейса), заявки на мерчанта
-- с одобрением админом, и ролевой гейт на владение магазином (товары/витрины).
-- Модель: магазины ведут ТОЛЬКО мерчанты; спонсор/получатель магазина не имеют.

-- 1) Расширяем enum ролей.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('sponsor', 'recipient', 'merchant', 'admin'));

-- 2) Хелпер: текущий пользователь — мерчант? (SECURITY DEFINER, как is_admin/is_onboarded)
create or replace function public.is_merchant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'merchant');
$$;
revoke all on function public.is_merchant() from public;
grant execute on function public.is_merchant() to authenticated;

-- 3) Ролевой гейт на владение магазином: создавать/менять товары и витрины
--    может только мерчант (и только свои). Раньше гейта по роли не было.
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (seller_id = auth.uid() and public.is_merchant());

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (seller_id = auth.uid() and public.is_merchant());

drop policy if exists "shop_profiles_owner_insert" on public.shop_profiles;
create policy "shop_profiles_owner_insert" on public.shop_profiles
  for insert to authenticated with check (seller_id = auth.uid() and public.is_merchant());

drop policy if exists "shop_profiles_owner_update" on public.shop_profiles;
create policy "shop_profiles_owner_update" on public.shop_profiles
  for update to authenticated
  using (seller_id = auth.uid() and public.is_merchant())
  with check (seller_id = auth.uid() and public.is_merchant());

-- 4) Заявки на роль мерчанта.
create table if not exists public.merchant_applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_name text not null,
  contact text,
  details text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Один активный (pending) запрос на пользователя.
create unique index if not exists merchant_applications_one_pending
  on public.merchant_applications (user_id) where status = 'pending';
create index if not exists merchant_applications_status_idx
  on public.merchant_applications (status, created_at);

alter table public.merchant_applications enable row level security;

-- Заявитель видит и создаёт только свои заявки.
create policy "merchant_apps_own_select" on public.merchant_applications
  for select using (auth.uid() = user_id or public.is_admin());
create policy "merchant_apps_own_insert" on public.merchant_applications
  for insert with check (auth.uid() = user_id and status = 'pending');
-- Решение по заявке — только админ (через RPC ниже); прямой update закрыт всем,
-- кроме админа (на случай ручного вмешательства).
create policy "merchant_apps_admin_update" on public.merchant_applications
  for update using (public.is_admin()) with check (public.is_admin());

-- 5) RPC одобрения/отклонения заявки (только админ). При approve — ставим роль.
create or replace function public.decide_merchant_application(
  p_app_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select user_id into v_user from public.merchant_applications where id = p_app_id and status = 'pending';
  if v_user is null then raise exception 'application not found or already decided'; end if;

  update public.merchant_applications
    set status = case when p_approve then 'approved' else 'rejected' end,
        reason = p_reason,
        decided_by = auth.uid(),
        decided_at = now()
    where id = p_app_id;

  if p_approve then
    update public.profiles set role = 'merchant' where id = v_user;
  end if;
end $$;

revoke all on function public.decide_merchant_application(uuid, boolean, text) from public;
grant execute on function public.decide_merchant_application(uuid, boolean, text) to authenticated;
