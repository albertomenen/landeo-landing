import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type SubscriptionRow = { status: string; current_period_end: string | null };

// A user can briefly hold more than one live row (upgrade, trial plus paid
// plan). `.maybeSingle()` errors in that case, so read every live row and
// grant access when any of them is still current. Query errors are thrown so
// a transient failure is never mistaken for "no subscription".
export async function hasActiveStripeSubscription(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.from("stripe_subscriptions")
    .select("status,current_period_end").eq("user_id", userId)
    .in("status", ["active", "trialing"]);
  if (error) throw error;
  const now = Date.now();
  return ((data ?? []) as SubscriptionRow[]).some((row) => !row.current_period_end || Date.parse(row.current_period_end) > now);
}
