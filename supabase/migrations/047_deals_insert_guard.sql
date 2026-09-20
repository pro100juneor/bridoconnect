-- H-11: deals_insert RLS only checks creator_id, and protect_deals_columns fires
-- only BEFORE UPDATE — so a creator could INSERT a deal with a fabricated `raised`
-- total, a preset status/sponsor_id, or pre-set escrow_released_at/refunded_at and
-- payment references. This BEFORE INSERT trigger forces those platform-owned
-- columns to their safe initial values for any non-privileged insert. A creator
-- still sets title/description/category/amount/currency/urgent (the "ask").
create or replace function public.enforce_deals_insert_defaults()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_admin() then
    return new;
  end if;
  new.raised := 0;
  new.status := 'pending';
  new.sponsor_id := null;
  new.escrow_released_at := null;
  new.refunded_at := null;
  new.payment_processor := null;
  new.stripe_payment_intent_id := null;
  new.stripe_session_id := null;
  new.stripe_transfer_id := null;
  new.paypal_order_id := null;
  new.paypal_capture_id := null;
  new.adyen_psp_reference := null;
  new.dlocal_payment_id := null;
  new.wise_transfer_id := null;
  new.crypto_invoice_id := null;
  return new;
end;
$$;

drop trigger if exists enforce_deals_insert_defaults on public.deals;
create trigger enforce_deals_insert_defaults
  before insert on public.deals
  for each row execute function public.enforce_deals_insert_defaults();
