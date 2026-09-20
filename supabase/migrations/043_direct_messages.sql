-- Direct person-to-person messaging, NOT tied to a deal.
-- Kept fully separate from public.messages (deal chats) so the money/escrow
-- chat path is untouched. A thread is a canonical sorted pair (user_a < user_b),
-- so any two people map to exactly one thread.

create table if not exists public.direct_threads (
  id uuid default uuid_generate_v4() primary key,
  user_a uuid references public.profiles(id) on delete cascade not null,
  user_b uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_threads_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.direct_messages (
  id uuid default uuid_generate_v4() primary key,
  thread_id uuid references public.direct_threads(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- Per-user read marker for DM threads (mirrors chat_reads for deal chats).
create table if not exists public.direct_reads (
  user_id uuid references public.profiles(id) on delete cascade not null,
  thread_id uuid references public.direct_threads(id) on delete cascade not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index if not exists direct_threads_user_a_idx on public.direct_threads (user_a);
create index if not exists direct_threads_user_b_idx on public.direct_threads (user_b);
create index if not exists direct_messages_thread_idx on public.direct_messages (thread_id, created_at);

alter table public.direct_threads enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_reads enable row level security;

create policy "direct_reads_own" on public.direct_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "direct_threads_participant" on public.direct_threads
  for all using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "direct_messages_read" on public.direct_messages
  for select using (
    exists (
      select 1 from public.direct_threads t
      where t.id = thread_id and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

create policy "direct_messages_send" on public.direct_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.direct_threads t
      where t.id = thread_id and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

-- Bump thread.updated_at on each new message so ChatList can sort recent-first.
create or replace function public.bump_direct_thread_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.direct_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;

create trigger direct_messages_bump_thread
  after insert on public.direct_messages
  for each row execute function public.bump_direct_thread_updated_at();

-- Race-safe find-or-create for the thread between the caller and `target`.
-- Only ever creates a thread the caller is part of (auth.uid() is always in the pair).
create or replace function public.get_or_create_dm_thread(target uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  b uuid;
  tid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if target is null or target = auth.uid() then raise exception 'invalid target'; end if;
  if auth.uid() < target then a := auth.uid(); b := target; else a := target; b := auth.uid(); end if;
  insert into public.direct_threads (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do nothing;
  select id into tid from public.direct_threads where user_a = a and user_b = b;
  return tid;
end $$;

revoke all on function public.get_or_create_dm_thread(uuid) from public;
grant execute on function public.get_or_create_dm_thread(uuid) to authenticated;

alter publication supabase_realtime add table public.direct_messages;
