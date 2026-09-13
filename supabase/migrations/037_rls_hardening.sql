-- 037: харднинг по результатам внешнего аудита (13.09.2026).
-- Закрывает: самоназначение admin при signup; запись привилегированных колонок
-- profiles/deals обычным UPDATE; само-одобрение верификации; спам в чужие чаты;
-- двойные ордера; декоративность kill-switch публичных страниц.

-- =============================================
-- 1) handle_new_user: роль из клиентских метаданных — только sponsor/recipient.
--    'admin' назначается исключительно вручную (см. 031_admin_rls.sql).
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Користувач'),
    case
      when new.raw_user_meta_data->>'role' in ('sponsor', 'recipient')
        then new.raw_user_meta_data->>'role'
      else 'sponsor'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- =============================================
-- 2) profiles: привилегированные колонки меняет только service_role / admin.
--    Сравнение через to_jsonb — безопасно к отсутствующим колонкам.
-- =============================================
create or replace function public.protect_profiles_columns()
returns trigger
language plpgsql
as $$
declare
  prot text[] := array[
    'role', 'verified', 'verification_status', 'rating', 'rating_count',
    'deals_count', 'total_helped',
    'stripe_connect_status', 'stripe_connect_country', 'stripe_connect_updated_at',
    'paypal_status', 'paypal_updated_at', 'adyen_status',
    'identity_verification_id', 'verified_at'
  ];
  c text;
  jo jsonb := to_jsonb(old);
  jn jsonb := to_jsonb(new);
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_admin() then
    return new;
  end if;
  foreach c in array prot loop
    if jn -> c is distinct from jo -> c then
      raise exception 'profiles.% may only be changed by the platform', c;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_profiles_columns on public.profiles;
create trigger protect_profiles_columns
  before update on public.profiles
  for each row execute function public.protect_profiles_columns();

-- =============================================
-- 3) deals: денежные/статусные колонки меняет только service_role / admin.
--    Участникам остаются title/description/category/urgent и т.п.
-- =============================================
create or replace function public.protect_deals_columns()
returns trigger
language plpgsql
as $$
declare
  prot text[] := array[
    'raised', 'amount', 'amount_cents', 'platform_fee_cents', 'currency',
    'status', 'sponsor_id', 'creator_id',
    'escrow_released_at', 'refunded_at', 'payment_processor',
    'stripe_payment_intent_id', 'stripe_session_id', 'stripe_transfer_id',
    'paypal_order_id', 'paypal_capture_id', 'adyen_psp_reference',
    'dlocal_payment_id', 'wise_transfer_id', 'crypto_invoice_id'
  ];
  c text;
  jo jsonb := to_jsonb(old);
  jn jsonb := to_jsonb(new);
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_admin() then
    return new;
  end if;
  foreach c in array prot loop
    if jn -> c is distinct from jo -> c then
      raise exception 'deals.% may only be changed by the platform', c;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_deals_columns on public.deals;
create trigger protect_deals_columns
  before update on public.deals
  for each row execute function public.protect_deals_columns();

-- =============================================
-- 4) verification_requests: пользователь видит и подаёт свои заявки,
--    но НЕ меняет их (само-одобрение закрыто; статус ставит только платформа).
-- =============================================
drop policy if exists "verif_own" on public.verification_requests;
drop policy if exists "verif_select_own" on public.verification_requests;
drop policy if exists "verif_insert_own" on public.verification_requests;
create policy "verif_select_own" on public.verification_requests
  for select using (auth.uid() = user_id);
create policy "verif_insert_own" on public.verification_requests
  for insert with check (auth.uid() = user_id and status = 'pending');

-- =============================================
-- 5) messages: писать можно только в чат сделки, в которой участвуешь.
-- =============================================
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.deals d
       where d.id = deal_id
         and (d.creator_id = auth.uid() or d.sponsor_id = auth.uid())
    )
  );

-- =============================================
-- 6) orders: защита от двойной вставки при конкурентной доставке вебхука.
-- =============================================
create unique index if not exists orders_stripe_session_uidx
  on public.orders (stripe_session_id)
  where stripe_session_id is not null;

-- =============================================
-- 7) Kill-switch публичной страницы работает на уровне данных, а не UI.
-- =============================================
drop policy if exists "profile_photos_select" on public.profile_photos;
create policy "profile_photos_select" on public.profile_photos
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
                where p.id = user_id and p.public_page_enabled)
  );

drop policy if exists "wall_posts_select" on public.wall_posts;
create policy "wall_posts_select" on public.wall_posts
  for select using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p
                where p.id = author_id and p.public_page_enabled)
  );

drop policy if exists "wishlist_items_select" on public.wishlist_items;
create policy "wishlist_items_select" on public.wishlist_items
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
                where p.id = user_id and p.public_page_enabled)
  );
