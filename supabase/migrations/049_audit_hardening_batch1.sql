-- 049: хардненинг по глубокому аудиту (батч 1).
-- Закрывает: CB-2 (само-запись согласия), H-6/M-1 (reviews), streams-форж raised,
-- M-2 (search_path на SECURITY DEFINER), публично-исполняемый recalc_role_rating.

-- =============================================
-- CB-2. Колонки согласия 18+/Условия — только через RPC/service (не клиентским UPDATE).
--       Добавляем их в защищённый список profiles.
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
    'identity_verification_id', 'verified_at',
    -- согласие/онбординг: пишется только complete_social_onboarding (SECURITY DEFINER) / service
    'onboarding_completed_at', 'age_confirmed', 'terms_accepted_at'
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

-- =============================================
-- H-6. reviews INSERT: автор обязан быть участником сделки, а reviewee — контрагентом.
--      (Раньше проверялся только reviewer_id = auth.uid() → накрутка рейтинга любому.)
-- =============================================
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert with check (
  auth.uid() = reviewer_id
  and exists (
    select 1 from public.deals d
    where d.id = deal_id
      and (
        (d.creator_id = auth.uid() and reviewee_id = d.sponsor_id) or
        (d.sponsor_id  = auth.uid() and reviewee_id = d.creator_id)
      )
  )
);

-- M-1. reviews SELECT: не раскрывать нераскрытые отзывы контрагента (двойная слепота).
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select using (
  revealed = true
  or auth.uid() = reviewer_id
  or public.is_admin()
);

-- =============================================
-- streams: хост не может подделывать raised/goal/viewer_count/host_id (нет column-guard).
--          status остаётся редактируемым хостом (завершение своего эфира).
-- =============================================
create or replace function public.protect_streams_columns()
returns trigger
language plpgsql
as $$
declare
  prot text[] := array['raised', 'goal_amount', 'viewer_count', 'host_id'];
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
      raise exception 'streams.% may only be changed by the platform', c;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_streams_columns on public.streams;
create trigger protect_streams_columns
  before update on public.streams
  for each row execute function public.protect_streams_columns();

-- =============================================
-- recalc_role_rating проскочила revoke-sweep 036 → публично исполняема. Закрываем.
-- =============================================
do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where proname = 'recalc_role_rating' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- =============================================
-- M-2. search_path = public на ВСЕХ SECURITY DEFINER-функциях public, где он не задан
--      (защита от search-path hijack; новые миграции уже так делают, старые — нет).
-- =============================================
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;
