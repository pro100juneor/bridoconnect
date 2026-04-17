import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SQL_001 = `-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default 'Користувач',
  city text,
  country text,
  bio text,
  avatar_url text,
  role text not null default 'sponsor' check (role in ('sponsor', 'recipient', 'admin')),
  verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  deals_count integer not null default 0,
  total_helped numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Deals table
create table if not exists public.deals (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  sponsor_id uuid references public.profiles(id),
  title text not null,
  description text not null default '',
  category text not null default 'Інше',
  amount numeric(10,2) not null default 0,
  raised numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','active','completed','cancelled','disputed')),
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- Transactions table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deal_id uuid references public.deals(id),
  amount numeric(10,2) not null,
  type text not null check (type in ('deposit','withdrawal','deal_payment','refund')),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.messages enable row level security;
alter table public.transactions enable row level security;

-- Profiles: all can read, only own user can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Deals: all can read, authenticated can insert
create policy "deals_select" on public.deals for select using (true);
create policy "deals_insert" on public.deals for insert with check (auth.uid() = creator_id);
create policy "deals_update" on public.deals for update using (auth.uid() = creator_id or auth.uid() = sponsor_id);

-- Messages: only deal participants
create policy "messages_select" on public.messages for select using (
  auth.uid() = sender_id or
  auth.uid() in (select creator_id from public.deals where id = deal_id) or
  auth.uid() in (select sponsor_id from public.deals where id = deal_id)
);
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);

-- Transactions: only own
create policy "transactions_select" on public.transactions for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Користувач'),
    coalesce(new.raw_user_meta_data->>'role', 'sponsor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
`;
const SQL_002 = `-- Verification requests
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
`;
const SQL_003 = `create table if not exists public.streams (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text,
  goal_amount numeric(10,2),
  raised numeric(10,2) not null default 0,
  room_name text not null unique,
  status text not null default 'live' check (status in ('live', 'ended')),
  viewer_count integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.streams enable row level security;
create policy "streams_select" on public.streams for select using (true);
create policy "streams_insert" on public.streams for insert with check (auth.uid() = host_id);
create policy "streams_update" on public.streams for update using (auth.uid() = host_id);

alter publication supabase_realtime add table public.streams;
`;
const SQL_004 = `-- Avatar storage bucket
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Anyone can view avatars (public bucket)
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Only owner can upload their avatar
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Increment function for deal raised amount
create or replace function public.increment_raised(deal_id uuid, amount numeric)
returns void as $$
begin
  update public.deals
  set raised = raised + amount,
      updated_at = now()
  where id = deal_id;
end;
$$ language plpgsql security definer;
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Only allow with secret key
  const authHeader = req.headers.get("Authorization");
  const secret = Deno.env.get("INIT_SECRET") || "bridoconnect-init-2026";
  
  if (!authHeader || !authHeader.includes(secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, headers: corsHeaders 
    });
  }

  const results = [];

  try {
    // Execute each migration using pg directly via Deno postgres
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not set");
    
    const client = new Client(dbUrl);
    await client.connect();

    for (const [name, sql] of [
      ["001_initial_schema", SQL_001],
      ["002_verification_reviews", SQL_002],
      ["003_streams", SQL_003],
      ["004_storage", SQL_004],
    ]) {
      try {
        await client.queryArray(sql);
        results.push({ migration: name, status: "success" });
        console.log(`✓ ${name}`);
      } catch (err) {
        results.push({ migration: name, status: "error", error: err.message });
        console.error(`✗ ${name}: ${err.message}`);
      }
    }

    await client.end();
    
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, results }), {
      status: 500, headers: corsHeaders
    });
  }
});
