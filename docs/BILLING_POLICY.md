# Billing policy rollout — 2026-10-21

This is an operational/legal draft, not a legal compliance certification. The owner must complete the seller's legal name, tax ID and professional address and obtain consumer-law review for Spain/EU and the other markets served. Do not invent seller identity or apply these consents retroactively.

## Customer flow

- `/refunds` and the retained version `/refunds/2026-10-21` explain cancellation, withdrawal, defects, refunds and bank disputes in Spanish and English.
- Every web checkout passes through `startStripe` and a native modal dialog. Two unchecked boxes record acceptance and an explicit request for immediate supply; neither is a blanket waiver of statutory rights. Cancelling the dialog creates no checkout. Subscription management is not gated by this dialog.
- The authenticated `create-stripe-checkout` function independently validates the current version and boolean consents. It writes `billing_acceptances` before creating a checkout. Browser-provided wording, user IDs and timestamps are not trusted.
- The stored snapshots contain the full general Terms and billing policy in the selected language, consent wording, server time, plan, and Stripe checkout/subscription references. The table has RLS and no browser grants. Acceptance is separate from analytics consent and is NOT evidence of successful applications or payment authorisation.
- The existing verified Stripe webhook retains subscription synchronisation and sends a transactional email on checkout completion, using actual Stripe totals/intervals, accepted snapshots and cancellation instructions. A pending payment is labelled pending. Existing purchases without consent metadata are not retroactively relabelled.
- Resend uses a per-checkout idempotency key; the ledger records the returned message ID and sent time. Provider acceptance is not proof of inbox delivery. An email failure causes a webhook retry after subscription synchronisation, not loss of paid access.

## Deployment

1. `node scripts/rollout-billing-policy.mjs --apply` applies ONLY `20261021120000_add_billing_acceptances.sql`; it does not apply the owner's other pending migrations. Run without the flag to verify table existence/RLS.
2. Deploy `stripe-webhook` with its existing `verify_jwt=false` setting; Stripe HMAC verification remains mandatory. Deploy `create-stripe-checkout` with JWT verification enabled.
3. Publish the web source/archive through Sites. Already-open old pages may need a refresh if the server requires the new acceptance payload.
4. Check in Stripe Dashboard that the legal business details, recognisable statement descriptor, cancellation portal and customer receipt settings are correct. The code does not change the legal identity or Stripe business settings.

## Safe tests

- Review both policy languages and use the checkout flow without entering payment details. Both boxes must initially be unchecked; one box alone cannot continue. Back/Escape closes without creating a session. Refusing analytics must not prevent acceptance. The billing portal must still open without new purchase consent.
- Use Stripe test mode for a paid end-to-end test: do not use a live customer card to test this feature. Verify the authenticated ledger row, matching checkout metadata, email containing the snapshots, subscription activation and cancellation at the paid period end. Live paid email delivery was not exercised during rollout.
- Replay a signed test checkout event: no duplicate confirmation should be sent. Test a failed email provider call to verify retries. Never manufacture usage logs for dispute evidence.

## Operations and remaining work

- Legal identity, jurisdiction-specific lawyer review and retention/deletion schedules still require owner decisions. Store evidence only as long as justified; this change does not create indefinite retention authority or an automatic purge scheduler.
- No automated refund decision or bank dispute submission is implemented. Handle requests individually, observing applicable deadlines. Never replace an obligatory cash refund with credits without consent.
- Existing real application/delivery logs remain the evidence for service actually supplied. Visual counters, prepared drafts and analytics do not establish employer receipt.
- Check webhook failures and resend delivery/bounce monitoring. The source does not configure the Stripe Dashboard or promise all disputes will be won.
