-- 038_privacy_hardening.sql
-- Закрывает два пункта приватности из KNOWN_ISSUES («Осталось НЕ исправлено»):
--
--   1) profiles.crypto_addresses лежал в публично читаемой таблице
--      (profiles_select using(true)): любой мог достать адреса получателей
--      (деанон + материал для подмены адреса в UI). Выносим в закрытую
--      таблицу по образцу 035_payment_accounts_security.sql.
--
--   2) sponsor_reveal и field_visibility энфорсились ТОЛЬКО в клиенте —
--      скрытые поля читались напрямую через PostgREST. Переносим энфорсмент
--      в БД.
--
-- Почему не security-barrier view для profiles: попытка ограничить чтение
-- профиля колоночными привилегиями уже провалилась (см. 014 — REVOKE SELECT
-- ломает все select("*")), а подмена таблицы profiles на view сломала бы
-- embedded-джойны PostgREST (`profiles!creator_id(...)`), которых в клиенте
-- больше десятка. Поэтому:
--   * поля с ПОВИДЖЕРНЫМ доступом (sponsor_reveal — открывается
--     индивидуальным грантом) переезжают в отдельную таблицу с RLS;
--   * поля с ГЛОБАЛЬНЫМ переключателем видимости (bio / city / country)
--     остаются в profiles, но их значения физически убираются из публичной
--     таблицы в приватный «сейф» profile_hidden_fields, пока владелец держит
--     секцию скрытой (триггер ниже). Колонки на месте — джойны и select("*")
--     продолжают работать, просто отдают NULL;
--   * секции-таблицы (photos / wall / wishlist) закрываются политиками RLS
--     по образцу kill-switch из 037.

-- =============================================================
-- 1) crypto_addresses -> profile_crypto_addresses
-- =============================================================

create table if not exists public.profile_crypto_addresses (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  usdt_trc20 text,
  btc_ln     text,
  updated_at timestamptz not null default now()
);

alter table public.profile_crypto_addresses enable row level security;

-- Читает и пишет только владелец (адреса вводит сам пользователь в
-- /app/profile); service_role в edge-функциях RLS обходит.
drop policy if exists "pca_select_own" on public.profile_crypto_addresses;
create policy "pca_select_own" on public.profile_crypto_addresses
  for select using (auth.uid() = profile_id);

drop policy if exists "pca_insert_own" on public.profile_crypto_addresses;
create policy "pca_insert_own" on public.profile_crypto_addresses
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "pca_update_own" on public.profile_crypto_addresses;
create policy "pca_update_own" on public.profile_crypto_addresses
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Перенос существующих данных (jsonb {"usdt_trc20": "...", "btc_ln": "..."}).
insert into public.profile_crypto_addresses (profile_id, usdt_trc20, btc_ln)
select id,
       nullif(crypto_addresses ->> 'usdt_trc20', ''),
       nullif(crypto_addresses ->> 'btc_ln', '')
  from public.profiles
 where crypto_addresses is not null
   and crypto_addresses <> '{}'::jsonb
on conflict (profile_id) do nothing;

-- crypto_enabled остаётся в profiles: это не идентификатор, а публичный
-- признак «принимаю крипту» (нужен чекаутам без service_role).
alter table public.profiles drop column if exists crypto_addresses;

-- =============================================================
-- 2) sponsor_reveal -> profile_sponsor_reveal (per-request доступ)
-- =============================================================
-- Анкета спонсора закрыта по умолчанию и открывается ИНДИВИДУАЛЬНЫМ грантом
-- (027). Такой доступ нельзя выразить маскированием колонки — только строкой
-- + RLS через has_profile_access().

create table if not exists public.profile_sponsor_reveal (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reveal     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profile_sponsor_reveal enable row level security;

-- has_profile_access вызывается из политики, значит право execute нужно и
-- анону (027 выдал только authenticated) — иначе анонимный select падает с
-- permission denied for function вместо пустого результата.
grant execute on function public.has_profile_access(uuid, uuid) to anon;

-- select: владелец + тот, кому владелец выдал активный грант.
drop policy if exists "psr_select_granted" on public.profile_sponsor_reveal;
create policy "psr_select_granted" on public.profile_sponsor_reveal
  for select using (public.has_profile_access(profile_id, auth.uid()));

drop policy if exists "psr_insert_own" on public.profile_sponsor_reveal;
create policy "psr_insert_own" on public.profile_sponsor_reveal
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "psr_update_own" on public.profile_sponsor_reveal;
create policy "psr_update_own" on public.profile_sponsor_reveal
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

insert into public.profile_sponsor_reveal (profile_id, reveal)
select id, sponsor_reveal
  from public.profiles
 where sponsor_reveal is not null
   and sponsor_reveal <> '{}'::jsonb
on conflict (profile_id) do nothing;

alter table public.profiles drop column if exists sponsor_reveal;

-- =============================================================
-- 3) field_visibility: энфорсмент в БД
-- =============================================================
-- Семантика клиента (isVisible в useRecipientPage.ts): ОТСУТСТВУЮЩИЙ ключ =
-- видимо, скрывает только явный false. Повторяем её здесь дословно.

-- 3a) Секции-таблицы: расширяем kill-switch-политики из 037.

