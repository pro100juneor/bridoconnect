-- 057_gift_orders.sql
-- Rebuild Phase 4: поток подарка. Спонсор покупает товар у мерчанта и отправляет
-- конкретному получателю (beneficiary). Адрес доставки получателя виден ТОЛЬКО
-- мерчанту-продавцу оплаченного заказа (через SECURITY DEFINER RPC); спонсор адрес
-- не видит. Плюс адреса доставки получателя и статусы исполнения заказа мерчантом.

-- =============================================
-- 1) shipping_addresses — адреса доставки (управляет владелец-получатель).
-- =============================================
create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  country text not null,
  city text not null,
  street text not null,
  postal_code text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists shipping_addresses_user_idx
  on public.shipping_addresses (user_id, created_at desc);

alter table public.shipping_addresses enable row level security;

-- Владелец управляет своими адресами. Мерчант НЕ читает таблицу напрямую — только
-- через order_shipping_for_merchant() по оплаченному заказу (ниже). Спонсор — никогда.
drop policy if exists "shipping_addresses_own_select" on public.shipping_addresses;
create policy "shipping_addresses_own_select" on public.shipping_addresses
  for select using (user_id = auth.uid());

drop policy if exists "shipping_addresses_own_insert" on public.shipping_addresses;
create policy "shipping_addresses_own_insert" on public.shipping_addresses
  for insert with check (user_id = auth.uid());

drop policy if exists "shipping_addresses_own_update" on public.shipping_addresses;
create policy "shipping_addresses_own_update" on public.shipping_addresses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "shipping_addresses_own_delete" on public.shipping_addresses;
create policy "shipping_addresses_own_delete" on public.shipping_addresses
  for delete using (user_id = auth.uid());

-- =============================================
-- 2) orders: подарок-заказ (бенефициар, адрес, статус исполнения, трек-номер).
-- =============================================
alter table public.orders
  add column if not exists beneficiary_id uuid references public.profiles(id) on delete set null;
alter table public.orders
  add column if not exists is_gift boolean not null default false;
alter table public.orders
  add column if not exists shipping_address_id uuid references public.shipping_addresses(id) on delete set null;
alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending';
alter table public.orders
  add column if not exists tracking text;

-- check на fulfillment_status (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.orders'::regclass and conname = 'orders_fulfillment_status_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_status_check
      check (fulfillment_status in ('pending','accepted','shipped','delivered','canceled'));
  end if;
end$$;

create index if not exists orders_beneficiary_idx
  on public.orders (beneficiary_id, created_at desc);

-- =============================================
-- 3) orders_select: бенефициар видит СВОИ подарки (без адреса — его отдаёт только
--    RPC мерчанту). Дополняем покупателя/продавца третьей стороной — бенефициаром.
-- =============================================
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (
    buyer_id = auth.uid() or seller_id = auth.uid() or beneficiary_id = auth.uid()
  );

-- =============================================
-- 4) RPC: адрес доставки отдаётся ТОЛЬКО мерчанту-продавцу оплаченного заказа.
--    Спонсор (buyer) и посторонние адрес получить не могут.
-- =============================================
create or replace function public.order_shipping_for_merchant(p_order_id uuid)
returns table (
  full_name text,
  phone text,
  country text,
  city text,
  street text,
  postal_code text,
  notes text
)
language sql stable security definer set search_path = public as $$
  select a.full_name, a.phone, a.country, a.city, a.street, a.postal_code, a.notes
  from public.orders o
  join public.shipping_addresses a on a.id = o.shipping_address_id
  where o.id = p_order_id
    and o.seller_id = auth.uid()
    and o.status in ('paid','shipped','completed');
$$;

revoke all on function public.order_shipping_for_merchant(uuid) from public;
grant execute on function public.order_shipping_for_merchant(uuid) to authenticated;

-- =============================================
-- 5) RPC: мерчант меняет статус исполнения/трек своего заказа. Клиент orders не
--    пишет напрямую (service_role-only), поэтому — через SECURITY DEFINER с гейтом
--    seller_id = auth.uid(). shipped/delivered зеркалятся в orders.status.
-- =============================================
create or replace function public.merchant_update_fulfillment(
  p_order_id uuid,
  p_status text,
  p_tracking text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('accepted','shipped','delivered','canceled') then
    raise exception 'invalid status';
  end if;

  update public.orders
    set fulfillment_status = p_status,
        tracking = coalesce(p_tracking, tracking),
        status = case
                   when p_status = 'shipped' then 'shipped'
                   when p_status = 'delivered' then 'completed'
                   else status
                 end,
        updated_at = now()
    where id = p_order_id and seller_id = auth.uid();

  if not found then
    raise exception 'order not found or not owned';
  end if;
end $$;

revoke all on function public.merchant_update_fulfillment(uuid, text, text) from public;
grant execute on function public.merchant_update_fulfillment(uuid, text, text) to authenticated;
