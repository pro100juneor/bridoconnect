create table if not exists public.streams (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text,
  goal_amount numeric(10,2),
  raised numeric(10,2) not null default 0,
  room_name text not null unique,
  status text not null default 'live' check (status in ('live', 'ended')),
  viewer_count integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.streams enable row level security;
create policy "streams_select" on public.streams for select using (true);
create policy "streams_insert" on public.streams for insert with check (auth.uid() = host_id);
create policy "streams_update" on public.streams for update using (auth.uid() = host_id);

alter publication supabase_realtime add table public.streams;
