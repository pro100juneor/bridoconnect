-- 025_fx_cron.sql
-- Daily refresh of currency_rates via the refresh-fx-rates edge function.
-- NOTE: the function URL + anon key below are ENVIRONMENT-SPECIFIC (staging).
-- For another project, update the url/apikey (anon key is public-safe).
-- Wrapped so a project without pg_cron/pg_net won't fail the migration.

do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  if exists (select 1 from cron.job where jobname = 'refresh-fx-daily') then
    perform cron.unschedule('refresh-fx-daily');
  end if;

  perform cron.schedule(
    'refresh-fx-daily',
    '0 6 * * *',
    $cron$
      select net.http_post(
        url := 'https://mlgyuonypcyseryrmcms.supabase.co/functions/v1/refresh-fx-rates',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZ3l1b255cGN5c2VyeXJtY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjQ4NDEsImV4cCI6MjEwMDA0MDg0MX0.pPK5slmpqmxeHTaYC1HJvyKiDOtaFlKoxyLYoGH3wjE'
        )
      );
    $cron$
  );
exception when others then
  raise notice 'fx cron setup skipped: %', sqlerrm;
end $$;
