-- Favorites table (Wishlist)
create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_id)
);

alter table public.favorites enable row level security;
create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id);

-- Notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('deal_accepted','deal_completed','new_message','donation_received','review_received','system')),
  title text not null,
  body text not null default '',
  deal_id uuid references public.deals(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id);

-- Realtime for notifications
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.favorites;
