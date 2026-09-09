-- 034: read-receipts для чатов — настоящий unread_count в списке чатов
-- (раньше был захардкожен 0). Одна строка на (user, deal): когда юзер
-- последний раз открывал чат.

create table if not exists public.chat_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);

alter table public.chat_reads enable row level security;

create policy "chat_reads_select" on public.chat_reads
  for select using (auth.uid() = user_id);
create policy "chat_reads_insert" on public.chat_reads
  for insert with check (auth.uid() = user_id);
create policy "chat_reads_update" on public.chat_reads
  for update using (auth.uid() = user_id);
