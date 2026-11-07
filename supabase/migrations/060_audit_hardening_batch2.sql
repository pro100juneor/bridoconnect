-- 060: аудит-хардеринг (batch 2) — находки полного аудита проекта.
-- Применяется на staging; на прод — только по D-001.

-- 1) merchant_update_fulfillment: предусловие по текущему статусу заказа.
--    Было: продавец мог перевести ЛЮБОЙ свой заказ сразу в 'completed'
--    (минуя paid→shipped→completed) и даже раскрыть адрес неоплаченного
--    заказа через order_shipping_for_merchant (её гейт пускает paid/shipped/
--    completed). Теперь:
--      * accepted/shipped — только из оплаченного заказа (status='paid');
--      * delivered — только из уже отправленного (status='shipped');
--      * delivered→'completed' зеркалим ТОЛЬКО для подарков (is_gift): в
--        обычном shop-заказе получатель=покупатель и финальное подтверждение
--        идёт через advance_order_status (039), не самоподтверждением продавца;
--      * canceled — только из оплаченного/не отгруженного (возврат денег —
--        отдельный поток refund_order/эдж, здесь не выполняется).
create or replace function public.merchant_update_fulfillment(
  p_order_id uuid,
  p_status text,
  p_tracking text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  cur_status text;
  cur_is_gift boolean;
begin
  if p_status not in ('accepted','shipped','delivered','canceled') then
    raise exception 'invalid status';
  end if;

  select status, is_gift into cur_status, cur_is_gift
    from public.orders
    where id = p_order_id and seller_id = auth.uid()
    for update;

  if not found then
    raise exception 'order not found or not owned';
  end if;

  if p_status in ('accepted','shipped') and cur_status <> 'paid' then
    raise exception 'order is not in a payable/fulfillable state';
  end if;
  if p_status = 'delivered' and cur_status <> 'shipped' then
    raise exception 'order must be shipped before it can be delivered';
  end if;
  if p_status = 'canceled' and cur_status <> 'paid' then
    raise exception 'order cannot be canceled in its current state';
  end if;

  update public.orders
    set fulfillment_status = p_status,
        tracking = coalesce(p_tracking, tracking),
        status = case
                   when p_status = 'shipped' then 'shipped'
                   when p_status = 'delivered' and cur_is_gift then 'completed'
                   else status
                 end,
        updated_at = now()
    where id = p_order_id and seller_id = auth.uid();
end $$;

-- 2) reports: нельзя создать свой репорт сразу в статусе 'reviewed'/'dismissed'
--    (самосаботаж модерации). Форсируем 'open' на вставке.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id and status = 'open');

-- 3) Триггер-функции защиты колонок — не SECURITY DEFINER, поэтому сквозная
--    подчистка search_path в 049 (фильтр prosecdef) их не затронула. Фиксируем
--    search_path для defense-in-depth (shadowing неквалифицированных вызовов).
alter function public.protect_profiles_columns() set search_path = public;
alter function public.protect_deals_columns() set search_path = public;
alter function public.protect_streams_columns() set search_path = public;
