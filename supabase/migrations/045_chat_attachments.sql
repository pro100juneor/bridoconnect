-- Chat attachments: file/photo uploads for both deal chats (messages) and
-- direct messages (direct_messages). Files live in a PRIVATE Storage bucket and
-- are reachable only by the participants of the deal/thread encoded in the path.
--
-- Path convention (enforced by the policies below):
--   deal/<dealId>/<uuid>.<ext>
--   dm/<threadId>/<uuid>.<ext>

alter table public.messages add column if not exists attachment_url text;
alter table public.direct_messages add column if not exists attachment_url text;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- Read: a participant of the referenced deal/thread may read the object.
drop policy if exists "chat_attach_read" on storage.objects;
create policy "chat_attach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      (
        (storage.foldername(name))[1] = 'deal'
        and exists (
          select 1 from public.deals d
          where d.id::text = (storage.foldername(name))[2]
            and (d.creator_id = auth.uid() or d.sponsor_id = auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'dm'
        and exists (
          select 1 from public.direct_threads t
          where t.id::text = (storage.foldername(name))[2]
            and (t.user_a = auth.uid() or t.user_b = auth.uid())
        )
      )
    )
  );

-- Upload: only a participant may upload into their deal/thread folder.
drop policy if exists "chat_attach_insert" on storage.objects;
create policy "chat_attach_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and owner = auth.uid()
    and (
      (
        (storage.foldername(name))[1] = 'deal'
        and exists (
          select 1 from public.deals d
          where d.id::text = (storage.foldername(name))[2]
            and (d.creator_id = auth.uid() or d.sponsor_id = auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'dm'
        and exists (
          select 1 from public.direct_threads t
          where t.id::text = (storage.foldername(name))[2]
            and (t.user_a = auth.uid() or t.user_b = auth.uid())
        )
      )
    )
  );
