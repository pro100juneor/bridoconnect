-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default 'Користувач',
  city text,
  country text,
  bio text,
  avatar_url text,
  role text not null default 'sponsor' check (role in ('sponsor', 'recipient', 'admin')),
  verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  deals_count integer not null default 0,
  total_helped numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Deals table
create table if not exists public.deals (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  sponsor_id uuid references public.profiles(id),
  title text not null,
  description text not null default '',
  category text not null default 'Інше',
  amount numeric(10,2) not null default 0,
  raised numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','active','completed','cancelled','disputed')),
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- Transactions table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deal_id uuid references public.deals(id),
  amount numeric(10,2) not null,
  type text not null check (type in ('deposit','withdrawal','deal_payment','refund')),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.messages enable row level security;
alter table public.transactions enable row level security;

-- Profiles: all can read, only own user can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Deals: all can read, authenticated can insert
create policy "deals_select" on public.deals for select using (true);
create policy "deals_insert" on public.deals for insert with check (auth.uid() = creator_id);
create policy "deals_update" on public.deals for update using (auth.uid() = creator_id or auth.uid() = sponsor_id);

-- Messages: only deal participants
create policy "messages_select" on public.messages for select using (
  auth.uid() = sender_id or
  auth.uid() in (select creator_id from public.deals where id = deal_id) or
  auth.uid() in (select sponsor_id from public.deals where id = deal_id)
);
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);

-- Transactions: only own
create policy "transactions_select" on public.transactions for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Користувач'),
    coalesce(new.raw_user_meta_data->>'role', 'sponsor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
