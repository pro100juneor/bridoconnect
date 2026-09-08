-- 033: видалення акаунту (App Review guideline 5.1.1(v)).
-- Профіль і особисті дані видаляються каскадом від auth.users → profiles.
-- Фінансові записи (orders, deals) лишаються знеособленими (set null) —
-- вимоги комерційного обліку, але без прив'язки до особи.

alter table deals drop constraint if exists deals_sponsor_id_fkey;
alter table deals
  add constraint deals_sponsor_id_fkey
  foreign key (sponsor_id) references public.profiles(id) on delete set null;

alter table orders alter column buyer_id drop not null;
alter table orders alter column seller_id drop not null;
alter table orders drop constraint if exists orders_buyer_id_fkey;
alter table orders
  add constraint orders_buyer_id_fkey
  foreign key (buyer_id) references public.profiles(id) on delete set null;
alter table orders drop constraint if exists orders_seller_id_fkey;
alter table orders
  add constraint orders_seller_id_fkey
  foreign key (seller_id) references public.profiles(id) on delete set null;
