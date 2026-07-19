-- 027_sponsor_access.sql
-- Sponsor page — CLOSED by default, opened only by the owner's INDIVIDUAL consent
-- PER REQUEST. There is deliberately no "open for everyone" switch: a viewer sees
-- the sponsor's revealed fields only after the owner grants that specific request.
--
-- Non-sensitive only. Passport / bank data live elsewhere (Phase 5.3) and are NOT
-- touched here. sponsor_reveal is a free-form jsonb questionnaire (about, city,
-- occupation, languages, …) that the owner chooses to expose.

-- =============================================
-- 1) profiles: revealed (non-sensitive) sponsor questionnaire
-- =============================================
alter table public.profiles
  add column if not exists sponsor_reveal jsonb not null default '{}';

-- =============================================
-- 2) profile_access_grants — one row per (owner, requester, context) request.
--    Access is granted PER REQUEST — the unique key + per-row status make it
--    impossible to open the profile "forever for everyone" with one operation.
-- =============================================
create table if not exists public.profile_access_grants (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  context      text not null default 'general',   -- e.g. a deal id or free-form request context
  status       text not null default 'pending'
                 check (status in ('pending', 'granted', 'revoked', 'denied')),
  message      text,
  created_at   timestamptz default now(),
  decided_at   timestamptz,
  expires_at   timestamptz,
  unique (owner_id, requester_id, context)
);

create index if not exists profile_access_grants_owner_idx
  on public.profile_access_grants (owner_id, status, created_at desc);
create index if not exists profile_access_grants_requester_idx
  on public.profile_access_grants (requester_id, created_at desc);

alter table public.profile_access_grants enable row level security;

-- select: both parties see their own record (owner reviews incoming, requester tracks outgoing).
drop policy if exists "profile_access_grants_select" on public.profile_access_grants;
create policy "profile_access_grants_select" on public.profile_access_grants
  for select using (owner_id = auth.uid() or requester_id = auth.uid());

-- insert: the requester creates a pending request for themselves only.
drop policy if exists "profile_access_grants_requester_insert" on public.profile_access_grants;
create policy "profile_access_grants_requester_insert" on public.profile_access_grants
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

-- update: ONLY the owner decides grant / deny / revoke. The requester can never change it.
drop policy if exists "profile_access_grants_owner_update" on public.profile_access_grants;
create policy "profile_access_grants_owner_update" on public.profile_access_grants
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- =============================================
-- 3) has_profile_access — the per-request gate. true iff the viewer is the owner,
--    or a matching grant is active. security definer so the check runs regardless
--    of the caller's row visibility.
-- =============================================
create or replace function public.has_profile_access(p_owner uuid, p_viewer uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_viewer = p_owner
    or exists (
      select 1
      from public.profile_access_grants g
      where g.owner_id = p_owner
        and g.requester_id = p_viewer
        and g.status = 'granted'
        and (g.expires_at is null or g.expires_at > now())
    );
$$;

grant execute on function public.has_profile_access(uuid, uuid) to authenticated;
