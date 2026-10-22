create table if not exists public.billing_acceptances (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  policy_version text not null,
  locale text not null check (locale in ('es','en')),
  plan text not null check (plan in ('starter','pro','sprint')),
  terms_accepted boolean not null check (terms_accepted),
  immediate_start boolean not null check (immediate_start),
  consent_text text not null,
  policy_snapshot text not null,
  terms_snapshot text not null,
  accepted_at timestamptz not null default now(),
  stripe_checkout_id text unique,
  stripe_subscription_id text,
  completed_at timestamptz,
  confirmation_sent_at timestamptz,
  confirmation_message_id text
);
create index if not exists billing_acceptances_user_time_idx on public.billing_acceptances(user_id,accepted_at desc);
alter table public.billing_acceptances enable row level security;
revoke all on public.billing_acceptances from anon,authenticated;
grant all on public.billing_acceptances to service_role;
comment on table public.billing_acceptances is 'Server-written billing consent and immutable contract snapshots. Not payment authorisation or proof of service delivery. Retained only as necessary for contract and legal claims; no analytics consent required.';
