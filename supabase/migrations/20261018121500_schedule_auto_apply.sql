create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.run_auto_apply_scheduler()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  scheduler_secret text;
  request_id bigint;
begin
  select decrypted_secret into scheduler_secret
    from vault.decrypted_secrets where name = 'auto_apply_cron_secret' limit 1;
  if scheduler_secret is null then
    raise exception 'Missing vault secret auto_apply_cron_secret';
  end if;

  select net.http_post(
    url := 'https://eldzbshnxvvaitgvgzbu.supabase.co/functions/v1/auto-apply-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-auto-apply-secret', scheduler_secret
    ),
    body := jsonb_build_object('source', 'scheduler'),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.run_auto_apply_scheduler() from public;
revoke all on function public.run_auto_apply_scheduler() from anon;
revoke all on function public.run_auto_apply_scheduler() from authenticated;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'run-auto-apply'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end;
$$;

select cron.schedule(
  'run-auto-apply',
  '*/15 * * * *',
  $$select public.run_auto_apply_scheduler();$$
);
