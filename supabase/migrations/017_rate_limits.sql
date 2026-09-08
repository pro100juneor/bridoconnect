-- Edge function rate limiting: fixed-window counter table + upsert RPC.
-- Используется _shared/rate-limit.ts из edge functions.

create table if not exists public.edge_rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (key, window_start)
);

create index if not exists edge_rate_limits_window_idx
  on public.edge_rate_limits (window_start);

-- RPC: atomically increment counter for a (key, window) pair.
-- Returns { count int } - текущее значение после инкремента.
create or replace function public.edge_rate_limit_hit(
  p_key text,
  p_window_start timestamptz,
  p_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.edge_rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
    do update set count = public.edge_rate_limits.count + 1,
                  updated_at = now()
  returning count into v_count;

  return jsonb_build_object('count', v_count, 'limit', p_limit);
end;
$$;

grant execute on function public.edge_rate_limit_hit(text, timestamptz, integer) to service_role;

-- Cleanup старых окон (> 24h) — вызывается pg_cron если доступен, иначе manually
create or replace function public.edge_rate_limits_cleanup() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.edge_rate_limits where window_start < now() - interval '24 hours';
$$;

grant execute on function public.edge_rate_limits_cleanup() to service_role;

-- RLS: только service_role может читать/писать
alter table public.edge_rate_limits enable row level security;

drop policy if exists "edge_rate_limits_service_only" on public.edge_rate_limits;
create policy "edge_rate_limits_service_only"
  on public.edge_rate_limits
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
