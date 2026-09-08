-- Email audit log (для транзакционных писем через Resend)
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  "to" text not null,
  template text not null,
  locale text not null default 'uk',
  provider_id text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_user_idx on public.email_log (user_id, created_at desc);
create index if not exists email_log_template_idx on public.email_log (template, created_at desc);

alter table public.email_log enable row level security;

drop policy if exists "email_log_own_read" on public.email_log;
create policy "email_log_own_read"
  on public.email_log
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "email_log_service_write" on public.email_log;
create policy "email_log_service_write"
  on public.email_log
  for all
  to service_role
  using (true) with check (true);

-- Web Push subscriptions (браузерные PushManager endpoint'ы)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  locale text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_own_all" on public.push_subscriptions;
create policy "push_subs_own_all"
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_subs_service_all" on public.push_subscriptions;
create policy "push_subs_service_all"
  on public.push_subscriptions
  for all
  to service_role
  using (true) with check (true);

-- Notification preferences: расширяем существующий JSON или создаём отдельную таблицу
-- (если preferences уже есть в profiles.preferences jsonb — оставляем).
comment on table public.push_subscriptions is
  'Web Push endpoint'', encrypted keys. Отправка через supabase/functions/send-push.';
comment on table public.email_log is
  'Audit log транзакционных писем через Resend. Используется для GDPR-запросов history.';
