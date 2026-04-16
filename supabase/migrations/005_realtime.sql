-- Enable realtime for all main tables
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.transactions;

-- Add updated_at trigger для deals
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deals_updated_at
  before update on public.deals
  for each row execute procedure public.handle_updated_at();

-- Add deals_count trigger на profiles
create or replace function public.update_deals_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set deals_count = deals_count + 1 where id = new.creator_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set deals_count = greatest(0, deals_count - 1) where id = old.creator_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_deal_created
  after insert or delete on public.deals
  for each row execute procedure public.update_deals_count();

-- Add total_helped trigger
create or replace function public.update_total_helped()
returns trigger as $$
begin
  if new.type = 'deal_payment' and new.status = 'completed' then
    -- find deal creator
    update public.profiles
    set total_helped = total_helped + new.amount
    where id = (select creator_id from public.deals where id = new.deal_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_transaction_completed
  after insert on public.transactions
  for each row execute procedure public.update_total_helped();
