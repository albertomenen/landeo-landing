"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

type Message = { id: string; direction: string; body: string; status: string; created_at: number };
export function SupportChat({ locale }: { locale: "es" | "en" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const pending = useRef<{ id: string; message: string } | null>(null);
  const t = (es: string, en: string) => locale === "es" ? es : en;
  async function api(method = "GET", data?: unknown) {
    const { data: session } = await createSupabaseBrowserClient().auth.getSession();
    if (!session.session) throw new Error("auth");
    const response = await fetch("/api/support", { method, headers: { authorization: `Bearer ${session.session.access_token}`, "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(response.status === 429 ? "rate" : "unavailable");
    return response.json() as Promise<{ messages: Message[] }>;
  }
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    let active = true;
    let busy = false;
    async function load() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const result = await api();
        if (active) { setMessages(result.messages); setError(""); }
      } catch { if (active) setError(t("No podemos cargar el chat. Volveremos a intentarlo. También puedes escribir a careers@haired.app.", "We can’t load the chat. We’ll retry. You can also email careers@haired.app.")); }
      finally { busy = false; if (active) setLoading(false); }
    }
    setLoading(true); void load();
    const interval = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open, locale]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages.length]);
  async function send(event?: FormEvent, retry?: Message) {
    event?.preventDefault();
    if (sending) return;
    const text = (retry?.body || draft).trim();
    if (!text) return;
    if (retry) pending.current = { id: retry.id, message: retry.body };
    else if (!pending.current || pending.current.message !== text) pending.current = { id: crypto.randomUUID(), message: text };
    setSending(true); setError("");
    try {
      await api("POST", pending.current);
      const sent = pending.current;
      pending.current = null;
      if (!retry) setDraft("");
      setMessages(previous => [...previous.filter(item => item.id !== sent.id), { id: sent.id, body: sent.message, direction: "user", status: "sent", created_at: Date.now() }]);
      try { const result = await api(); setMessages(result.messages); } catch { /* Polling will refresh the confirmed delivery. */ }
    } catch (value) {
      setError(value instanceof Error && value.message === "rate" ? t("Has enviado varios mensajes. Espera un minuto antes de continuar.", "You’ve sent several messages. Please wait a minute before continuing.") : t("No se ha confirmado la entrega. Espera unos segundos y reintenta; no cierres tu borrador.", "Delivery wasn’t confirmed. Wait a few seconds and retry; keep your draft open."));
    } finally { setSending(false); }
  }
  return <div className="support-chat" data-clarity-mask="true">
    <button className="support-launcher" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">{t("Escríbenos", "Message us")}</button>
    <dialog ref={dialog} className="support-dialog" onClose={() => setOpen(false)} aria-labelledby="support-title">
      <header><div><h2 id="support-title">{t("Soporte Landeo", "Landeo support")}</h2><p>{t("Te responderemos lo antes posible", "We’ll reply as soon as we can")}</p></div><button type="button" aria-label={t("Cerrar chat", "Close chat")} onClick={() => dialog.current?.close()}>×</button></header>
      <p className="support-notice">{t("El equipo recibe tus mensajes en Telegram. Las respuestas aparecen aquí al abrir el chat. No envíes contraseñas, CV ni datos sensibles.", "Our team receives your messages in Telegram. Replies appear here when you open the chat. Don’t send passwords, CVs or sensitive information.")} <a href="/privacy">{t("Privacidad", "Privacy")}</a></p>
      <div className="support-messages" ref={log} role="log" aria-label={t("Conversación de soporte", "Support conversation")} aria-live="polite">
        {loading && <p>{t("Cargando conversación…", "Loading conversation…")}</p>}
        {!loading && !messages.length && <p>{t("¿Qué necesitas? Cuéntanos el problema y en qué pantalla ocurre.", "How can we help? Tell us what happened and which screen you were on.")}</p>}
        {messages.map(message => <article key={message.id} className={message.direction === "user" ? "support-message mine" : "support-message"}><strong>{message.direction === "user" ? t("Tú", "You") : "Landeo"}</strong><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}{message.direction === "user" ? message.status === "sent" ? t(" · Entregado a soporte", " · Delivered to support") : t(" · Entrega no confirmada", " · Delivery not confirmed") : ""}</small>{message.status === "failed" && <button type="button" disabled={sending} onClick={() => send(undefined, message)}>{t("Reintentar", "Retry")}</button>}</article>)}
      </div>
      {error && <p className="support-error" role="alert">{error}</p>}
      <form onSubmit={send}><label htmlFor="support-message">{t("Tu mensaje", "Your message")}</label><textarea id="support-message" maxLength={2000} rows={3} value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} required/><div><small>{draft.length}/2000</small><button className="button button-primary" type="submit" disabled={sending || !draft.trim()}>{sending ? t("Enviando…", "Sending…") : t("Enviar", "Send")}</button></div></form>
    </dialog>
  </div>;
}
