#!/usr/bin/env bash
# Receives Stripe TEST webhooks locally (Stripe CLI -> local stripe-webhook function).
# Needed so a test payment activates the subscription. Uses the real database: use a test account.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
case "$STRIPE_SECRET_KEY" in sk_test_*) ;; *) echo "STRIPE_SECRET_KEY is not a test key; refusing to run." >&2; exit 1;; esac
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" STRIPE_API_KEY="$STRIPE_SECRET_KEY"
export STRIPE_WEBHOOK_SECRET="$(stripe listen --print-secret)"
deno run --allow-net --allow-env --allow-read scripts/local-webhook-runner.ts &
trap 'kill %1 2>/dev/null' EXIT
sleep 2
exec stripe listen --forward-to http://127.0.0.1:8001
