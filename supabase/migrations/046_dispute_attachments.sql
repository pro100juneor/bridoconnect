-- Dispute evidence: store the storage paths of uploaded screenshots/documents on
-- the dispute row. Files live in the existing private chat-attachments bucket under
-- the deal path (deal/<dealId>/...), which deal participants may already read/write.
alter table public.disputes add column if not exists attachments text[] not null default '{}';

-- Trust & Safety (admins) must be able to read attachments to review disputes.
drop policy if exists "chat_attach_admin_read" on storage.objects;
create policy "chat_attach_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-attachments' and public.is_admin());
