-- 051: H-7 — удаление аккаунта не должно падать на FK и не должно уничтожать финзаписи.
-- Было: deals.creator_id ON DELETE CASCADE + transactions.deal_id RESTRICT →
-- получатель, получивший донат, не мог удалиться (FK-violation), а где каскад срабатывал —
-- сделки/транзакции стирались. Делаем анонимизацию: ON DELETE SET NULL.

-- deals.creator_id: CASCADE → SET NULL (колонка должна стать nullable)
alter table public.deals alter column creator_id drop not null;
alter table public.deals drop constraint deals_creator_id_fkey;
alter table public.deals add constraint deals_creator_id_fkey
  foreign key (creator_id) references public.profiles(id) on delete set null;

-- transactions.deal_id: NO ACTION → SET NULL
alter table public.transactions alter column deal_id drop not null;
alter table public.transactions drop constraint transactions_deal_id_fkey;
alter table public.transactions add constraint transactions_deal_id_fkey
  foreign key (deal_id) references public.deals(id) on delete set null;

-- transactions.user_id: CASCADE → SET NULL (сохраняем финзапись, рвём связь с person)
alter table public.transactions alter column user_id drop not null;
alter table public.transactions drop constraint transactions_user_id_fkey;
alter table public.transactions add constraint transactions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
