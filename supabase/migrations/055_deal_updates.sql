-- Progress updates posted by the recipient (deal creator) on a deal: текст +
-- опциональное фото/чек. Доказанный драйвер доверия и повторных донатов
-- (прозрачность расходования). Видны обеим сторонам сделки.

create table if not exists public.deal_updates (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  -- storage path в приватном бакете chat-attachments (deal/<dealId>/<uuid>.<ext>),
  -- показывается через signed URL — как вложения чата. NULL — апдейт без фото.
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists deal_updates_deal_idx on public.deal_updates (deal_id, created_at desc);

alter table public.deal_updates enable row level security;

-- Постит ТОЛЬКО создатель сделки (получатель помощи).
create policy "deal_updates_insert_creator" on public.deal_updates
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.deals d where d.id = deal_id and d.creator_id = auth.uid())
  );

-- Читают обе стороны сделки (получатель и спонсор).
create policy "deal_updates_select_participant" on public.deal_updates
  for select using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and (d.creator_id = auth.uid() or d.sponsor_id = auth.uid())
    )
  );

-- Автор может удалить свой апдейт (исправить ошибку/неверное фото).
create policy "deal_updates_delete_own" on public.deal_updates
  for delete using (author_id = auth.uid());
