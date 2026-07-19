-- 026_recipient_pages.sql
-- Public "recipient" pages: a social-network-style profile any visitor can open at
-- /u/:slug. Shows non-sensitive data only — cover, avatar, bio, a photo gallery,
-- a wall of posts, and a wishlist. Passport/bank data lives elsewhere (Phase 5.3).
--
-- profiles.slug gives the page a stable public URL; cover_url + public_page_enabled
-- drive the layout and a kill-switch. bio already exists (001_initial_schema.sql),
-- so it is NOT re-added here.

-- =============================================
-- 1) profiles: public-page columns
-- =============================================
alter table public.profiles add column if not exists slug text unique;
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists public_page_enabled boolean not null default true;

create index if not exists profiles_slug_idx on public.profiles (slug);

-- =============================================
-- 2) generate_profile_slug — unique, URL-safe slug from an arbitrary base string
--    (mirrors generate_shop_slug from 024_storefronts.sql, but checks profiles.slug)
-- =============================================
create or replace function public.generate_profile_slug(p_base text)
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
    v_base := 'user';
  end if;
  v_base := left(v_base, 48);

  v_slug := v_base;
  while exists (select 1 from public.profiles where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  return v_slug;
end;
$$;

grant execute on function public.generate_profile_slug(text) to authenticated;

-- =============================================
-- 3) profile_photos — public gallery
-- =============================================
create table if not exists public.profile_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  url        text not null,
  sort       int default 0,
  created_at timestamptz default now()
);

create index if not exists profile_photos_user_idx on public.profile_photos (user_id, sort);

alter table public.profile_photos enable row level security;

-- select: public gallery.
drop policy if exists "profile_photos_select" on public.profile_photos;
create policy "profile_photos_select" on public.profile_photos
  for select using (true);

drop policy if exists "profile_photos_owner_insert" on public.profile_photos;
create policy "profile_photos_owner_insert" on public.profile_photos
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "profile_photos_owner_update" on public.profile_photos;
create policy "profile_photos_owner_update" on public.profile_photos
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profile_photos_owner_delete" on public.profile_photos;
create policy "profile_photos_owner_delete" on public.profile_photos
  for delete to authenticated using (user_id = auth.uid());

-- Storage bucket 'profile-photos' (public read; owner writes own folder — as 021).
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', true)
  on conflict (id) do nothing;

drop policy if exists "profile_photos_public_read" on storage.objects;
create policy "profile_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_owner_upload" on storage.objects;
create policy "profile_photos_owner_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_photos_owner_remove" on storage.objects;
create policy "profile_photos_owner_remove"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 4) wall_posts — social wall (public read; author writes own)
-- =============================================
create table if not exists public.wall_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  media      text[] not null default '{}',
  created_at timestamptz default now()
);

create index if not exists wall_posts_author_idx on public.wall_posts (author_id, created_at desc);

alter table public.wall_posts enable row level security;

drop policy if exists "wall_posts_select" on public.wall_posts;
create policy "wall_posts_select" on public.wall_posts
  for select using (true);

drop policy if exists "wall_posts_author_insert" on public.wall_posts;
create policy "wall_posts_author_insert" on public.wall_posts
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "wall_posts_author_delete" on public.wall_posts;
create policy "wall_posts_author_delete" on public.wall_posts
  for delete to authenticated using (author_id = auth.uid());

-- =============================================
-- 5) wishlist_items — needs, either from the shop catalog (product_id) or free-form
-- =============================================
create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title      text,
  note       text,
  priority   int default 0,
  created_at timestamptz default now()
);

create index if not exists wishlist_items_user_idx on public.wishlist_items (user_id, priority desc, created_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist_items_select" on public.wishlist_items;
create policy "wishlist_items_select" on public.wishlist_items
  for select using (true);

drop policy if exists "wishlist_items_owner_insert" on public.wishlist_items;
create policy "wishlist_items_owner_insert" on public.wishlist_items
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "wishlist_items_owner_update" on public.wishlist_items;
create policy "wishlist_items_owner_update" on public.wishlist_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "wishlist_items_owner_delete" on public.wishlist_items;
create policy "wishlist_items_owner_delete" on public.wishlist_items
  for delete to authenticated using (user_id = auth.uid());
