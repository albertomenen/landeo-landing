-- Lever and Ashby had no schedule, so their offers froze and expired offers kept
-- showing. Every run now also closes the offers that left the company's board.
--
-- To stop either: select cron.unschedule('sync-lever-daily');

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname in ('sync-lever-daily', 'sync-ashby-daily')
  loop
    perform cron.unschedule(existing_job);
  end loop;
end;
$$;

select cron.schedule('sync-ashby-daily', '45 4 * * *', $$select public.sync_job_sources(array['Ashby']);$$);
select cron.schedule('sync-lever-daily', '55 4 * * *', $$select public.sync_job_sources(array['Lever']);$$);
