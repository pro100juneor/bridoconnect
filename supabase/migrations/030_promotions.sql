-- 030_promotions.sql
-- Paid promo feed ("промо-стрічка"): logged-in users can pay to be surfaced at
-- the top of the home feed. Sponsors see promoted recipients, recipients see
-- promoted sponsors (audience = the VIEWER's role = the OPPOSITE of the promoted
-- user's role). A carousel in the header rotates the promoted faces.
--
-- Ranking is driven by amount paid (priority = amount_cents). A paid placement
-- is guaranteed to stay in the top ("guaranteed") group for at least 3 minutes
-- after activation via min_visible_until — see active_promotions() ordering.
--
-- Clients never write this table: create-checkout (service_role) inserts the
-- pending row before payment, stripe-webhook (service_role) flips it to active.

-- =============================================
-- 1) promotions
-- =============================================
create table if not exists public.promotions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade, -- who is promoted
  audience          text not null check (audience in ('sponsor','recipient')),      -- who SEES it (= viewer role)
  photo_url         text,                       -- carousel photo (fallback: profile avatar)
  headline          text,
  body              text,
  amount_cents      int not null default 0,     -- amount paid (ranking driver)
  tier              int not null default 1 check (tier between 1 and 3),
  status            text not null check (status in ('pending','active','expired','cancelled')) default 'pending',
  priority          int not null default 0,     -- = amount_cents, for sorting
  stripe_session_id text,
  activated_at      timestamptz,
  starts_at         timestamptz,
  expires_at        timestamptz,
  min_visible_until timestamptz,                -- activation + 3 min: kept in top group until then (>=3 min guarantee)
  created_at        timestamptz not null default now()
);

create index if not exists promotions_audience_rank_idx
  on public.promotions (audience, status, priority desc);
create index if not exists promotions_user_idx
  on public.promotions (user_id);

alter table public.promotions enable row level security;

-- select: any logged-in user can read ACTIVE promos; an owner always sees their own
-- rows (any status) so they can track a pending/expired placement.
drop policy if exists "promotions_select" on public.promotions;
create policy "promotions_select" on public.promotions
  for select to authenticated
  using (status = 'active' or user_id = auth.uid());

-- No insert/update/delete policies for authenticated: only service_role (which
-- bypasses RLS) writes this table — pending row from create-checkout, activation
-- from stripe-webhook. This keeps the paid ranking tamper-proof from the client.

-- =============================================
-- 2) active_promotions(p_audience) — ordered feed for a viewer role
-- =============================================
-- Ordering: rows still inside their 3-minute guarantee window come first (so a
-- freshly-paid placement is not immediately displaced by a higher bidder), then
-- by amount paid (priority desc), then newest first.
create or replace function public.active_promotions(p_audience text)
returns setof public.promotions
language sql
security definer
set search_path = public
as $$
  select *
    from public.promotions
   where audience = p_audience
     and status = 'active'
     and (expires_at is null or expires_at > now())
   order by (min_visible_until is not null and min_visible_until > now()) desc,
            priority desc,
            created_at desc;
$$;

grant execute on function public.active_promotions(text) to authenticated;

-- =============================================
-- 3) transactions.type — add 'promotion' (platform revenue, no destination)
-- =============================================
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
  check (type in (
    'deposit','withdrawal','deal_payment','refund','escrow_release',
    'platform_fee','stream_donation','product_purchase','cart_purchase','promotion'
  ));
