-- Keep the job catalogue fresh. Until now only Greenhouse had a schedule, so
-- Adzuna (the source with Mexico and Spain non-tech roles) froze on 13 Sept and
-- most of its ads had expired (their links answer 410).
--
-- To stop any of these: select cron.unschedule('<job name>');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.sync_job_sources(
  source_names text[],
  options jsonb default '{}'::jsonb
)
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
    body := jsonb_build_object('sources', to_jsonb(source_names)) || coalesce(options, '{}'::jsonb),
    timeout_milliseconds := 145000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.sync_job_sources(text[], jsonb) from public;
revoke all on function public.sync_job_sources(text[], jsonb) from anon;
revoke all on function public.sync_job_sources(text[], jsonb) from authenticated;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job
     where jobname like 'sync-adzuna-%'
        or jobname in ('sync-jobicy-daily', 'sync-getonboard-daily')
  loop
    perform cron.unschedule(existing_job);
  end loop;
end;
$$;

-- Daily: newest ads per category for the two biggest markets (16 calls each).
select cron.schedule(
  'sync-adzuna-mx-daily', '10 3 * * *',
  $$select public.sync_job_sources(array['Adzuna'], jsonb_build_object(
      'adzunaMarkets', jsonb_build_array('mx'), 'adzunaPages', 1,
      'adzunaCategories', jsonb_build_array(
        'accounting-finance-jobs','admin-jobs','customer-services-jobs','hr-jobs',
        'logistics-warehouse-jobs','sales-jobs','pr-advertising-marketing-jobs','consultancy-jobs',
        'healthcare-nursing-jobs','creative-design-jobs','legal-jobs','manufacturing-jobs',
        'it-jobs','retail-jobs','hospitality-catering-jobs','teaching-jobs')));$$
);
select cron.schedule(
  'sync-adzuna-es-daily', '25 3 * * *',
  $$select public.sync_job_sources(array['Adzuna'], jsonb_build_object(
      'adzunaMarkets', jsonb_build_array('es'), 'adzunaPages', 1,
      'adzunaCategories', jsonb_build_array(
        'accounting-finance-jobs','admin-jobs','customer-services-jobs','hr-jobs',
        'logistics-warehouse-jobs','sales-jobs','pr-advertising-marketing-jobs','consultancy-jobs',
        'healthcare-nursing-jobs','creative-design-jobs','legal-jobs','manufacturing-jobs',
        'it-jobs','retail-jobs','hospitality-catering-jobs','teaching-jobs')));$$
);

-- Sundays: deeper pass (3 pages per category) and the remaining markets.
select cron.schedule(
  'sync-adzuna-mx-weekly', '40 3 * * 0',
  $$select public.sync_job_sources(array['Adzuna'], jsonb_build_object(
      'adzunaMarkets', jsonb_build_array('mx'), 'adzunaPages', 3,
      'adzunaCategories', jsonb_build_array(
        'accounting-finance-jobs','admin-jobs','customer-services-jobs','hr-jobs',
        'logistics-warehouse-jobs','sales-jobs','pr-advertising-marketing-jobs','consultancy-jobs')));$$
);
select cron.schedule(
  'sync-adzuna-es-weekly', '50 3 * * 0',
  $$select public.sync_job_sources(array['Adzuna'], jsonb_build_object(
      'adzunaMarkets', jsonb_build_array('es'), 'adzunaPages', 3,
      'adzunaCategories', jsonb_build_array(
        'accounting-finance-jobs','admin-jobs','customer-services-jobs','hr-jobs',
        'logistics-warehouse-jobs','sales-jobs','pr-advertising-marketing-jobs','consultancy-jobs')));$$
);
select cron.schedule(
  'sync-adzuna-all-weekly', '5 4 * * 0',
  $$select public.sync_job_sources(array['Adzuna']);$$
);

-- Remote roles open to Latin America and Latin American boards.
select cron.schedule('sync-jobicy-daily', '20 4 * * *', $$select public.sync_job_sources(array['Jobicy']);$$);
select cron.schedule('sync-getonboard-daily', '35 4 * * *', $$select public.sync_job_sources(array['Get on Board']);$$);
