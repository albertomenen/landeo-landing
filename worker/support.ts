type SupportEnv = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_SUPPORT_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};
type Row = { id: string; user_id: string; direction: string; body: string; status: string; telegram_id: number | null; created_at: number };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function telegram(env: SupportEnv, method: string, body: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json() as { ok: boolean; result?: { message_id: number } };
  if (!response.ok || !result.ok) throw new Error("Telegram unavailable");
  return result.result;
}

export async function support(request: Request, env: SupportEnv): Promise<Response> {
  try {
    if (!env.DB || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_SUPPORT_CHAT_ID || !env.TELEGRAM_WEBHOOK_SECRET) return json({ error: "unavailable" }, 503);
    const path = new URL(request.url).pathname;
    if (path === "/api/support/telegram") {
      if (request.method !== "POST") return json({ error: "method" }, 405);
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) return json({ error: "unauthorized" }, 401);
      if (Number(request.headers.get("content-length") || 0) > 32000) return json({ error: "size" }, 413);
      const raw = await request.text();
      if (raw.length > 32000) return json({ error: "size" }, 413);
      const update = JSON.parse(raw);
      const message = update.message;
      if (!message || String(message.chat?.id) !== env.TELEGRAM_SUPPORT_CHAT_ID || String(message.from?.id) !== env.TELEGRAM_SUPPORT_CHAT_ID || message.chat?.type !== "private") return json({ ok: true });
      const reply = message.reply_to_message;
      if (!reply || !message.text || String(reply.from?.id) !== env.TELEGRAM_BOT_TOKEN.split(":")[0]) return json({ ok: true });
      // Only replies to our own support messages may reach a customer.
      const ref = String(reply.text || "").match(/\nRef: ([0-9a-f-]{36})$/i)?.[1];
      if (!ref || !uuid.test(ref)) return json({ ok: true });
      const original = await env.DB.prepare("SELECT * FROM support_messages WHERE id = ? AND direction = 'user' AND created_at > ?").bind(ref, Date.now() - 90 * 86400000).first<Row>();
      if (!original) return json({ ok: true });
      const body = String(message.text).trim();
      if (!body || body.length > 4000) return json({ ok: true });
      await env.DB.prepare("INSERT OR IGNORE INTO support_messages (id,user_id,direction,body,status,telegram_id,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(`telegram:${message.message_id}`, original.user_id, "support", body, "sent", message.message_id, Date.now()).run();
      return json({ ok: true });
    }
    if (path !== "/api/support") return json({ error: "not_found" }, 404);
    if (!["GET", "POST", "DELETE"].includes(request.method)) return json({ error: "method" }, 405);
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return json({ error: "unauthorized" }, 401);
    const verification = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(8000) });
    if (!verification.ok) return json({ error: "unauthorized" }, 401);
    const user = await verification.json() as { id?: string };
    if (!user.id) return json({ error: "unauthorized" }, 401);
    const now = Date.now();
    await env.DB.prepare("DELETE FROM support_messages WHERE created_at < ?").bind(now - 90 * 86400000).run();
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM support_messages WHERE user_id = ?").bind(user.id).run();
      return json({ ok: true });
    }
    if (request.method === "GET") {
      const rows = await env.DB.prepare("SELECT id,direction,body,status,created_at FROM support_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
      return json({ messages: rows.results.reverse() });
    }
    if (Number(request.headers.get("content-length") || 0) > 12000) return json({ error: "size" }, 413);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "size" }, 413);
    const input = JSON.parse(raw);
    const body = typeof input.message === "string" ? input.message.trim() : "";
    if (!uuid.test(String(input.id)) || !body || body.length > 2000) return json({ error: "invalid" }, 400);
    let existing = await env.DB.prepare("SELECT * FROM support_messages WHERE id = ?").bind(input.id).first<Row>();
    if (existing && (existing.user_id !== user.id || existing.body !== body)) return json({ error: "invalid" }, 400);
    if (existing?.status === "sent") return json({ ok: true });
    if (existing && now - existing.created_at < 30000) return json({ error: "pending" }, 409);
    if (!existing) {
      const inserted = await env.DB.prepare("INSERT OR IGNORE INTO support_messages (id,user_id,direction,body,status,created_at) SELECT ?,?,'user',?,'sending',? WHERE (SELECT COUNT(*) FROM support_messages WHERE user_id = ? AND direction = 'user' AND created_at > ?) < 5 AND (SELECT COUNT(*) FROM support_messages WHERE user_id = ? AND direction = 'user' AND created_at > ?) < 50")
        .bind(input.id, user.id, body, now, user.id, now - 60000, user.id, now - 86400000).run();
      if (!inserted.meta.changes) return json({ error: "rate_limit" }, 429);
    } else {
      const claimed = await env.DB.prepare("UPDATE support_messages SET status = 'sending', created_at = ? WHERE id = ? AND status IN ('failed','sending') AND created_at <= ?").bind(now, input.id, now - 30000).run();
      if (!claimed.meta.changes) return json({ error: "pending" }, 409);
    }
    try {
      const sent = await telegram(env, "sendMessage", { chat_id: env.TELEGRAM_SUPPORT_CHAT_ID, text: `Landeo · Soporte\nUsuario ${user.id.slice(0, 8)}\n\n${body}\n\nUsa «Responder» sobre este mensaje para contestar en Landeo.\nRef: ${input.id}`, reply_markup: { force_reply: true, selective: true } });
      await env.DB.prepare("UPDATE support_messages SET status = 'sent', telegram_id = ? WHERE id = ?").bind(sent?.message_id ?? null, input.id).run();
      return json({ ok: true });
    } catch {
      await env.DB.prepare("UPDATE support_messages SET status = 'failed' WHERE id = ?").bind(input.id).run();
      return json({ error: "delivery_failed" }, 502);
    }
  } catch {
    // Never log request content, auth headers or Telegram URLs containing the bot token.
    return json({ error: "unavailable" }, 503);
  }
}
