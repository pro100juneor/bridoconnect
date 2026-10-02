-- 053: money-accounting (SQL-часть). Edge-обвязка — отдельным коммитом (верификация = D-003).
-- CB-1: идемпотентный декремент raised при возврате. H-4: dLocal кредитует в EUR.

-- CB-1: уменьшить raised и пометить refunded при возврате (идемпотентно по refunded_at).
-- Вызывается из refund-хендлеров (service_role) вместо «только refunded_at».
create or replace function public.refund_deal_raised(
  p_deal_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refunded timestamptz;
begin
  select refunded_at into v_refunded from public.deals where id = p_deal_id for update;
  if v_refunded is not null then
    return false;  -- уже возвращено — noop (идемпотентно)
  end if;
  -- status не трогаем (deals_status_check не содержит 'refunded'); сигнал возврата —
  -- refunded_at (его уже проверяет release_escrow, миграция 052).
  update public.deals
     set raised = greatest(raised - coalesce(p_amount, 0), 0),
         refunded_at = now(),
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

revoke all on function public.refund_deal_raised(uuid, numeric) from public, anon, authenticated;

-- H-4: dLocal — конвертировать локальную сумму в EUR перед raised += (раньше кредитовалось как EUR).
-- Новая сигнатура с p_currency (5 арг). Старую 4-арг удаляем.
drop function if exists public.apply_dlocal_payment(uuid, numeric, text, uuid);

create or replace function public.apply_dlocal_payment(
  p_deal_id uuid,
  p_amount numeric,
  p_payment_id text,
  p_sponsor_id uuid,
  p_currency text default 'EUR'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_rate numeric;
  v_eur numeric;
begin
  select dlocal_payment_id into v_existing from public.deals where id = p_deal_id for update;
  if v_existing = p_payment_id then return false; end if;

  if lower(coalesce(p_currency, 'EUR')) = 'eur' then
    v_eur := p_amount;
  else
    select rate_per_eur into v_rate from public.currency_rates where code = lower(p_currency);
    if v_rate is null or v_rate <= 0 then
      raise exception 'no fx rate for currency %', p_currency;
    end if;
    v_eur := round(p_amount / v_rate, 2);  -- local / (local per EUR) = EUR
  end if;

  update public.deals
     set raised = raised + v_eur,
         dlocal_payment_id = p_payment_id,
         sponsor_id = coalesce(sponsor_id, p_sponsor_id),
         status = 'active',
         payment_processor = 'dlocal',
         updated_at = now()
   where id = p_deal_id;
  return true;
end;
$$;

revoke all on function public.apply_dlocal_payment(uuid, numeric, text, uuid, text) from public, anon, authenticated;
