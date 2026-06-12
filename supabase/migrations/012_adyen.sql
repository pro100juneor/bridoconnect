-- 012_adyen.sql
-- Adyen MarketPay — APAC processor (Alipay/WeChat Pay/KakaoPay/GrabPay/LINE Pay).

alter table public.profiles
  add column if not exists adyen_account_holder_code text unique,
  add column if not exists adyen_status text
    not null default 'none'
    check (adyen_status in ('none','pending','active','restricted'));

alter table public.deals
  add column if not exists adyen_psp_reference text,
  add column if not exists adyen_merchant_account text;

create index if not exists deals_adyen_psp_idx
  on public.deals (adyen_psp_reference);

alter table public.transactions
  add column if not exists adyen_psp_reference text,
  add column if not exists adyen_event_code text;

create unique index if not exists transactions_adyen_psp_unique
  on public.transactions (adyen_psp_reference, adyen_event_code)
  where processor = 'adyen' and adyen_psp_reference is not null;
