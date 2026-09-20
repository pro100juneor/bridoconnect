-- Product favorites (shop wishlist). Mirrors public.favorites, but targets shop
-- products instead of people, so a liked product persists and can be listed.
create table if not exists public.product_favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.product_favorites enable row level security;
create policy "product_favorites_own" on public.product_favorites for all using (auth.uid() = user_id);

create index if not exists product_favorites_user_idx on public.product_favorites (user_id);
create index if not exists product_favorites_product_idx on public.product_favorites (product_id);

alter publication supabase_realtime add table public.product_favorites;
