-- 020_shop.sql
-- Humanitarian shop: real products + orders with Stripe Connect destination-charge.
-- Buyer → BridoConnect (platform) → Seller's Connect account.
-- Platform keeps `application_fee_amount` (5%); the rest transfers to the seller.
--
-- STORAGE: this migration does NOT create the storage bucket (that is done via the
-- Storage API / dashboard). A public-read bucket named 'product-images' is required
-- for product photo uploads (see src/hooks/useProducts.ts createProduct).

-- =============================================
-- products
-- =============================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price_cents int not null check (price_cents > 0),
  currency text not null default 'eur',
  category text,
  images text[] not null default '{}',
  stock int not null default 1 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'hidden', 'sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_created_idx
  on public.products (status, created_at desc);
create index if not exists products_seller_idx
  on public.products (seller_id);

alter table public.products enable row level security;

-- select: publicly visible only when active; owners can see all of theirs.
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (status = 'active' or seller_id = auth.uid());

-- insert/update/delete: only own products.
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (seller_id = auth.uid());

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (seller_id = auth.uid());

drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (seller_id = auth.uid());

-- =============================================
-- orders (written by webhook / service_role only)
-- =============================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id),
  seller_id uuid not null references public.profiles(id),
  amount_cents int not null,
  platform_fee_cents int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'completed', 'refunded', 'cancelled')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orders_buyer_created_idx
  on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_created_idx
  on public.orders (seller_id, created_at desc);

alter table public.orders enable row level security;

-- select: buyer or seller may read their orders.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (buyer_id = auth.uid() or seller_id = auth.uid());

-- insert/update: service_role only (webhook writes). Clients never insert orders.
revoke insert, update on public.orders from anon, authenticated;

drop policy if exists "orders_service_all" on public.orders;
create policy "orders_service_all" on public.orders
  for all to service_role using (true) with check (true);

-- =============================================
-- RPC: decrement_stock — called by stripe-webhook after payment.
-- Atomically lowers stock; marks the product 'sold' when it hits 0.
-- =============================================
create or replace function public.decrement_stock(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set stock = greatest(stock - 1, 0),
         status = case when stock - 1 <= 0 then 'sold' else status end,
         updated_at = now()
   where id = p_product_id;
end;
$$;

grant execute on function public.decrement_stock(uuid) to service_role;

-- =============================================
-- Widen transactions.type to include product_purchase.
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
  check (type in ('deposit','withdrawal','deal_payment','refund','escrow_release','platform_fee','stream_donation','product_purchase'));
