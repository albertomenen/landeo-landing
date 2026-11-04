import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { hasActiveStripeSubscription } from "../_shared/subscription.ts";
import {BILLING_POLICY_VERSION,billingPolicyText,stripeNoticeMessage} from "../_shared/billing-policy.ts";
import {documents} from "../../../lib/legal-documents.ts";

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

function safeReturnUrl(siteUrl: string, value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return `${siteUrl}${fallback}`;
  }
  try {
    const url = new URL(value, `${siteUrl}/`);
    return url.origin === new URL(siteUrl).origin
      ? url.toString()
      : `${siteUrl}${fallback}`;
  } catch {
    return `${siteUrl}${fallback}`;
  }
}

async function stripeRequest(path: string, body: URLSearchParams, version?: string) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(version ? { "Stripe-Version": version } : {}),
    },
    body,
  });
  const payload = await response.json() as {
    id?: string;
    url?: string;
    client_secret?: string;
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
      embedded?: boolean;
      returnTo?: string;
    };
    const plan = selectedPlan(body.plan);
    // With a Stripe TEST key (local testing) the stored customer belongs to live mode, so it is ignored and
    // nothing test-related is written back to stripe_customers or checked against live subscriptions.
    const testMode = required("STRIPE_SECRET_KEY").startsWith("sk_test_");
    const { data: existingCustomer } = testMode ? { data: null } : await admin.from("stripe_customers")
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
      if (!testMode) {
        const { error } = await admin.from("stripe_customers").upsert({
          user_id: userData.user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    }

    const siteUrl = required("SITE_URL").replace(/\/$/, "");
    if (body.action === "portal") {
      const params = new URLSearchParams();
      params.set("customer", customerId);
      params.set("return_url", safeReturnUrl(siteUrl, body.returnTo, "/app/profile"));
      const portal = await stripeRequest("/billing_portal/sessions", params);
      if (!portal.url) throw new Error("Stripe no devolvió la URL del portal.");
      return json({ url: portal.url });
    }

    if (!testMode && await hasActiveStripeSubscription(admin, userData.user.id)) {
      return json({
        message: "Ya tienes un plan de Landeo activo.",
        alreadyActive: true,
      }, 409);
    }

    const limit = applicationLimit(plan);
    const locale=body.locale==="en"?"en":"es";
    const acceptanceId=crypto.randomUUID();
    const general=documents[locale].terms;
    const termsSnapshot=[general.title,`Billing terms version: ${BILLING_POLICY_VERSION}`,general.intro,general.notice,...general.sections.flatMap(section=>[section.title,...(section.paragraphs??[]),...(section.bullets??[])])].join("\n\n");
    const noticeMessage=stripeNoticeMessage(locale,siteUrl);
    // Record of the checkout and the notice shown. No checkbox is collected, so no consent is claimed.
    const {error:acceptanceError}=await admin.from("billing_acceptances").insert({id:acceptanceId,user_id:userData.user.id,policy_version:BILLING_POLICY_VERSION,locale,plan,terms_accepted:false,immediate_start:false,consent_source:"stripe_notice",consent_text:noticeMessage,policy_snapshot:billingPolicyText(locale),terms_snapshot:termsSnapshot});
    if(acceptanceError)throw new Error(locale==="es"?"No pudimos guardar la aceptación. No se ha iniciado ningún pago; vuelve a intentarlo.":"We couldn’t record acceptance. No payment has been started; please try again.");
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer", customerId);
    params.set("client_reference_id", userData.user.id);
    params.set("line_items[0][price]", priceFor(plan));
    params.set("line_items[0][quantity]", "1");
    params.set("locale", body.locale === "es" ? "es" : "en");
    // Enabling Stripe Tax in the Dashboard does not opt individual Checkout
    // Sessions in. Stripe uses the billing address below to determine the
    // customer's tax location and carries the setting onto the subscription.
    params.set("automatic_tax[enabled]", "true");
    params.set("billing_address_collection", "required");
    params.set("customer_update[address]", "auto");
    params.set("customer_update[name]", "auto");
    params.set("tax_id_collection[enabled]", "true");
    // Popup (Embedded Checkout) only when the browser asked for it AND a publishable key is configured;
    // otherwise keep the hosted redirect so older clients and unconfigured projects keep working.
    const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? "";
    const embedded = body.embedded === true && publishableKey.startsWith("pk_");
    if (embedded) {
      params.set("ui_mode", "embedded");
      params.set("return_url", `${siteUrl}/app/jobs?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    } else {
      params.set("success_url", `${siteUrl}/app/jobs?checkout=success`);
      params.set("cancel_url", safeReturnUrl(siteUrl, body.returnTo, "/pricing?checkout=cancelled"));
    }
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
    params.set("metadata[billing_acceptance_id]",acceptanceId);
    params.set("metadata[billing_policy_version]",BILLING_POLICY_VERSION);
    params.set("custom_text[submit][message]",noticeMessage);
    params.set("subscription_data[metadata][supabase_user_id]", userData.user.id);
    params.set("subscription_data[metadata][plan]", plan);
    params.set("subscription_data[metadata][application_limit]", limit);
    params.set("subscription_data[metadata][billing_acceptance_id]",acceptanceId);
    const session = await stripeRequest("/checkout/sessions", params, embedded ? "2025-08-27.basil" : undefined);
    if (embedded ? !session.client_secret : !session.url) throw new Error("Stripe no devolvió la URL de pago.");
    const {error:linkError}=await admin.from("billing_acceptances").update({stripe_checkout_id:session.id}).eq("id",acceptanceId);
    if(linkError)throw new Error("No pudimos asociar el checkout. No se ha realizado ningún cobro.");
    return embedded ? json({ clientSecret: session.client_secret, publishableKey }) : json({ url: session.url });
  } catch (error) {
    return json({
      message: error instanceof Error
        ? error.message
        : "No pudimos iniciar el pago.",
    }, 500);
  }
});
