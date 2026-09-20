-- User reports (UGC moderation, App Store Guideline 1.2). A user can report
-- another user from a chat or profile; admins review via public.is_admin().
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reported_user_id uuid references public.profiles(id) on delete cascade not null,
  context text, -- e.g. 'chat:deal:<id>', 'chat:dm:<threadId>', 'profile'
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_user_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);
create policy "reports_admin_all" on public.reports
  for all using (public.is_admin()) with check (public.is_admin());
