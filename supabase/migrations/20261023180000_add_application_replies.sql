-- Replies from companies to application emails, received through Resend inbound
-- on reply.getlandeo.com. Each application gets an unguessable token that is
-- embedded in its Reply-To address (apply+<token>@reply.getlandeo.com).

alter table public.applications
  add column if not exists reply_token text;

update public.applications
   set reply_token = replace(gen_random_uuid()::text, '-', '')
 where reply_token is null;

alter table public.applications
  alter column reply_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column reply_token set not null;

create unique index if not exists applications_reply_token_key
  on public.applications (reply_token);

-- Only the minimum is stored: who answered, the subject, the kind and a short
-- preview. The full message is forwarded to the candidate and not kept here.
create table if not exists public.application_replies (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reply', 'auto_reply', 'bounce')),
  sender_name text,
  sender_domain text,
  subject text,
  preview text,
  received_at timestamptz not null default now(),
  resend_email_id text not null unique,
  forwarded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists application_replies_application_idx
  on public.application_replies (application_id, received_at desc);
create index if not exists application_replies_user_idx
  on public.application_replies (user_id, received_at desc);

alter table public.application_replies enable row level security;

drop policy if exists "users read own application replies" on public.application_replies;
create policy "users read own application replies"
  on public.application_replies
  for select
  to authenticated
  using (user_id = auth.uid());
