create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.sync_greenhouse_jobs(board_tokens text[])
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  import_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into import_secret
    from vault.decrypted_secrets
   where name = 'import_jobs_secret'
   limit 1;

  if import_secret is null then
    raise exception 'Missing vault secret import_jobs_secret';
  end if;

  select net.http_post(
    url := 'https://eldzbshnxvvaitgvgzbu.supabase.co/functions/v1/import-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-import-secret', import_secret
    ),
    body := jsonb_build_object(
      'sources', jsonb_build_array('Greenhouse'),
      'boards', to_jsonb(board_tokens)
    ),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.sync_greenhouse_jobs(text[]) from public;
revoke all on function public.sync_greenhouse_jobs(text[]) from anon;
revoke all on function public.sync_greenhouse_jobs(text[]) from authenticated;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname like 'sync-greenhouse-jobs%'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end;
$$;

select cron.schedule(
  'sync-greenhouse-jobs-a',
  '17 */6 * * *',
  $$select public.sync_greenhouse_jobs(array['stripe','cloudflare','celonis','figma','workato','cabify','wallapop']);$$
);

select cron.schedule(
  'sync-greenhouse-jobs-b',
  '22 */6 * * *',
  $$select public.sync_greenhouse_jobs(array['anthropic','elastic','samsara','coinbase','lyft','aircallioinc','monzo','wise']);$$
);

select cron.schedule(
  'sync-greenhouse-jobs-c',
  '27 */6 * * *',
  $$select public.sync_greenhouse_jobs(array['datadog','mongodb','canonical','gitlab','remotecom','reddit','twilio','dropbox','clarityai']);$$
);

select cron.schedule(
  'sync-greenhouse-jobs-d',
  '32 */6 * * *',
  $$select public.sync_greenhouse_jobs(array['speechify','scaleai','robinhood','pinterest','asana','duolingo','discord','banyansoftware','neoris','soficonv','vonage','typeform']);$$
);
