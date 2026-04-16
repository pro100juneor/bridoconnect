-- Avatar storage bucket
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Anyone can view avatars (public bucket)
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Only owner can upload their avatar
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Increment function for deal raised amount
create or replace function public.increment_raised(deal_id uuid, amount numeric)
returns void as $$
begin
  update public.deals
  set raised = raised + amount,
      updated_at = now()
  where id = deal_id;
end;
$$ language plpgsql security definer;
