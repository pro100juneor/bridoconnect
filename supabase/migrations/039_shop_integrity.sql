-- 039: целостность магазина (аудит 13.09, раздел «Осталось НЕ исправлено»).
-- Закрывает: oversell при конкурентных оплатах, необрабатываемые рефанды
-- заказов, недостижимые статусы shipped/completed.
--
-- Суть проблемы с oversell: сток проверялся при создании checkout-сессии, а
-- списывался только в вебхуке после оплаты. Двое покупателей успевали оплатить
-- последний экземпляр. Решение — резервация: сток списывается в момент создания
-- сессии, возвращается по истечении TTL или при отмене.

-- =============================================
-- 1) Резервации товара
-- =============================================
create table if not exists public.product_reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  stripe_session_id text,
  status text not null default 'held'
    check (status in ('held', 'consumed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists product_reservations_expiry_idx
  on public.product_reservations (status, expires_at)
  where status = 'held';
create index if not exists product_reservations_session_idx
  on public.product_reservations (stripe_session_id)
  where stripe_session_id is not null;

alter table public.product_reservations enable row level security;

-- Покупатель видит свои резервации; пишет только service_role (edge-функции).
drop policy if exists "reservations_select_own" on public.product_reservations;
create policy "reservations_select_own" on public.product_reservations
  for select using (buyer_id = auth.uid());
revoke insert, update, delete on public.product_reservations from anon, authenticated;

-- =============================================
-- 2) reserve_stock: атомарный захват единицы товара.
--    Возвращает id резервации либо null, если товара не осталось.
-- =============================================
create or replace function public.reserve_stock(
  p_product_id uuid,
  p_buyer_id uuid,
  p_ttl_minutes int default 30
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_id uuid;
begin
  -- Условный UPDATE — единственная операция, дающая гонко-безопасность без
  -- явных локов: два конкурентных вызова не смогут увести сток ниже нуля.
  update public.products
     set stock = stock - 1,
         status = case when stock - 1 <= 0 then 'sold' else status end,
         updated_at = now()
   where id = p_product_id
     and stock > 0
     and status = 'active';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return null;
  end if;

  insert into public.product_reservations (product_id, buyer_id, expires_at)
  values (p_product_id, p_buyer_id, now() + make_interval(mins => p_ttl_minutes))
  returning id into v_id;
  return v_id;
end;
$$;

-- =============================================
-- 3) consume_reservation: оплата прошла — резервация становится продажей.
--    Сток уже списан при резервации, повторно не трогаем.
-- =============================================
create or replace function public.consume_reservation(
  p_reservation_id uuid,
  p_session_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.product_reservations
     set status = 'consumed',
         stripe_session_id = coalesce(p_session_id, stripe_session_id)
   where id = p_reservation_id
     and status = 'held';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- =============================================
-- 4) release_reservation: отмена/ошибка — сток возвращается в продажу.
-- =============================================
create or replace function public.release_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product uuid;
begin
  update public.product_reservations
     set status = 'released'
   where id = p_reservation_id
     and status = 'held'
  returning product_id into v_product;
  if v_product is null then
    return false;
  end if;
  update public.products
     set stock = stock + 1,
         status = case when status = 'sold' then 'active' else status end,
         updated_at = now()
   where id = v_product;
  return true;
end;
$$;

-- =============================================
-- 5) release_expired_reservations: покупатель ушёл со страницы оплаты —
--    возвращаем товар в продажу. Вызывается по расписанию.
-- =============================================
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select id from public.product_reservations
     where status = 'held' and expires_at < now()
     for update skip locked
  loop
    if public.release_reservation(r.id) then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- =============================================
-- 6) restore_stock_for_order: рефанд заказа возвращает товар в продажу.
-- =============================================
create or replace function public.refund_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product uuid;
begin
  update public.orders
     set status = 'refunded',
         updated_at = now()
   where id = p_order_id
     and status in ('pending', 'paid', 'shipped')
  returning product_id into v_product;
  if v_product is null then
    return false;
  end if;
  update public.products
     set stock = stock + 1,
         status = case when status = 'sold' then 'active' else status end,
         updated_at = now()
   where id = v_product;
  return true;
end;
$$;

-- =============================================
-- 7) Статусы доставки: продавец отмечает отправку, покупатель — получение.
--    Раньше shipped/completed были недостижимы: клиентам UPDATE на orders
--    отозван, а сервисного пути для этих переходов не существовало.
-- =============================================
create or replace function public.advance_order_status(
  p_order_id uuid,
  p_next text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  select id, buyer_id, seller_id, status into v_order
    from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'order not found';
  end if;

  if p_next = 'shipped' then
    if v_uid <> v_order.seller_id then
      raise exception 'only the seller may mark an order shipped';
    end if;
    if v_order.status <> 'paid' then
      raise exception 'only a paid order may be marked shipped';
    end if;
  elsif p_next = 'completed' then
    if v_uid <> v_order.buyer_id then
      raise exception 'only the buyer may confirm delivery';
    end if;
    if v_order.status <> 'shipped' then
      raise exception 'only a shipped order may be completed';
    end if;
  else
    raise exception 'unsupported status transition: %', p_next;
  end if;

  update public.orders
     set status = p_next, updated_at = now()
   where id = p_order_id;
  return true;
end;
$$;

-- Сервисные RPC закрыты от клиентов (см. 036); статусный переход — клиентский,
-- он сам проверяет auth.uid() и права участника заказа.
revoke execute on function public.reserve_stock(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.consume_reservation(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
revoke execute on function public.refund_order(uuid) from public, anon, authenticated;
grant execute on function public.advance_order_status(uuid, text) to authenticated;

-- =============================================
-- 8) Уборка просроченных резерваций каждые 5 минут.
-- =============================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('release-expired-reservations')
      where exists (select 1 from cron.job where jobname = 'release-expired-reservations');
    perform cron.schedule(
      'release-expired-reservations',
      '*/5 * * * *',
      $cron$select public.release_expired_reservations()$cron$
    );
  end if;
end;
$$;