drop policy if exists "profile_photos_select" on public.profile_photos;
create policy "profile_photos_select" on public.profile_photos
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
       where p.id = user_id
         and p.public_page_enabled
         and coalesce(p.field_visibility ->> 'photos', 'true') <> 'false'
    )
  );

drop policy if exists "wall_posts_select" on public.wall_posts;
create policy "wall_posts_select" on public.wall_posts
  for select using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profiles p
       where p.id = author_id
         and p.public_page_enabled
         and coalesce(p.field_visibility ->> 'wall', 'true') <> 'false'
    )
  );

drop policy if exists "wishlist_items_select" on public.wishlist_items;
create policy "wishlist_items_select" on public.wishlist_items
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
       where p.id = user_id
         and p.public_page_enabled
         and coalesce(p.field_visibility ->> 'wishlist', 'true') <> 'false'
    )
  );

-- 3b) Колонки bio / city / country: приватный «сейф» + триггер.
--     Пока секция скрыта, реальное значение лежит здесь (читает только
--     владелец), а в публичной profiles стоит NULL. При включении видимости
--     значение возвращается обратно в profiles, строка сейфа удаляется.

create table if not exists public.profile_hidden_fields (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  bio        text,
  city       text,
  country    text,
  updated_at timestamptz not null default now()
);

alter table public.profile_hidden_fields enable row level security;

-- Читает только владелец. Пишет только триггер (security definer) и
-- service_role — политик insert/update намеренно нет.
drop policy if exists "phf_select_own" on public.profile_hidden_fields;
create policy "phf_select_own" on public.profile_hidden_fields
  for select using (auth.uid() = profile_id);

-- Разовый перенос уже скрытых значений ДО создания триггера: иначе UPDATE
-- ниже был бы воспринят триггером как явная запись NULL и затёр бы сейф.
insert into public.profile_hidden_fields (profile_id, bio, city, country)
select id,
       case when coalesce(field_visibility ->> 'bio', 'true') = 'false' then bio end,
       case when coalesce(field_visibility ->> 'location', 'true') = 'false' then city end,
       case when coalesce(field_visibility ->> 'location', 'true') = 'false' then country end
  from public.profiles
 where coalesce(field_visibility ->> 'bio', 'true') = 'false'
    or coalesce(field_visibility ->> 'location', 'true') = 'false'
on conflict (profile_id) do nothing;

update public.profiles
   set bio     = case when coalesce(field_visibility ->> 'bio', 'true') = 'false'      then null else bio end,
       city    = case when coalesce(field_visibility ->> 'location', 'true') = 'false' then null else city end,
       country = case when coalesce(field_visibility ->> 'location', 'true') = 'false' then null else country end
 where coalesce(field_visibility ->> 'bio', 'true') = 'false'
    or coalesce(field_visibility ->> 'location', 'true') = 'false';

create or replace function public.apply_profile_field_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hide_bio boolean := coalesce(new.field_visibility ->> 'bio', 'true') = 'false';
  v_hide_loc boolean := coalesce(new.field_visibility ->> 'location', 'true') = 'false';
  v_stash    public.profile_hidden_fields%rowtype;
  v_bio      text;
  v_city     text;
  v_country  text;
begin
  select * into v_stash from public.profile_hidden_fields where profile_id = new.id;

  -- Эффективное значение поля: явная запись в этом UPDATE побеждает, иначе
  -- берём спрятанную копию (колонка profiles при скрытой секции = NULL и
  -- сама по себе источником истины быть не может).
  if tg_op = 'UPDATE' then
    v_bio := case
               when new.bio is distinct from old.bio then new.bio
               when v_stash.bio is not null          then v_stash.bio
               else new.bio
             end;
    v_city := case
                when new.city is distinct from old.city then new.city
                when v_stash.city is not null           then v_stash.city
                else new.city
              end;
    v_country := case
                   when new.country is distinct from old.country then new.country
                   when v_stash.country is not null              then v_stash.country
                   else new.country
                 end;
  else
    v_bio     := new.bio;
    v_city    := new.city;
    v_country := new.country;
  end if;

  -- Публичная проекция.
  new.bio := case when v_hide_bio then null else v_bio end;
  if v_hide_loc then
    new.city    := null;
    new.country := null;
  else
    new.city    := v_city;
    new.country := v_country;
  end if;

  -- Приватный сейф: держим строку только пока что-то реально скрыто.
  if v_hide_bio or v_hide_loc then
    insert into public.profile_hidden_fields (profile_id, bio, city, country, updated_at)
    values (
      new.id,
      case when v_hide_bio then v_bio end,
      case when v_hide_loc then v_city end,
      case when v_hide_loc then v_country end,
      now()
    )
    on conflict (profile_id) do update
      set bio        = excluded.bio,
          city       = excluded.city,
          country    = excluded.country,
          updated_at = now();
  elsif v_stash.profile_id is not null then
    delete from public.profile_hidden_fields where profile_id = new.id;
  end if;

  return new;
end;
$$;

-- Имя триггера намеренно начинается с 'a': BEFORE-триггеры выполняются в
-- алфавитном порядке, и маскирование должно отработать до
-- protect_profiles_columns (037), которому эти колонки безразличны.
drop trigger if exists a_apply_profile_field_visibility on public.profiles;
create trigger a_apply_profile_field_visibility
  before insert or update on public.profiles
  for each row execute function public.apply_profile_field_visibility();
