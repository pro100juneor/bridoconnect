-- 010_two_sided_rating.sql
-- Двусторонняя система рейтинга: спонсор и получатель оценивают друг друга
-- по разным критериям. Введение Trust Score (composite) для UI-бейджа.

-- =============================================
-- reviews: расширение существующей таблицы
-- =============================================
-- role = роль reviewer'а в сделке. Спонсор оценивает recipient'а как "recipient" и наоборот.
alter table public.reviews
  add column if not exists role text
    check (role in ('as_sponsor','as_recipient')),
  add column if not exists tags text[] default '{}',
  add column if not exists revealed boolean not null default false,
  add column if not exists revealed_at timestamptz;

-- profiles: разделить агрегированный рейтинг на 2
alter table public.profiles
  add column if not exists rating_as_sponsor numeric(3,2) not null default 0,
  add column if not exists rating_as_recipient numeric(3,2) not null default 0,
  add column if not exists reviews_count_as_sponsor integer not null default 0,
  add column if not exists reviews_count_as_recipient integer not null default 0;

-- =============================================
-- review_flags — флаги для антифрод
-- =============================================
create table if not exists public.review_flags (
  id uuid default uuid_generate_v4() primary key,
  review_id uuid references public.reviews(id) on delete cascade not null,
  flagger_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null check (reason in ('spam','fake','offensive','retaliation','other')),
  notes text,
  created_at timestamptz not null default now(),
  unique(review_id, flagger_id)
);

alter table public.review_flags enable row level security;
create policy "flags_select_own" on public.review_flags for select
  using (auth.uid() = flagger_id);
create policy "flags_insert_own" on public.review_flags for insert
  with check (auth.uid() = flagger_id);

-- =============================================
-- Mutual-blind reveal: до того, как обе стороны оставят отзыв, ни одна не видит.
-- Trigger: при появлении второй стороны → reveal обе.
-- =============================================
create or replace function public.handle_review_pairing()
returns trigger as $$
declare
  v_pair_count int;
begin
  select count(*) into v_pair_count from public.reviews where deal_id = new.deal_id;
  if v_pair_count >= 2 then
    update public.reviews
       set revealed = true,
           revealed_at = now()
     where deal_id = new.deal_id and not revealed;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_pairing on public.reviews;
create trigger on_review_pairing
  after insert on public.reviews
  for each row execute procedure public.handle_review_pairing();

-- =============================================
-- Aggregation triggers: пересчёт rating_as_* при появлении отзыва
-- =============================================
create or replace function public.recalc_role_rating(p_user uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Спонсор получил отзыв (role='as_sponsor') → reviews about him as sponsor.
  update public.profiles p
     set rating_as_sponsor = coalesce((
           select round(avg(rating)::numeric, 2)
             from public.reviews r
            where r.reviewee_id = p.id and r.role = 'as_sponsor' and r.revealed
         ), 0),
         reviews_count_as_sponsor = coalesce((
           select count(*) from public.reviews r
            where r.reviewee_id = p.id and r.role = 'as_sponsor' and r.revealed
         ), 0),
         rating_as_recipient = coalesce((
           select round(avg(rating)::numeric, 2)
             from public.reviews r
            where r.reviewee_id = p.id and r.role = 'as_recipient' and r.revealed
         ), 0),
         reviews_count_as_recipient = coalesce((
           select count(*) from public.reviews r
            where r.reviewee_id = p.id and r.role = 'as_recipient' and r.revealed
         ), 0)
   where p.id = p_user;
end;
$$;

create or replace function public.handle_review_revealed()
returns trigger as $$
begin
  if new.revealed and (old is null or not old.revealed) then
    perform public.recalc_role_rating(new.reviewee_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_revealed on public.reviews;
create trigger on_review_revealed
  after update on public.reviews
  for each row execute procedure public.handle_review_revealed();

-- =============================================
-- Trust Score: composite (KYC + deals + rating + age)
-- Возвращает 0-100. Используется для бейджа на PublicProfile.
-- =============================================
create or replace function public.trust_score(p_user uuid)
returns integer
language plpgsql
stable
as $$
declare
  v_kyc int;
  v_deals_pts numeric;
  v_rating_pts numeric;
  v_age_pts numeric;
  v_total numeric;
  v_p record;
begin
  select verified, deals_count, rating_as_sponsor, rating_as_recipient,
         reviews_count_as_sponsor + reviews_count_as_recipient as total_reviews,
         extract(epoch from now() - created_at) / 86400 as age_days,
         stripe_connect_status
    into v_p
    from public.profiles where id = p_user;

  if v_p is null then return 0; end if;

  -- KYC: 25 баллов за email-verified, +10 за Stripe Connect enabled, +15 за govt ID (profiles.verified)
  v_kyc := case when v_p.verified then 25 else 5 end
         + case when v_p.stripe_connect_status = 'enabled' then 10 else 0 end
         + case when v_p.verified then 15 else 0 end;
  if v_kyc > 25 then v_kyc := 25; end if;

  -- Deals: 2 балла за каждую успешную, max 20
  v_deals_pts := least(coalesce(v_p.deals_count, 0) * 2, 20);

  -- Rating: 0..5 * 8 (взять max из 2 ролей), max 40
  v_rating_pts := least(
    greatest(coalesce(v_p.rating_as_sponsor, 0), coalesce(v_p.rating_as_recipient, 0)) * 8,
    40
  );
  -- Penalty for low review count: rating не считается без 3+ отзывов
  if coalesce(v_p.total_reviews, 0) < 3 then v_rating_pts := v_rating_pts * 0.3; end if;

  -- Account age: 1 балл за каждые 30 дней, max 15
  v_age_pts := least(coalesce(v_p.age_days, 0) / 30, 15);

  v_total := v_kyc + v_deals_pts + v_rating_pts + v_age_pts;
  return least(round(v_total)::int, 100);
end;
$$;
