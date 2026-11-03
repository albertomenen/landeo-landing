# Billing policy rollout — 2026-10-21

This is an operational/legal draft, not a legal compliance certification. The owner must complete the seller's legal name, tax ID and professional address and obtain consumer-law review for Spain/EU and the other markets served. Do not invent seller identity or apply these consents retroactively.

## Customer flow

- `/refunds` and the retained version `/refunds/2026-10-21` explain cancellation, withdrawal, defects, refunds and bank disputes in Spanish and English.
- There is no consent modal and no checkbox (removed 2026-11-03 to avoid friction at purchase). Stripe Checkout shows a passive notice under the pay button (`custom_text[submit]`, built by `stripeNoticeMessage`) with renewal information and links to the Terms and payments policy. The owner accepted the legal trade-off: no explicit request for immediate supply or acknowledgement is collected, so the full EU/Spain 14-day withdrawal right applies without proportional deduction for service already used.
- `create-stripe-checkout` still writes a `billing_acceptances` row (flags `false`, `consent_source=stripe_notice`) as a record of the checkout and the notice shown; it does not claim consent. The webhook marks it completed and sends the confirmation email with the conditions. Rows from before 2026-11-03 came from the old modal (`consent_source=modal`).
- The stored snapshots contain the full general Terms and billing policy in the selected language, consent wording, server time, plan, and Stripe checkout/subscription references. The table has RLS and no browser grants. Acceptance is separate from analytics consent and is NOT evidence of successful applications or payment authorisation.
- The existing verified Stripe webhook retains subscription synchronisation and sends a transactional email on checkout completion, using actual Stripe totals/intervals, accepted snapshots and cancellation instructions. A pending payment is labelled pending. Existing purchases without consent metadata are not retroactively relabelled.
- Resend uses a per-checkout idempotency key; the ledger records the returned message ID and sent time. Provider acceptance is not proof of inbox delivery. An email failure causes a webhook retry after subscription synchronisation, not loss of paid access.

## Deployment

0. Apply `20261103120000_billing_consent_in_stripe.sql` before deploying the new functions (it relaxes the `true` checks and adds `consent_source`).
1. `node scripts/rollout-billing-policy.mjs --apply` applies ONLY `20261021120000_add_billing_acceptances.sql`; it does not apply the owner's other pending migrations. Run without the flag to verify table existence/RLS.
2. Deploy `stripe-webhook` with its existing `verify_jwt=false` setting; Stripe HMAC verification remains mandatory. Deploy `create-stripe-checkout` with JWT verification enabled.
3. Publish the web source/archive through Sites. Already-open old pages may need a refresh if the server requires the new acceptance payload.
4. Check in Stripe Dashboard that the legal business details, recognisable statement descriptor, cancellation portal and customer receipt settings are correct. The code does not change the legal identity or Stripe business settings.

## Safe tests

- Review both policy languages and use the checkout flow without entering payment details. Checkout must show the passive notice and no checkbox. Refusing analytics must not prevent acceptance. The billing portal must still open without new purchase consent.
- Use Stripe test mode for a paid end-to-end test: do not use a live customer card to test this feature. Verify the authenticated ledger row, matching checkout metadata, email containing the snapshots, subscription activation and cancellation at the paid period end. Live paid email delivery was not exercised during rollout.
- Replay a signed test checkout event: no duplicate confirmation should be sent. Test a failed email provider call to verify retries. Never manufacture usage logs for dispute evidence.

## Operations and remaining work

- Legal identity, jurisdiction-specific lawyer review and retention/deletion schedules still require owner decisions. Store evidence only as long as justified; this change does not create indefinite retention authority or an automatic purge scheduler.
- No automated refund decision or bank dispute submission is implemented. Handle requests individually, observing applicable deadlines. Never replace an obligatory cash refund with credits without consent.
- Existing real application/delivery logs remain the evidence for service actually supplied. Visual counters, prepared drafts and analytics do not establish employer receipt.
- Check webhook failures and resend delivery/bounce monitoring. The source does not configure the Stripe Dashboard or promise all disputes will be won.
