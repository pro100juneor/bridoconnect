-- 022_shop_rules.sql
-- Shop rules v2:
--   1) One position = exactly one physical unit (stock ∈ {0,1}) + global 5000 cap.
--   2) order_items — multi-position orders (all from ONE seller / Connect account).
--   3) currency_rates + profiles.preferred_currency — per-region price conversion.
--      Base prices stay in EUR (products.price_cents / currency='eur'); we only
--      convert for display and at checkout time.

-- =============================================
-- 1) One position = one unit; stock ∈ {0,1}
-- =============================================
-- Drop the old `stock >= 0` check (or any other check mentioning stock).
do $$
declare
  v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
     where conrelid = 'public.products'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%stock%'
  loop
    execute format('alter table public.products drop constraint %I', v_conname);
  end loop;
end$$;

alter table public.products alter column stock set default 1;
-- Clamp any pre-existing rows to the new {0,1} domain before adding the check.
update public.products set stock = 1 where stock > 1;
alter table public.products
  add constraint products_stock_check check (stock in (0, 1));

-- Global shop capacity: at most 5000 active positions at any time.
create or replace function public.enforce_shop_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_positions constant int := 5000;
begin
  if (select count(*) from public.products where status = 'active') >= max_positions then
    raise exception 'shop capacity reached (5000 positions)';
  end if;
  return new;
end;
$$;

drop trigger if exists products_enforce_capacity on public.products;
create trigger products_enforce_capacity
  before insert on public.products
  for each row execute function public.enforce_shop_capacity();

-- =============================================
-- 2) order_items — one row per purchased position (cart checkout)
-- =============================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  price_cents int not null,
  created_at timestamptz default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

-- select: readable when the parent order belongs to the buyer or the seller.
drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- insert/update: service_role only (webhook writes). Clients never insert items.
revoke insert, update on public.order_items from anon, authenticated;

drop policy if exists "order_items_service_all" on public.order_items;
create policy "order_items_service_all" on public.order_items
  for all to service_role using (true) with check (true);

-- =============================================
-- 3) currency_rates — static FX table (see note: needs a live FX feed in prod)
-- =============================================
create table if not exists public.currency_rates (
  code text primary key,
  rate_per_eur numeric not null,
  symbol text not null,
  updated_at timestamptz default now()
);

insert into public.currency_rates (code, rate_per_eur, symbol) values
  ('eur', 1.0, '€'),
  ('usd', 1.08, '$'),
  ('uah', 45.0, '₴'),
  ('pln', 4.30, 'zł'),
  ('gbp', 0.85, '£'),
  ('czk', 25.0, 'Kč')
on conflict (code) do update
  set rate_per_eur = excluded.rate_per_eur,
      symbol = excluded.symbol,
      updated_at = now();

alter table public.currency_rates enable row level security;

-- select: public read (rates are not secret).
drop policy if exists "currency_rates_select" on public.currency_rates;
create policy "currency_rates_select" on public.currency_rates
  for select using (true);

-- write: service_role only.
revoke insert, update, delete on public.currency_rates from anon, authenticated;

drop policy if exists "currency_rates_service_all" on public.currency_rates;
create policy "currency_rates_service_all" on public.currency_rates
  for all to service_role using (true) with check (true);

-- Preferred display/checkout currency per user (base storage stays EUR).
alter table public.profiles
  add column if not exists preferred_currency text not null default 'eur';

-- =============================================
-- Widen transactions.type to include cart_purchase.
-- =============================================
do $$
declare
  v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
     where conrelid = 'public.transactions'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.transactions drop constraint %I', v_conname);
  end loop;
end$$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('deposit','withdrawal','deal_payment','refund','escrow_release','platform_fee','stream_donation','product_purchase','cart_purchase'));
