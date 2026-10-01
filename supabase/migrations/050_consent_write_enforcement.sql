-- 050: CB-2 (серверный энфорс согласия). Без завершённого онбординга (18+/Условия)
-- нельзя создавать контент: сделки, товары, эфиры. Существующие пользователи
-- забэкфилены (048) → не затронуты; email-регистрация помечается онбордингом сразу.

create or replace function public.is_onboarded()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and onboarding_completed_at is not null
  );
$$;

revoke all on function public.is_onboarded() from public;
grant execute on function public.is_onboarded() to authenticated, anon;

-- deals: создавать запрос может только онбординговый автор
drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals for insert
  with check (auth.uid() = creator_id and public.is_onboarded());

-- streams: запускать эфир — только онбординговый хост
drop policy if exists "streams_insert" on public.streams;
create policy "streams_insert" on public.streams for insert
  with check (auth.uid() = host_id and public.is_onboarded());

-- products: выставлять товар — только онбординговый продавец
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert
  with check (seller_id = auth.uid() and public.is_onboarded());
