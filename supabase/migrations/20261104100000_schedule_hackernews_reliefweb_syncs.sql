-- Daily sync of the two sources that publish real application emails.
-- HackerNews: the monthly "Who is hiring?" thread keeps receiving posts for the first weeks.
-- ReliefWeb: humanitarian jobs (varied roles, many remote); needs an approved RELIEFWEB_APP_NAME.
-- To stop either: select cron.unschedule('sync-hackernews-daily');
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname in ('sync-hackernews-daily', 'sync-reliefweb-daily')
  loop
    perform cron.unschedule(existing_job);
  end loop;
end $$;

select cron.schedule('sync-hackernews-daily', '15 5 * * *', $$select public.sync_job_sources(array['HackerNews'])$$);
select cron.schedule('sync-reliefweb-daily', '30 5 * * *', $$select public.sync_job_sources(array['ReliefWeb'])$$);
