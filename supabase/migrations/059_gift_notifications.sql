-- 059_gift_notifications.sql
-- P5: in-app уведомления бенефициару о подарке — на уровне БД (триггер на orders),
-- чтобы работало независимо от того, кто пишет заказ (stripe-webhook/service_role).
-- Deno здесь не нужен — всё проверяется на локальной БД.

-- 1) Разрешаем новые типы уведомлений.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'deal_accepted','deal_completed','new_message','donation_received','review_received','system',
    'gift_received','gift_shipped','gift_delivered'
  ));

-- 2) Триггерная функция: уведомляет получателя подарка при создании заказа и смене
--    статуса исполнения. SECURITY DEFINER — чтобы insert прошёл независимо от RLS.
create or replace function public.notify_gift_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Новый подарок (paid-заказ создаётся вебхуком сразу со статусом paid).
  if tg_op = 'INSERT' then
    if new.is_gift and new.beneficiary_id is not null then
      insert into public.notifications (user_id, type, title, body)
      values (new.beneficiary_id, 'gift_received', 'Новий подарунок',
              'Вам надіслали подарунок — деталі в розділі «Подарунки».');
    end if;
    return new;
  end if;

  -- Смена статуса доставки.
  if tg_op = 'UPDATE' and new.beneficiary_id is not null
     and new.fulfillment_status is distinct from old.fulfillment_status then
    if new.fulfillment_status = 'shipped' then
      insert into public.notifications (user_id, type, title, body)
      values (new.beneficiary_id, 'gift_shipped', 'Подарунок відправлено',
              coalesce('Трек-номер: ' || new.tracking, 'Ваш подарунок у дорозі.'));
    elsif new.fulfillment_status = 'delivered' then
      insert into public.notifications (user_id, type, title, body)
      values (new.beneficiary_id, 'gift_delivered', 'Подарунок доставлено',
              'Ваш подарунок доставлено.');
    end if;
  end if;

  return new;
end $$;

drop trigger if exists orders_notify_gift_insert on public.orders;
create trigger orders_notify_gift_insert
  after insert on public.orders
  for each row execute function public.notify_gift_order();

drop trigger if exists orders_notify_gift_update on public.orders;
create trigger orders_notify_gift_update
  after update of fulfillment_status on public.orders
  for each row execute function public.notify_gift_order();
