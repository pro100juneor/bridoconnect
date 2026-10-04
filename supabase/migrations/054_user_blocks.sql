-- User blocking (UGC safety, App Store Guideline 1.2). A user can block another
-- user; once blocked, neither side can send direct messages to the other, and a
-- new DM thread can't be opened between them. Deal chats are intentionally NOT
-- blocked — the two parties are bound by an active contract and must be able to
-- communicate (report stays available there).

create table if not exists public.user_blocks (
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- A user sees and manages only their own block list.
create policy "user_blocks_own" on public.user_blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Symmetric check: is there a block in EITHER direction between two users?
-- SECURITY DEFINER so RLS policies can consult the whole table regardless of
-- which side the caller is on (mirrors the project's other definer helpers).
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Enforce the block on DM send: no insert if either party blocked the other.
drop policy if exists "direct_messages_send" on public.direct_messages;
create policy "direct_messages_send" on public.direct_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.direct_threads t
      where t.id = thread_id
        and (auth.uid() = t.user_a or auth.uid() = t.user_b)
        and not public.is_blocked_between(t.user_a, t.user_b)
    )
  );

-- Enforce the block when opening/resolving a DM thread: a blocked pair can't
-- start (or re-enter) a conversation. Recreated from 043 with the guard added.
create or replace function public.get_or_create_dm_thread(target uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  b uuid;
  tid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if target is null or target = auth.uid() then raise exception 'invalid target'; end if;
  if public.is_blocked_between(auth.uid(), target) then raise exception 'blocked'; end if;
  if auth.uid() < target then a := auth.uid(); b := target; else a := target; b := auth.uid(); end if;
  insert into public.direct_threads (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do nothing;
  select id into tid from public.direct_threads where user_a = a and user_b = b;
  return tid;
end $$;

revoke all on function public.get_or_create_dm_thread(uuid) from public;
grant execute on function public.get_or_create_dm_thread(uuid) to authenticated;
