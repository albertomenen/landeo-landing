create table if not exists public.auto_apply_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  roles text[] not null default '{}',
  locations text[] not null default '{}',
  work_modes text[] not null default '{}',
  industries text[] not null default '{}',
  seniority_levels text[] not null default '{}',
  excluded_companies text[] not null default '{}',
  minimum_match smallint not null default 75 check (minimum_match between 50 and 100),
  daily_limit smallint not null default 3 check (daily_limit between 1 and 10),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auto_apply_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'skipped')),
  matched_count integer not null default 0,
  attempted_count integer not null default 0,
  sent_count integer not null default 0,
  action_required_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists auto_apply_settings_due_idx
  on public.auto_apply_settings (enabled, next_run_at)
  where enabled = true;

create index if not exists auto_apply_runs_user_started_idx
  on public.auto_apply_runs (user_id, started_at desc);

alter table public.auto_apply_settings enable row level security;
alter table public.auto_apply_runs enable row level security;

drop policy if exists "Users can read their auto apply settings" on public.auto_apply_settings;
create policy "Users can read their auto apply settings"
  on public.auto_apply_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their auto apply settings" on public.auto_apply_settings;
create policy "Users can create their auto apply settings"
  on public.auto_apply_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their auto apply settings" on public.auto_apply_settings;
create policy "Users can update their auto apply settings"
  on public.auto_apply_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their auto apply runs" on public.auto_apply_runs;
create policy "Users can read their auto apply runs"
  on public.auto_apply_runs for select
  using (auth.uid() = user_id);

revoke all on public.auto_apply_settings from anon;
revoke all on public.auto_apply_runs from anon;
grant select, insert, update on public.auto_apply_settings to authenticated;
grant select on public.auto_apply_runs to authenticated;

comment on table public.auto_apply_settings is
  'Explicit, revocable user configuration for verified-email automatic applications.';
comment on table public.auto_apply_runs is
  'Auditable execution log for the Auto Apply scheduler.';
