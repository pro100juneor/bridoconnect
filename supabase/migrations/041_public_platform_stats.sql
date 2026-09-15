-- 041: настоящая статистика для публичной страницы «Прозорість» (15.09.2026).
--
-- До этой миграции TransparencyPage показывала захардкоженные числа
-- (€847,240 переводов, 3,847 сделок, 12,340 пользователей, 4.87★ из 10,000+
-- отзывов) под заголовком «Ми публікуємо реальні дані про всі транзакції».
-- Ни одна цифра не читалась из базы. Для платформы гуманитарной помощи
-- выдуманная статистика на странице прозрачности — прямой обман, плюс риск
-- по UWG §5 (irreführende geschäftliche Handlung).
--
-- Функция возвращает только агрегаты: ни одной строки, привязанной к человеку,
-- наружу не уходит. Поэтому её безопасно звать анонимно.

create or replace function public.public_platform_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    -- Сумма фактически выплаченного получателям: только сделки с состоявшимся
    -- релизом эскроу и без возврата. Незакрытые и зарефанженные не считаем —
    -- деньги по ним получателя не достигли.
    'volume_cents', coalesce((
      select sum(d.amount_cents - coalesce(d.platform_fee_cents, 0))
      from deals d
      where d.escrow_released_at is not null
        and d.refunded_at is null
    ), 0),
    'deals_completed', (
      select count(*)
      from deals d
      where d.escrow_released_at is not null
        and d.refunded_at is null
    ),
    'orders_completed', (
      select count(*) from orders o where o.status = 'completed'
    ),
    -- «Активные» — те, у кого есть хоть одна закрытая сделка в любой роли.
    -- Считать все зарегистрированные профили было бы приписыванием: пустая
    -- регистрация не равна пользователю платформы.
    'active_users', (
      select count(distinct p) from (
        select creator_id as p from deals where escrow_released_at is not null and refunded_at is null
        union
        select sponsor_id from deals where escrow_released_at is not null and refunded_at is null and sponsor_id is not null
        union
        select buyer_id from orders where status = 'completed'
        union
        select seller_id from orders where status = 'completed'
      ) u where p is not null
    ),
    'countries', (
      select count(distinct country)
      from profiles
      where country is not null and country <> ''
    ),
    -- round(...,2) вместо «4.87» из воздуха; null, если отзывов ещё нет —
    -- фронт в этом случае не рисует плитку вообще.
    'avg_rating', (
      select round(avg(rating)::numeric, 2) from reviews
    ),
    'reviews_count', (select count(*) from reviews),
    -- Дата первой закрытой сделки: подпись «з <місяць> <рік>» должна опираться
    -- на факт, а не на «з листопада 2024».
    'since', (
      select min(created_at)
      from deals
      where escrow_released_at is not null and refunded_at is null
    ),
    'generated_at', now()
  );
$$;

comment on function public.public_platform_stats() is
  'Агрегированная публичная статистика платформы для страницы «Прозорість». '
  'Только суммы и счётчики, персональных данных не возвращает.';

revoke all on function public.public_platform_stats() from public;
grant execute on function public.public_platform_stats() to anon, authenticated;
