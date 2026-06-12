-- 016_round4.sql
-- Раунд 4: crypto + wise + profile_public view (Audit F фикс).

-- =============================================
-- 1) profiles_public view — БЕЗ processor account IDs
--    Закрывает Audit F (information disclosure). Читатели публичных профилей
--    должны использовать эту view вместо public.profiles.
-- =============================================
create or replace view public.profiles_public as
  select id, name, city, country, bio, avatar_url, role, verified,
         rating, rating_as_sponsor, rating_as_recipient,
         reviews_count_as_sponsor, reviews_count_as_recipient,
         deals_count, total_helped, created_at,
         stripe_connect_status, paypal_status, adyen_status, dlocal_status,
         stripe_connect_country
    from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- =============================================
-- 2) Crypto (BTCPay / Coinbase Commerce / USDT TRC20)
-- =============================================
alter table public.profiles
  add column if not exists crypto_addresses jsonb default '{}'::jsonb,
  add column if not exists crypto_enabled boolean not null default false;
-- crypto_addresses пример: {"usdt_trc20": "T...", "btc_ln": "lnurl..."}

alter table public.deals
  add column if not exists crypto_invoice_id text,
  add column if not exists crypto_currency text;

create index if not exists deals_crypto_invoice_idx
  on public.deals (crypto_invoice_id);

alter table public.transactions
  add column if not exists crypto_invoice_id text,
  add column if not exists crypto_tx_hash text;

create unique index if not exists transactions_crypto_invoice_unique
  on public.transactions (crypto_invoice_id)
  where processor = 'crypto' and crypto_invoice_id is not null;

-- =============================================
-- 3) Wise Platform — payouts для не-Stripe-Connect стран
-- =============================================
alter table public.profiles
  add column if not exists wise_recipient_id text;

alter table public.deals
  add column if not exists wise_transfer_id text;

-- =============================================
-- 4) apply_dlocal_payment — атомарный idempotent (mirror Stripe/PayPal)
-- =============================================
create or replace function public.apply_dlocal_payment(
  p_deal_id uuid,
  p_amount numeric,
  p_payment_id text,
  p_sponsor_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_existing text;
begin
  select dlocal_payment_id into v_existing
    from public.deals where id = p_deal_id for update;
  if v_existing = p_payment_id then return false; end if;
  update public.deals
     set raised = raised + p_amount,
         dlocal_payment_id = p_payment_id,
         sponsor_id = coalesce(sponsor_id, p_sponsor_id),
         status = 'active',
         payment_processor = 'dlocal',
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

-- =============================================
-- 5) apply_crypto_payment
-- =============================================
create or replace function public.apply_crypto_payment(
  p_deal_id uuid,
  p_amount numeric,
  p_invoice_id text,
  p_sponsor_id uuid,
  p_currency text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_existing text;
begin
  select crypto_invoice_id into v_existing
    from public.deals where id = p_deal_id for update;
  if v_existing = p_invoice_id then return false; end if;
  update public.deals
     set raised = raised + p_amount,
         crypto_invoice_id = p_invoice_id,
         crypto_currency = p_currency,
         sponsor_id = coalesce(sponsor_id, p_sponsor_id),
         status = 'active',
         payment_processor = 'crypto',
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;
