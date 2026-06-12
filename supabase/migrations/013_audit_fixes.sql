-- 013_audit_fixes.sql
-- Закрывает находки code-review:
--   P0-1: release_escrow polagaлась на auth.uid() из service-role контекста (NULL → bypass).
--   P1-12: increment_raised не идемпотентен.
--   P1-14: reviews нет UNIQUE(deal_id, reviewer_id) — пара может ревилеться от двух
--          собственных отзывов одного пользователя.
--   P0-7 (часть): добавить deals.payment_processor чтобы release-escrow знал на какой
--                 процессор отправлять transfer.

-- =============================================
-- 1) release_escrow: принимать caller явно, не полагаться на auth.uid()
-- =============================================
create or replace function public.release_escrow(
  p_deal_id uuid,
  p_transfer_id text default null,
  p_caller_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_sponsor uuid;
  v_status text;
  v_released timestamptz;
begin
  select sponsor_id, status, escrow_released_at
    into v_sponsor, v_status, v_released
    from public.deals where id = p_deal_id for update;

  if v_sponsor is null then raise exception 'no sponsor on deal'; end if;
  if p_caller_id is null then raise exception 'caller id required'; end if;
  if p_caller_id <> v_sponsor then
    raise exception 'only sponsor may release escrow';
  end if;
  if v_status in ('cancelled','disputed','refunded') then
    raise exception 'cannot release: deal status is %', v_status;
  end if;
  if v_released is not null then return; end if;

  update public.deals
     set status = 'completed',
         escrow_released_at = now(),
         stripe_transfer_id = coalesce(p_transfer_id, stripe_transfer_id),
         updated_at = now()
   where id = p_deal_id;
end;
$$;

-- =============================================
-- 2) increment_raised: идемпотентность через ledger lookup
--    Принимает p_event_id (processor event); если транзакция уже есть → noop.
-- =============================================
create or replace function public.increment_raised_idempotent(
  p_deal_id uuid,
  p_amount numeric,
  p_processor text,
  p_event_id text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_exists boolean;
begin
  -- Защита от двойного учёта: проверка по обоим идентификаторам процессоров
  select exists(
    select 1 from public.transactions
     where processor = p_processor
       and (
         (p_processor = 'stripe' and stripe_event_id = p_event_id)
         or (p_processor = 'paypal' and paypal_event_id = p_event_id)
         or (p_processor = 'adyen' and adyen_psp_reference = p_event_id)
       )
       and type = 'deal_payment'
       and deal_id = p_deal_id
  ) into v_exists;

  -- НЕ инкрементируем здесь — это делает caller после успешной записи tx.
  -- Эта функция теперь — только indicator для caller'а "можно ли инкрементить".
  if v_exists then return false; end if;

  update public.deals
     set raised = raised + p_amount,
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

-- Старая increment_raised оставлена для обратной совместимости (вызывается из
-- legacy webhook code на main), но новые webhook'и должны звать _idempotent.

-- =============================================
-- 2b) apply_stripe_payment — атомарный update deal'а под row lock.
--     Использует deal.stripe_payment_intent_id как маркер "уже применено"
--     → закрывает gap'ы P0-4 (idempotency hole в webhook).
-- =============================================
create or replace function public.apply_stripe_payment(
  p_deal_id uuid,
  p_amount numeric,
  p_payment_intent_id text,
  p_sponsor_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_existing text;
begin
  select stripe_payment_intent_id into v_existing
    from public.deals where id = p_deal_id for update;
  if v_existing = p_payment_intent_id then
    return false;  -- already applied — safe to noop
  end if;
  update public.deals
     set raised = raised + p_amount,
         stripe_payment_intent_id = p_payment_intent_id,
         sponsor_id = coalesce(sponsor_id, p_sponsor_id),
         status = 'active',
         payment_processor = 'stripe',
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

-- Same pattern for PayPal (paypal_capture_id is unique per payment)
create or replace function public.apply_paypal_payment(
  p_deal_id uuid,
  p_amount numeric,
  p_capture_id text,
  p_sponsor_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_existing text;
begin
  select paypal_capture_id into v_existing
    from public.deals where id = p_deal_id for update;
  if v_existing = p_capture_id then
    return false;
  end if;
  update public.deals
     set raised = raised + p_amount,
         paypal_capture_id = p_capture_id,
         sponsor_id = coalesce(sponsor_id, p_sponsor_id),
         status = 'active',
         payment_processor = 'paypal',
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

-- =============================================
-- 3) reviews: уникальность (deal_id, reviewer_id)
--    Чтобы пользователь не мог открыть reveal двойным отзывом.
-- =============================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'reviews_deal_reviewer_unique'
       and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_deal_reviewer_unique unique (deal_id, reviewer_id);
  end if;
end$$;

-- handle_review_pairing: считаем только пары с разными role
create or replace function public.handle_review_pairing()
returns trigger as $$
declare
  v_distinct_roles int;
begin
  select count(distinct role) into v_distinct_roles
    from public.reviews
   where deal_id = new.deal_id and role is not null;
  if v_distinct_roles >= 2 then
    update public.reviews
       set revealed = true,
           revealed_at = now()
     where deal_id = new.deal_id and not revealed;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- =============================================
-- 4) deals.payment_processor — единая точка истины для роутинга refund/release
-- =============================================
alter table public.deals
  add column if not exists payment_processor text
    check (payment_processor in ('stripe','paypal','adyen','crypto'));

-- backfill для уже оплаченных по PI (Stripe)
update public.deals
   set payment_processor = 'stripe'
 where payment_processor is null and stripe_payment_intent_id is not null;
update public.deals
   set payment_processor = 'paypal'
 where payment_processor is null and paypal_capture_id is not null;
update public.deals
   set payment_processor = 'adyen'
 where payment_processor is null and adyen_psp_reference is not null;

-- =============================================
-- 5) Country name → ISO2 lookup view (для sanctions-screen)
-- =============================================
create or replace function public.country_to_iso2(p_name text)
returns text
language sql
immutable
as $$
  select case lower(trim(p_name))
    when 'russia' then 'RU'
    when 'россия' then 'RU'
    when 'russian federation' then 'RU'
    when 'belarus' then 'BY'
    when 'беларусь' then 'BY'
    when 'iran' then 'IR'
    when 'іран' then 'IR'
    when 'north korea' then 'KP'
    when 'syria' then 'SY'
    when 'сирія' then 'SY'
    when 'cuba' then 'CU'
    when 'ukraine' then 'UA'
    when 'україна' then 'UA'
    when 'germany' then 'DE'
    when 'deutschland' then 'DE'
    when 'німеччина' then 'DE'
    else case when p_name ~ '^[A-Z]{2}$' then p_name else null end
  end;
$$;
