import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

async function deleteStripeCustomer(customerId: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}` },
    },
  );
  if (response.ok || response.status === 404) return;
  const payload = await response.json().catch(() => null) as {
    error?: { message?: string };
  } | null;
  throw new Error(
    payload?.error?.message || "No se pudo cancelar la suscripción en Stripe.",
  );
}

async function removeFolder(admin: any, bucket: string, userId: string) {
  const paths: string[] = [];
  for (let offset = 0;; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list(userId, {
      limit: 100,
      offset,
    });
    if (error) throw error;
    paths.push(...(data ?? []).map((item: { name: string }) => `${userId}/${item.name}`));
    if ((data?.length ?? 0) < 100) break;
  }
  if (!paths.length) return;
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ message: "Método no permitido." }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ message: "Sesión no válida." }, 401);

    const url = required("SUPABASE_URL");
    const userClient = createClient(url, required("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ message: "Sesión no válida." }, 401);
    }
    const userId = userData.user.id;

    const { data: stripeCustomer, error: stripeReadError } = await admin
      .from("stripe_customers").select("stripe_customer_id")
      .eq("user_id", userId).maybeSingle();
    if (stripeReadError) throw stripeReadError;
    if (stripeCustomer?.stripe_customer_id) {
      await deleteStripeCustomer(stripeCustomer.stripe_customer_id);
    }

    await Promise.all([
      removeFolder(admin, "cvs", userId),
      removeFolder(admin, "application-receipts", userId),
    ]);

    const userTables = [
      "messages",
      "application_events",
      "applications",
      "swipes",
      "push_tokens",
      "user_integrations",
      "oauth_states",
      "stripe_subscriptions",
      "stripe_customers",
    ];
    for (const table of userTables) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) throw error;
    }
    const { error: profileError } = await admin.from("profiles").delete()
      .eq("id", userId);
    if (profileError) throw profileError;

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    return json({ deleted: true });
  } catch (error) {
    console.error("delete-account", error);
    return json({
      message: error instanceof Error
        ? error.message
        : "No se pudo eliminar la cuenta.",
    }, 500);
  }
});
