-- 035: закрытие утечки P2 (audit F, отложено в 014) — ID платёжных
-- аккаунтов (stripe/paypal/adyen/wise) были публично читаемы через
-- profiles_select using(true). Выносим их в отдельную таблицу, которую
-- может читать только владелец (и service_role в edge-функциях).

create table if not exists public.profile_payment_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_connect_account_id text,
  paypal_merchant_id text,
  adyen_account_holder_code text,
  wise_recipient_id text,
  updated_at timestamptz not null default now()
);

alter table public.profile_payment_accounts enable row level security;

-- Читать может только владелец; запись — только service_role (RLS обходит).
create policy "ppa_select_own" on public.profile_payment_accounts
  for select using (auth.uid() = profile_id);

-- Быстрый обратный поиск в вебхуках (account id → профиль).
create index if not exists ppa_stripe_idx
  on public.profile_payment_accounts (stripe_connect_account_id)
  where stripe_connect_account_id is not null;
create index if not exists ppa_paypal_idx
  on public.profile_payment_accounts (paypal_merchant_id)
  where paypal_merchant_id is not null;

-- Перенос существующих данных.
insert into public.profile_payment_accounts
  (profile_id, stripe_connect_account_id, paypal_merchant_id, adyen_account_holder_code, wise_recipient_id)
select id, stripe_connect_account_id, paypal_merchant_id, adyen_account_holder_code, wise_recipient_id
  from public.profiles
 where stripe_connect_account_id is not null
    or paypal_merchant_id is not null
    or adyen_account_holder_code is not null
    or wise_recipient_id is not null
on conflict (profile_id) do nothing;

-- Убираем колонки из публично читаемой profiles.
alter table public.profiles drop column if exists stripe_connect_account_id;
alter table public.profiles drop column if exists paypal_merchant_id;
alter table public.profiles drop column if exists adyen_account_holder_code;
alter table public.profiles drop column if exists wise_recipient_id;
