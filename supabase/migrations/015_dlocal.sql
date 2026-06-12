-- 015_dlocal.sql
-- dLocal — emerging markets processor (LatAm PIX/Boleto/OXXO, Africa M-Pesa, India UPI).
-- Расширяет profiles + deals + transactions параллельно Stripe/PayPal/Adyen.

alter table public.profiles
  add column if not exists dlocal_payee_id text unique,
  add column if not exists dlocal_country text,
  add column if not exists dlocal_status text
    not null default 'none'
    check (dlocal_status in ('none','pending','active','restricted'));

alter table public.deals
  add column if not exists dlocal_payment_id text,
  add column if not exists dlocal_country text;

create index if not exists deals_dlocal_payment_idx
  on public.deals (dlocal_payment_id);

alter table public.transactions
  add column if not exists dlocal_payment_id text;

create unique index if not exists transactions_dlocal_payment_unique
  on public.transactions (dlocal_payment_id)
  where processor = 'dlocal' and dlocal_payment_id is not null;

-- payment_processor check — расширить до 'dlocal'
do $$
declare v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
     where conrelid = 'public.deals'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%payment_processor%'
  loop
    execute format('alter table public.deals drop constraint %I', v_conname);
  end loop;
end$$;

alter table public.deals
  add constraint deals_payment_processor_check
  check (payment_processor in ('stripe','paypal','adyen','dlocal','crypto'));
