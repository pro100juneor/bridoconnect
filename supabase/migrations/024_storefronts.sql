-- 024_storefronts.sql
-- Branded storefronts: every seller can design a public shop page reachable at
-- /store/:slug. One row per seller. Theme picked from a 200-variant matrix
-- (see src/storefront/themes.ts); brand/contacts/messengers/blocks live in jsonb
-- so the schema stays stable while the editor evolves.

-- =============================================
-- 1) shop_profiles — one storefront per seller
-- =============================================
create table if not exists public.shop_profiles (
  seller_id  uuid primary key references public.profiles(id) on delete cascade,
  slug       text unique not null,
  theme_id   int not null default 1 check (theme_id between 1 and 200),
  logo_url   text,
  brand      jsonb not null default '{}',
  contacts   jsonb not null default '{}',
  messengers jsonb not null default '{}',
  blocks     jsonb not null default '{}',
  published  boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists shop_profiles_slug_idx on public.shop_profiles (slug);

alter table public.shop_profiles enable row level security;

-- select: published storefronts are public; a draft is visible only to its owner.
drop policy if exists "shop_profiles_select" on public.shop_profiles;
create policy "shop_profiles_select" on public.shop_profiles
  for select using (published = true or seller_id = auth.uid());

-- insert/update/delete: only the owner.
drop policy if exists "shop_profiles_owner_insert" on public.shop_profiles;
create policy "shop_profiles_owner_insert" on public.shop_profiles
  for insert to authenticated with check (seller_id = auth.uid());

drop policy if exists "shop_profiles_owner_update" on public.shop_profiles;
create policy "shop_profiles_owner_update" on public.shop_profiles
  for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "shop_profiles_owner_delete" on public.shop_profiles;
create policy "shop_profiles_owner_delete" on public.shop_profiles
  for delete to authenticated using (seller_id = auth.uid());

-- Keep updated_at fresh.
create or replace function public.touch_shop_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_profiles_touch_updated on public.shop_profiles;
create trigger shop_profiles_touch_updated
  before update on public.shop_profiles
  for each row execute function public.touch_shop_profiles_updated_at();

-- =============================================
-- 2) Storage bucket 'shop-logos' (public read; owner writes own folder)
-- =============================================
insert into storage.buckets (id, name, public)
  values ('shop-logos', 'shop-logos', true)
  on conflict (id) do nothing;

drop policy if exists "shop_logos_public_read" on storage.objects;
create policy "shop_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'shop-logos');

drop policy if exists "shop_logos_owner_insert" on storage.objects;
create policy "shop_logos_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shop_logos_owner_update" on storage.objects;
create policy "shop_logos_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'shop-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shop_logos_owner_delete" on storage.objects;
create policy "shop_logos_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shop-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 3) generate_shop_slug — unique, URL-safe slug from an arbitrary base string
-- =============================================
create or replace function public.generate_shop_slug(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  -- normalize: lowercase, non-[a-z0-9] -> '-', collapse/trim dashes.
  v_base := lower(coalesce(p_base, ''));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '(^-+)|(-+$)', '', 'g');
  if v_base is null or v_base = '' then
    v_base := 'shop';
  end if;
  v_base := left(v_base, 48);

  v_slug := v_base;
  while exists (select 1 from public.shop_profiles where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  return v_slug;
end;
$$;

grant execute on function public.generate_shop_slug(text) to authenticated;
