-- Verification requests
create table if not exists public.verification_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  document_type text not null check (document_type in ('id_document', 'selfie', 'address_proof')),
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reviews table
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  unique(deal_id, reviewer_id)
);

-- RLS
alter table public.verification_requests enable row level security;
alter table public.reviews enable row level security;

create policy "verif_own" on public.verification_requests for all using (auth.uid() = user_id);
create policy "reviews_select" on public.reviews for select using (true);
create policy "reviews_insert" on public.reviews for insert with check (auth.uid() = reviewer_id);

-- Storage bucket for verification docs
insert into storage.buckets (id, name, public) values ('verification_docs', 'verification_docs', false)
  on conflict (id) do nothing;

create policy "verif_docs_own" on storage.objects for all using (
  bucket_id = 'verification_docs' and auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger: after verification approved → set profile.verified = true
create or replace function public.handle_verification_approved()
returns trigger as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    update public.profiles set verified = true where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_verification_approved
  after update on public.verification_requests
  for each row execute procedure public.handle_verification_approved();
