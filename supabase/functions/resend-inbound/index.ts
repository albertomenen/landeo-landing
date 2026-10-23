/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase Edge Function rows are runtime-shaped. */
import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";
import { sendApplicationPush } from "../_shared/push.ts";
import {
  classifyInbound,
  DEFAULT_REPLY_DOMAIN,
  inboundEventMessage,
  parseReplyToken,
  parseSender,
  previewFromText,
} from "../_shared/inbound-reply.ts";

// Receives `email.received` from Resend for replies that companies send to
// apply+<token>@reply.getlandeo.com. The Resend account is shared with other
// products, so anything that is not addressed to a known token is ignored.

type ReceivedEvent = {
  type: string;
  data?: { email_id?: string; from?: string; to?: string[]; subject?: string };
};

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function encodeBase64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

async function verifySignature(payload: string, id: string, timestamp: string, signatureHeader: string) {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 5 * 60) return false;
  const secret = required("RESEND_INBOUND_WEBHOOK_SECRET").replace(/^whsec_/, "");
  const key = await crypto.subtle.importKey("raw", decodeBase64(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = encodeBase64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`)));
  return signatureHeader.split(/\s+/).some((item) => {
    const [version, signature] = item.split(",", 2);
    return version === "v1" && Boolean(signature) && constantTimeEqual(signature, expected);
  });
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Reading received emails needs a Resend key with more than "sending access".
// Keep it separate from RESEND_API_KEY, which only sends.
const inboundApiKey = () => Deno.env.get("RESEND_INBOUND_API_KEY") || required("RESEND_API_KEY");

async function fetchReceived(emailId: string) {
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${inboundApiKey()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Resend no devolvió el correo recibido (${response.status}).`);
  return await response.json() as {
    from?: string;
    subject?: string;
    text?: string | null;
    html?: string | null;
    headers?: unknown;
    reply_to?: string[] | string | null;
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, message: "Método no permitido." }, 405);
  const payload = await request.text();
  const webhookId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!webhookId || !timestamp || !signature) {
    return json({ ok: false, message: "Faltan cabeceras de firma." }, 400);
  }

  try {
    if (!await verifySignature(payload, webhookId, timestamp, signature)) {
      return json({ ok: false, message: "Firma no válida." }, 401);
    }
    const event = JSON.parse(payload) as ReceivedEvent;
    const emailId = String(event.data?.email_id ?? "");
    if (event.type !== "email.received" || !emailId) return json({ ok: true, ignored: true });

    const replyDomain = (Deno.env.get("REPLY_DOMAIN") ?? DEFAULT_REPLY_DOMAIN).trim().toLowerCase();
    const token = parseReplyToken(event.data?.to, replyDomain);
    if (!token) return json({ ok: true, ignored: true });

    const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: application, error: applicationError } = await admin.from("applications")
      .select("id,user_id,job_id").eq("reply_token", token).maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return json({ ok: true, ignored: true });

    const { data: duplicate } = await admin.from("application_replies").select("id").eq("resend_email_id", emailId).maybeSingle();
    if (duplicate) return json({ ok: true, duplicate: true });

    // Cheap protection against floods to a single address.
    const { count: recent } = await admin.from("application_replies").select("id", { count: "exact", head: true })
      .eq("application_id", application.id).gte("received_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((recent ?? 0) >= 20) return json({ ok: true, ignored: true, reason: "rate_limited" });

    const [{ data: job }, { data: profile }] = await Promise.all([
      admin.from("jobs").select("title,company").eq("id", application.job_id).maybeSingle(),
      admin.from("profiles").select("email").eq("id", application.user_id).maybeSingle(),
    ]);
    const company = String(job?.company ?? "La empresa");
    const title = String(job?.title ?? "tu candidatura");

    let received: Awaited<ReturnType<typeof fetchReceived>> | null = null;
    try {
      received = await fetchReceived(emailId);
    } catch (error) {
      // Keep going with the metadata from the webhook so the reply is not lost.
      console.error("resend-inbound content", error);
    }
    const fromValue = received?.from ?? event.data?.from ?? "";
    const subject = String(received?.subject ?? event.data?.subject ?? "").slice(0, 300);
    const sender = parseSender(fromValue);
    // Never process what we sent ourselves (forwards use this domain).
    if (sender.domain === replyDomain) return json({ ok: true, ignored: true, reason: "own_message" });

    const kind = classifyInbound({ from: fromValue, subject, headers: received?.headers });
    const preview = previewFromText(received?.text ?? "");
    const receivedAt = new Date().toISOString();

    const { error: replyError } = await admin.from("application_replies").insert({
      application_id: application.id,
      user_id: application.user_id,
      kind,
      sender_name: sender.name || null,
      sender_domain: sender.domain || null,
      subject: subject || null,
      preview: preview || null,
      received_at: receivedAt,
      resend_email_id: emailId,
    });
    if (replyError && replyError.code !== "23505") throw replyError;
    if (replyError) return json({ ok: true, duplicate: true });

    if (kind === "bounce") {
      await admin.from("applications").update({
        delivery_status: "bounced",
        bounced_at: receivedAt,
        updated_at: receivedAt,
      }).eq("id", application.id);
    }

    const eventType = kind === "reply" ? "company_reply" : kind === "auto_reply" ? "company_auto_reply" : "company_bounce";
    const message = inboundEventMessage(kind, company, title);
    const { error: eventError } = await admin.from("application_events").insert({
      application_id: application.id,
      user_id: application.user_id,
      event_type: eventType,
      external_event_id: webhookId,
      message,
      metadata: { kind, senderDomain: sender.domain, subject },
    });
    if (eventError && eventError.code !== "23505") throw eventError;
    if (!eventError && kind === "reply") {
      await sendApplicationPush(admin, application.user_id, eventType, message, { applicationId: application.id });
    }

    // Human replies are forwarded to the candidate, who can answer the company directly.
    const candidateEmail = String(profile?.email ?? "").trim().toLowerCase();
    if (kind === "reply" && candidateEmail && received) {
      const original = String(received.text ?? "").trim() || String(received.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const body = original.slice(0, 20_000);
      const replyAddress = (Array.isArray(received.reply_to) ? received.reply_to[0] : received.reply_to) || sender.address;
      const intro = `${company} ha respondido a tu candidatura para ${title} a través de Landeo. Puedes contestar directamente a este correo y llegará a la empresa.`;
      const forwardResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${required("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${company.replace(/[<>"\r\n]/g, " ").trim().slice(0, 60)} vía Landeo <respuestas@${replyDomain}>`,
          to: [candidateEmail],
          reply_to: replyAddress,
          subject: `Respuesta de ${company}${subject ? `: ${subject}` : ""}`.slice(0, 200),
          text: `${intro}\n\n---\n${body}`,
          html: `<p>${escapeHtml(intro)}</p><hr><div style="white-space:pre-wrap">${escapeHtml(body)}</div>`,
          headers: { "X-Entity-Ref-ID": `reply-${emailId}` },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (forwardResponse.ok) {
        await admin.from("application_replies").update({ forwarded_at: new Date().toISOString() }).eq("resend_email_id", emailId);
      } else {
        console.error("resend-inbound forward", forwardResponse.status, await forwardResponse.text().catch(() => ""));
      }
    }
    return json({ ok: true, kind });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("resend-inbound", message);
    // 500 so Resend retries; the unique email id keeps retries idempotent.
    return json({ ok: false, message }, 500);
  }
});
