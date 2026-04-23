-- 007_disputes_and_preferences.sql
-- Створює таблиці disputes і user_preferences

-- =============================================
-- DISPUTES — спори по угодах
-- =============================================
create table if not exists public.disputes (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  opener_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  admin_note text,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Коли відкривається спір — статус угоди стає disputed
create or replace function public.handle_dispute_opened()
returns trigger as $$
begin
  update public.deals set status = 'disputed', updated_at = now()
    where id = new.deal_id and status not in ('completed', 'cancelled');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dispute_opened on public.disputes;
create trigger on_dispute_opened
  after insert on public.disputes
  for each row execute procedure public.handle_dispute_opened();

-- updated_at автоматично
create trigger disputes_updated_at
  before update on public.disputes
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.disputes enable row level security;

-- Читати: opener або учасники угоди
create policy "disputes_select" on public.disputes for select using (
  auth.uid() = opener_id or
  auth.uid() in (select creator_id from public.deals where id = deal_id) or
  auth.uid() in (select sponsor_id from public.deals where id = deal_id)
);

-- Відкрити спір може тільки учасник угоди
create policy "disputes_insert" on public.disputes for insert with check (
  auth.uid() = opener_id and
  auth.uid() in (
    select creator_id from public.deals where id = deal_id
    union
    select sponsor_id from public.deals where id = deal_id
  )
);

-- Оновлювати може opener (поки відкрито) або адмін
create policy "disputes_update" on public.disputes for update using (
  (auth.uid() = opener_id and status = 'open') or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- USER PREFERENCES — налаштування (теми, сповіщення тощо)
-- =============================================
create table if not exists public.user_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  push_notifications boolean not null default true,
  email_notifications boolean not null default true,
  two_factor boolean not null default false,
  dark_mode boolean not null default false,
  language text not null default 'uk',
  updated_at timestamptz not null default now()
);

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.handle_updated_at();

alter table public.user_preferences enable row level security;

create policy "preferences_own" on public.user_preferences
  for all using (auth.uid() = user_id);

-- Автоматично створювати рядок preferences при реєстрації
create or replace function public.handle_new_user_preferences()
returns trigger as $$
begin
  insert into public.user_preferences (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_prefs on public.profiles;
create trigger on_profile_created_prefs
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_preferences();
