import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";
import {sendBillingConfirmation} from "../_shared/billing-confirmation.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function verifyStripeSignature(payload: string, header: string) {
  const fields = header.split(",").map((part) => part.trim().split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) =>
    value
  );
  if (
    !timestamp || !signatures.length ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
  ) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(required("STRIPE_WEBHOOK_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = hex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    ),
  );
  return signatures.some((signature) => safeEqual(signature, digest));
}

async function retrieveSubscription(subscriptionId: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${
      encodeURIComponent(subscriptionId)
    }`,
    {
      headers: { Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}` },
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Stripe respondió ${response.status}`,
    );
  }
  return payload;
}

function id(value: unknown) {
  return typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
    ? String((value as { id: unknown }).id)
    : null;
}

async function syncSubscription(
  admin: any,
  subscription: any,
  fallbackUserId?: string | null,
) {
  const customerId = id(subscription.customer);
  const subscriptionId = id(subscription);
  if (!customerId || !subscriptionId) {
    throw new Error("Suscripción de Stripe incompleta.");
  }
  const { data: customer } = await admin.from("stripe_customers").select(
    "user_id",
  ).eq("stripe_customer_id", customerId).maybeSingle();
  const userId = subscription.metadata?.supabase_user_id || fallbackUserId ||
    customer?.user_id;
  if (!userId) {
    throw new Error("No se pudo asociar la suscripción con un usuario.");
  }
  const item = subscription.items?.data?.[0];
  const periodEnd = subscription.current_period_end ?? item?.current_period_end;
  const { error } = await admin.from("stripe_subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    price_id: id(item?.price),
    status: subscription.status,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ message: "Método no permitido." }, 405);
  }
  try {
    const payload = await request.text();
    const signature = request.headers.get("Stripe-Signature") || "";
    if (!await verifyStripeSignature(payload, signature)) {
      return json({ message: "Firma no válida." }, 400);
    }
    const event = JSON.parse(payload) as {
      id: string;
      type: string;
      data: { object: any };
    };
    const admin = createClient(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const { data: duplicate } = await admin.from("stripe_webhook_events")
      .select("event_id").eq("event_id", event.id).maybeSingle();
    if (duplicate) return json({ received: true, duplicate: true });

    const object = event.data.object;
    if (["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) {
      const userId = object.client_reference_id ||
        object.metadata?.supabase_user_id;
      const customerId = id(object.customer);
      if (userId && customerId) {
        await admin.from("stripe_customers").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
      }
      const subscriptionId = id(object.subscription);
      if (subscriptionId) {
        const subscription=await retrieveSubscription(subscriptionId);
        await syncSubscription(
          admin,
          subscription,
          userId,
        );
        await sendBillingConfirmation(admin,object,subscription);
      }
    } else if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
      ].includes(event.type)
    ) {
      await syncSubscription(admin, object);
    } else if (
      ["invoice.paid", "invoice.payment_failed"].includes(event.type)
    ) {
      const subscriptionId = id(object.subscription);
      if (subscriptionId) {
        await syncSubscription(
          admin,
          await retrieveSubscription(subscriptionId),
        );
      }
    }

    const { error } = await admin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
    if (error && error.code !== "23505") throw error;
    return json({ received: true });
  } catch (error) {
    return json({
      message: error instanceof Error
        ? error.message
        : "No se pudo procesar el webhook.",
    }, 500);
  }
});
