-- 008_stripe_connect.sql
-- Stripe Connect Express (destination-charge marketplace flow)
-- Sponsor → BridoConnect (platform) → Recipient's Connect account
-- Platform keeps `application_fee_amount`; rest is held until escrow release.

-- =============================================
-- profiles: Connect account state per recipient
-- =============================================
alter table public.profiles
  add column if not exists stripe_connect_account_id text unique,
  add column if not exists stripe_connect_status text
    not null default 'none'
    check (stripe_connect_status in ('none','pending','enabled','restricted','rejected')),
  add column if not exists stripe_connect_country text,
  add column if not exists stripe_connect_updated_at timestamptz;

-- =============================================
-- deals: payment + escrow lifecycle
-- =============================================
alter table public.deals
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_transfer_id text,
  add column if not exists platform_fee_cents int,
  add column if not exists amount_cents int,
  add column if not exists escrow_released_at timestamptz,
  add column if not exists refunded_at timestamptz;

create index if not exists deals_stripe_payment_intent_idx
  on public.deals (stripe_payment_intent_id);

-- =============================================
-- transactions: idempotent event log
-- =============================================
alter table public.transactions
  add column if not exists processor text not null default 'stripe',
  add column if not exists stripe_event_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists fee_platform_cents int default 0,
  add column if not exists amount_cents int;

-- Strict idempotency: a given (processor, event_id) is recorded once.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_processor_event_unique'
  ) then
    alter table public.transactions
      add constraint transactions_processor_event_unique
      unique (processor, stripe_event_id);
  end if;
end$$;

-- Widen type enum to include escrow_release + platform_fee.
-- Drop any existing type check (name varies) then add a stable one.
do $$
declare
  v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
     where conrelid = 'public.transactions'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.transactions drop constraint %I', v_conname);
  end loop;
end$$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('deposit','withdrawal','deal_payment','refund','escrow_release','platform_fee'));

-- =============================================
-- RPC: increment_raised — used by webhook
-- Idempotent at the SQL level (caller still gates via event_id).
-- =============================================
create or replace function public.increment_raised(deal_id uuid, amount numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.deals
     set raised = raised + amount,
         updated_at = now()
   where id = deal_id;
end;
$$;

-- =============================================
-- RPC: release_escrow — sponsor confirms delivery
-- Server-side check: only sponsor of the deal can release; deal must be funded.
-- =============================================
create or replace function public.release_escrow(p_deal_id uuid, p_transfer_id text)
returns void
language plpgsql
security definer
as $$
declare
  v_caller uuid := auth.uid();
  v_sponsor uuid;
  v_status text;
  v_released timestamptz;
begin
  select sponsor_id, status, escrow_released_at
    into v_sponsor, v_status, v_released
    from public.deals where id = p_deal_id for update;

  if v_sponsor is null then raise exception 'no sponsor on deal'; end if;
  if v_caller is not null and v_caller <> v_sponsor then
    raise exception 'only sponsor may release escrow';
  end if;
  if v_released is not null then return; end if;  -- idempotent

  update public.deals
     set status = 'completed',
         escrow_released_at = now(),
         stripe_transfer_id = coalesce(p_transfer_id, stripe_transfer_id),
         updated_at = now()
   where id = p_deal_id;
end;
$$;

-- =============================================
-- RLS: transactions insert by service role only (webhook writes)
-- (Service role bypasses RLS; this just prevents client INSERTs.)
-- =============================================
revoke insert on public.transactions from anon, authenticated;
