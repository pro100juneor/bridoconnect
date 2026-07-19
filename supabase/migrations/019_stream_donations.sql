-- 019_stream_donations.sql
-- Live-stream donations: destination-charge to the host's Connect account,
-- webhook increments streams.raised. Mirrors the deal donation flow.

-- Atomic increment of a stream's raised total (called by stripe-webhook).
create or replace function public.increment_stream_raised(p_stream_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.streams
     set raised = raised + p_amount
   where id = p_stream_id;
end;
$$;

grant execute on function public.increment_stream_raised(uuid, numeric) to service_role;

-- Widen transactions.type to include stream_donation.
do $$
declare
  v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
     where conrelid = 'public.transactions'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.transactions drop constraint %I', v_conname);
  end loop;
end$$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('deposit','withdrawal','deal_payment','refund','escrow_release','platform_fee','stream_donation'));
