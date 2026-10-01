-- 052: CB-1 (часть) — release_escrow не должен выплачивать по сделке с возвратом.
-- Было: блокировались только status in (cancelled,disputed,refunded); частичный Stripe-refund
-- ставит status='active' и refunded_at — выплата проходила. Добавляем guard по refunded_at.
--
-- ВНИМАНИЕ (edge, требует интеграционного теста перед прод): это закрывает путь
-- «возврат → затем release». Полный CB-1 требует ещё декремента deals.raised в КАЖДОМ
-- refund-хендлере (stripe/paypal/adyen/dlocal) и гварда refunded_at в create-wise-payout
-- (последнее уже сделано, H-1). Декремент raised — отдельная правка edge-функций.

create or replace function public.release_escrow(
  p_deal_id uuid,
  p_transfer_id text default null,
  p_caller_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sponsor uuid;
  v_status text;
  v_released timestamptz;
  v_refunded timestamptz;
begin
  select sponsor_id, status, escrow_released_at, refunded_at
    into v_sponsor, v_status, v_released, v_refunded
    from public.deals where id = p_deal_id for update;

  if v_sponsor is null then raise exception 'no sponsor on deal'; end if;
  if p_caller_id is null then raise exception 'caller id required'; end if;
  if p_caller_id <> v_sponsor then
    raise exception 'only sponsor may release escrow';
  end if;
  if v_status in ('cancelled','disputed','refunded') then
    raise exception 'cannot release: deal status is %', v_status;
  end if;
  -- CB-1: по сделке был возврат (в т.ч. частичный, status='active') → выплата запрещена.
  if v_refunded is not null then
    raise exception 'cannot release: deal was refunded';
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
