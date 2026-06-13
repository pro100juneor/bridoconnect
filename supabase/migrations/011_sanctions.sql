-- 011_sanctions.sql
-- Sanctions screening log — compliance audit trail. Каждая проверка по OFAC SDN /
-- EU consolidated / UN consolidated списках логируется здесь.

create table if not exists public.sanctions_screening_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  context text not null,  -- 'checkout', 'connect_onboard', 'manual'
  lists_checked text[] not null default '{}',
  matched_entries jsonb not null default '[]',
  risk_score int default 0,
  result text not null check (result in ('clear','review','blocked')),
  checked_at timestamptz not null default now()
);

create index if not exists sanctions_user_idx
  on public.sanctions_screening_log (user_id, checked_at desc);

alter table public.sanctions_screening_log enable row level security;
-- Только service-role читает/пишет; auth.users не должны видеть свои сканы.
revoke all on public.sanctions_screening_log from anon, authenticated;
