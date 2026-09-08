-- 021_storage_products.sql
-- Public-read bucket for product images (shop). Sellers upload; anyone can view.

insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

-- Public read
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Authenticated users upload into their own folder (path prefix = auth.uid()).
drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
