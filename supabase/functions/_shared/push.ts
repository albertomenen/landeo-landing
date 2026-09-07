const PUSHABLE_EVENTS = new Set([
  "sent",
  "action_required",
  "failed",
  "email_accepted",
  "resend_delivered",
  "resend_delayed",
  "resend_bounced",
  "resend_failed",
  "resend_suppressed",
]);

const TITLES: Record<string, string> = {
  sent: "Candidatura enviada",
  action_required: "Necesitamos tu ayuda",
  failed: "No pudimos completar una candidatura",
  email_accepted: "CV enviado",
  resend_delivered: "CV entregado",
  resend_delayed: "Entrega retrasada",
  resend_bounced: "El correo fue rechazado",
  resend_failed: "Falló la entrega del CV",
  resend_suppressed: "Envío bloqueado",
};

export async function sendApplicationPush(
  admin: any,
  userId: string,
  eventType: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  if (!PUSHABLE_EVENTS.has(eventType)) return;

  const { data: rows, error } = await admin.from("push_tokens")
    .select("id,expo_push_token")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (error || !rows?.length) return;

  const notifications = rows.map((row: { expo_push_token: string }) => ({
    to: row.expo_push_token,
    sound: "default",
    title: TITLES[eventType] ?? "Actualización de Landeo",
    body: message,
    data: { ...data, eventType },
    priority: "high",
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notifications),
  }).catch(() => null);
  if (!response?.ok) return;

  const payload = await response.json().catch(() => null) as {
    data?: Array<{ status?: string; details?: { error?: string } }>;
  } | null;
  const disabledIds = (payload?.data ?? []).flatMap((ticket, index) =>
    ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
      ? [rows[index]?.id]
      : []
  ).filter(Boolean);
  if (disabledIds.length) {
    await admin.from("push_tokens").update({
      enabled: false,
      updated_at: new Date().toISOString(),
    }).in("id", disabledIds);
  }
}
