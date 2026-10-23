// Pure helpers for replies that companies send to an application email.
// No Deno or network APIs here so they can be unit tested from Node.

export type InboundKind = "reply" | "auto_reply" | "bounce";

export const DEFAULT_REPLY_DOMAIN = "reply.getlandeo.com";

/** Returns the application token of the first `apply+<token>@<domain>` address. */
export function parseReplyToken(addresses: unknown, replyDomain: string): string | null {
  const domain = replyDomain.trim().toLowerCase();
  const list = Array.isArray(addresses) ? addresses : [addresses];
  for (const raw of list) {
    const match = String(raw ?? "").toLowerCase().match(/apply\+([a-f0-9]{32})@([a-z0-9.-]+)/);
    if (match && match[2] === domain) return match[1];
  }
  return null;
}

export function parseSender(value: unknown): { name: string; address: string; domain: string } {
  const text = String(value ?? "").trim();
  const angle = text.match(/^(.*?)<([^<>]+)>\s*$/);
  const address = (angle ? angle[2] : text).trim().toLowerCase();
  const name = (angle ? angle[1] : "").replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 120);
  const domain = address.includes("@") ? address.split("@").pop() ?? "" : "";
  return { name, address, domain };
}

function lowerHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (item && typeof item === "object") {
        const { name, value } = item as { name?: unknown; value?: unknown };
        if (name) result[String(name).toLowerCase()] = String(value ?? "");
      }
    }
  } else if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      result[key.toLowerCase()] = String(value ?? "");
    }
  }
  return result;
}

const BOUNCE_SUBJECT =
  /(undeliverable|undelivered|delivery status notification|mail delivery (failed|subsystem)|returned mail|failure notice|no se (ha )?pudo entregar|mensaje no entregado)/i;
const AUTO_SUBJECT =
  /(out of office|fuera de (la )?oficina|respuesta autom[aá]tica|automatic reply|auto-?reply|autoreply|we(?:'ve| have) received your application|hemos recibido tu (candidatura|solicitud|cv)|recibimos tu (candidatura|solicitud)|thank you for (applying|your application|your interest)|gracias por (aplicar|postularte|tu candidatura|tu solicitud|tu inter[eé]s)|application received|candidatura recibida)/i;

/**
 * bounce: a delivery failure notice. auto_reply: an automatic acknowledgement or
 * out-of-office. reply: anything else, i.e. a person (or at least a real answer).
 */
export function classifyInbound(
  input: { from: unknown; subject: unknown; headers?: unknown },
): InboundKind {
  const sender = parseSender(input.from);
  const local = sender.address.split("@")[0] ?? "";
  const subject = String(input.subject ?? "");
  const headers = lowerHeaders(input.headers);

  if (/^(mailer-daemon|postmaster)/.test(local) || BOUNCE_SUBJECT.test(subject)) return "bounce";
  if (/multipart\/report/i.test(headers["content-type"] ?? "") && /delivery-status/i.test(headers["content-type"] ?? "")) {
    return "bounce";
  }

  const autoSubmitted = (headers["auto-submitted"] ?? "").trim().toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return "auto_reply";
  if (headers["x-autoreply"] || headers["x-autorespond"]) return "auto_reply";
  if (/^(auto_reply|auto-reply|bulk|junk)$/i.test((headers["precedence"] ?? "").trim())) return "auto_reply";
  if (/^(no-?reply|do-?not-?reply|donotreply|noreply)/.test(local)) return "auto_reply";
  if (AUTO_SUBJECT.test(subject)) return "auto_reply";
  return "reply";
}

/** Short, single-paragraph preview without quoted history or signatures. */
export function previewFromText(text: unknown, max = 280): string {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(on .{5,120} wrote:|el .{5,120} escribi[oó]:|-{2,}\s*(original message|mensaje original)|from:\s)/i.test(trimmed)) break;
    if (trimmed.startsWith(">")) continue;
    if (/^--\s*$/.test(trimmed)) break;
    kept.push(trimmed);
  }
  const flat = kept.join(" ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function inboundEventMessage(kind: InboundKind, company: string, title: string): string {
  if (kind === "reply") return `${company} ha respondido a tu candidatura para ${title}.`;
  if (kind === "auto_reply") return `${company} ha enviado una respuesta automática a tu candidatura para ${title}.`;
  return `La empresa devolvió un aviso de no entrega para tu candidatura a ${title}.`;
}
