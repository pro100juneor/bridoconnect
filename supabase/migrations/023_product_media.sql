-- 023_product_media.sql
-- Product media: up to 20 photos + up to 5 videos (≤30s each, enforced client-side).
--   1) products.videos text[] — public URLs into the 'product-videos' bucket.
--   2) CHECK caps on images (≤20) and videos (≤5). Length limit only; per-video
--      duration (≤30s) is validated in the client (see CreateProduct.tsx). A server
--      transcode/moderation edge function is out of scope for now.
--   3) Public-read 'product-videos' bucket, same owner-folder policies as
--      021_storage_products.sql (path prefix = auth.uid()).

-- =============================================
-- 1) videos column
-- =============================================
alter table public.products
  add column if not exists videos text[] not null default '{}';

-- =============================================
-- 2) count caps (CHECK, not triggers) — added idempotently
-- =============================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.products'::regclass
       and conname = 'products_images_max'
  ) then
    alter table public.products
      add constraint products_images_max
      check (coalesce(array_length(images, 1), 0) <= 20);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.products'::regclass
       and conname = 'products_videos_max'
  ) then
    alter table public.products
      add constraint products_videos_max
      check (coalesce(array_length(videos, 1), 0) <= 5);
  end if;
end$$;

-- =============================================
-- 3) product-videos bucket (public read; owners write into their own folder)
-- =============================================
insert into storage.buckets (id, name, public)
  values ('product-videos', 'product-videos', true)
  on conflict (id) do nothing;

-- Public read
drop policy if exists "product_videos_public_read" on storage.objects;
create policy "product_videos_public_read"
  on storage.objects for select
  using (bucket_id = 'product-videos');

-- Authenticated users upload into their own folder (path prefix = auth.uid()).
drop policy if exists "product_videos_owner_insert" on storage.objects;
create policy "product_videos_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "product_videos_owner_delete" on storage.objects;
create policy "product_videos_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
