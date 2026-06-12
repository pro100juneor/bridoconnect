-- 009_paypal.sql
-- PayPal Commerce Platform — alternative processor для регионов где Stripe слабее
-- или у пользователя есть только PayPal-баланс.

-- =============================================
-- profiles: PayPal payee state
-- =============================================
alter table public.profiles
  add column if not exists paypal_merchant_id text unique,
  add column if not exists paypal_status text
    not null default 'none'
    check (paypal_status in ('none','pending','active','restricted')),
  add column if not exists paypal_email text,
  add column if not exists paypal_updated_at timestamptz;

-- =============================================
-- deals: PayPal order lifecycle (parallel to Stripe fields)
-- =============================================
alter table public.deals
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists paypal_payout_id text;

create index if not exists deals_paypal_order_idx
  on public.deals (paypal_order_id);

-- =============================================
-- transactions: PayPal event ids (separate column for clarity over the
-- generic stripe_event_id; both stay under a single unique constraint via processor).
-- =============================================
alter table public.transactions
  add column if not exists paypal_event_id text,
  add column if not exists paypal_capture_id text;

-- Idempotency for PayPal: (processor='paypal', stripe_event_id=NULL, paypal_event_id=X).
-- Add a partial unique index that fires only for paypal rows.
create unique index if not exists transactions_paypal_event_unique
  on public.transactions (paypal_event_id)
  where processor = 'paypal' and paypal_event_id is not null;
