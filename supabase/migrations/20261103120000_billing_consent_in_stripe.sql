-- Checkout no longer collects a consent checkbox: a passive notice is shown under Stripe's
-- pay button. Rows are a record of the checkout and notice shown, so they are no longer
-- forced to terms_accepted / immediate_start = true.
alter table public.billing_acceptances drop constraint if exists billing_acceptances_terms_accepted_check;
alter table public.billing_acceptances drop constraint if exists billing_acceptances_immediate_start_check;
alter table public.billing_acceptances alter column terms_accepted set default false;
alter table public.billing_acceptances alter column immediate_start set default false;
alter table public.billing_acceptances add column if not exists consent_source text not null default 'modal';
