#!/usr/bin/env bash
# Runs create-stripe-checkout locally with the Stripe TEST keys from .env.local.
# The real database is used, so sign in with a test account.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
case "$STRIPE_SECRET_KEY" in sk_test_*) ;; *) echo "STRIPE_SECRET_KEY is not a test key; refusing to run." >&2; exit 1;; esac
exec deno run --allow-net --allow-env --allow-read supabase/functions/create-stripe-checkout/index.ts
