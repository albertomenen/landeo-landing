-- Opt-in: when the strict matches do not fill the daily limit, also apply to nearby (adjacent) jobs.
alter table public.auto_apply_settings add column if not exists broaden_search boolean not null default false;

-- Funnel of each search, so the user can see where jobs are filtered out.
alter table public.auto_apply_runs add column if not exists eligible_count integer not null default 0;
alter table public.auto_apply_runs add column if not exists reviewed_count integer not null default 0;
