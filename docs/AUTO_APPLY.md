# Auto Apply beta

Auto Apply sends applications only to active jobs whose `job_application_targets`
record uses `mode = 'email'`, has `email_authorized = true`, and includes a
verified official source URL. It reuses `submit-application`, so subscription,
CV ownership, consent, suppression, duplicate and delivery checks remain in one
place.

## Production setup

1. Apply migrations `20261018120000_add_auto_apply.sql` and
   `20261018121500_schedule_auto_apply.sql`.
2. Generate one high-entropy value and set it as an Edge Function secret:

   ```sh
   supabase secrets set AUTO_APPLY_CRON_SECRET='<random-value>'
   ```

3. Store the exact same value in Supabase Vault:

   ```sql
   select vault.create_secret('<random-value>', 'auto_apply_cron_secret');
   ```

4. Confirm the existing function secrets are set: `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`, `OPENAI_API_KEY`, `OPENAI_COVER_LETTER_MODEL`, Stripe
   and the standard Supabase secrets.
5. Deploy the submission function and the runner. The runner must keep JWT
   verification disabled because the database scheduler authenticates with its
   dedicated secret and the function performs its own user/secret validation.

   ```sh
   supabase functions deploy submit-application
   supabase functions deploy auto-apply-runner --no-verify-jwt
   ```

The cron job wakes every 15 minutes but each active user is normally processed
at most every six hours, matching the current job-import cadence. A user can
also request an immediate run from the dashboard.

## Safe beta test

- Use one paid test account with a complete profile and confirmed email.
- Set a daily limit of 1 for the first run.
- Use a verified internal recruitment mailbox as the first target.
- Verify the application status moves through `processing`, `sent`, and
  `delivered` before raising the limit.
- Pause Auto Apply and call the scheduler once to confirm no further messages
  are sent.
