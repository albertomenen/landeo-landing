import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

type Plan = "starter" | "pro" | "sprint";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

function selectedPlan(value: unknown): Plan {
  return value === "starter" || value === "sprint" ? value : "pro";
}

function priceFor(plan: Plan) {
  const keys: Record<Plan, string> = {
    starter: "STRIPE_PRICE_STARTER_ID",
    pro: "STRIPE_PRICE_PRO_ID",
    sprint: "STRIPE_PRICE_SPRINT_ID",
  };
  return required(keys[plan]);
}

function applicationLimit(plan: Plan) {
  return plan === "starter" ? "50" : plan === "sprint" ? "600" : "200";
}

async function stripeRequest(path: string, body: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json() as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Stripe respondió ${response.status}`,
    );
  }
  return payload;
}

async function stripeGet(path: string, query: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1${path}?${query}`, {
    headers: { Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}` },
  });
  const payload = await response.json() as {
    data?: Array<{ id: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Stripe respondió ${response.status}`,
    );
  }
  return payload;
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
    const anonKey = required("SUPABASE_ANON_KEY");
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: userData, error: userError } = await userClient.auth
      .getUser();
    if (userError || !userData.user?.email) {
      return json({ message: "Sesión no válida." }, 401);
    }

    const body = await request.json().catch(() => ({})) as {
      action?: "checkout" | "portal";
      promotionCode?: string;
      plan?: Plan;
      locale?: "es" | "en";
    };
    const plan = selectedPlan(body.plan);
    const { data: existingCustomer } = await admin.from("stripe_customers")
      .select("stripe_customer_id").eq("user_id", userData.user.id)
      .maybeSingle();
    let customerId = existingCustomer?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const params = new URLSearchParams();
      params.set("email", userData.user.email);
      params.set("metadata[supabase_user_id]", userData.user.id);
      const customer = await stripeRequest("/customers", params);
      if (!customer.id) {
        throw new Error("Stripe no devolvió un cliente válido.");
      }
      customerId = customer.id;
      const { error } = await admin.from("stripe_customers").upsert({
        user_id: userData.user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    const siteUrl = required("SITE_URL").replace(/\/$/, "");
    if (body.action === "portal") {
      const params = new URLSearchParams();
      params.set("customer", customerId);
      params.set("return_url", `${siteUrl}/app/profile`);
      const portal = await stripeRequest("/billing_portal/sessions", params);
      if (!portal.url) throw new Error("Stripe no devolvió la URL del portal.");
      return json({ url: portal.url });
    }

    const { data: activeSubscription } = await admin.from(
      "stripe_subscriptions",
    )
      .select("status,current_period_end").eq("user_id", userData.user.id)
      .in("status", ["active", "trialing"]).maybeSingle();
    if (
      activeSubscription &&
      (!activeSubscription.current_period_end ||
        new Date(activeSubscription.current_period_end).getTime() > Date.now())
    ) {
      return json({
        message: "Ya tienes un plan de Landeo activo.",
        alreadyActive: true,
      }, 409);
    }

    const limit = applicationLimit(plan);
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer", customerId);
    params.set("client_reference_id", userData.user.id);
    params.set("line_items[0][price]", priceFor(plan));
    params.set("line_items[0][quantity]", "1");
    params.set("locale", body.locale === "es" ? "es" : "en");
    params.set("success_url", `${siteUrl}/app/jobs?checkout=success`);
    params.set("cancel_url", `${siteUrl}/pricing?checkout=cancelled`);
    const promotionCode = String(body.promotionCode ?? "").trim().toUpperCase();
    if (promotionCode) {
      const promotionQuery = new URLSearchParams();
      promotionQuery.set("code", promotionCode);
      promotionQuery.set("active", "true");
      promotionQuery.set("limit", "1");
      const promotion = await stripeGet("/promotion_codes", promotionQuery);
      const promotionId = promotion.data?.[0]?.id;
      if (promotionId) params.set("discounts[0][promotion_code]", promotionId);
      else params.set("allow_promotion_codes", "true");
    } else {
      params.set("allow_promotion_codes", "true");
    }
    params.set("metadata[supabase_user_id]", userData.user.id);
    params.set("metadata[plan]", plan);
    params.set("metadata[application_limit]", limit);
    params.set("subscription_data[metadata][supabase_user_id]", userData.user.id);
    params.set("subscription_data[metadata][plan]", plan);
    params.set("subscription_data[metadata][application_limit]", limit);
    const session = await stripeRequest("/checkout/sessions", params);
    if (!session.url) throw new Error("Stripe no devolvió la URL de pago.");
    return json({ url: session.url });
  } catch (error) {
    return json({
      message: error instanceof Error
        ? error.message
        : "No pudimos iniciar el pago.",
    }, 500);
  }
});
