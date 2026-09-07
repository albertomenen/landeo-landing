import { createClient } from "npm:@supabase/supabase-js@2";
import { generateCoverLetter } from "../_shared/cover-letter.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { sendApplicationPush } from "../_shared/push.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const size = 32_768;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_CV_BYTES = 8 * 1024 * 1024;

function positiveInteger(name: string, fallback: number) {
  const parsed = Number(Deno.env.get(name));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function emailDomain(email: string) {
  return email.slice(email.lastIndexOf("@") + 1);
}

function senderMailbox(value: string) {
  const match = value.match(/<([^<>]+)>\s*$/);
  const email = normalizeEmail(match?.[1] ?? value);
  if (!email) throw new Error("RESEND_FROM_EMAIL no contiene un email válido.");
  return email;
}

function safeDisplayName(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

type RevenueCatPlatform = "ios" | "android";
type ApplicationPlatform = RevenueCatPlatform | "web";

function revenueCatApiKey(platform?: RevenueCatPlatform) {
  const platformKey = platform === "ios"
    ? Deno.env.get("REVENUECAT_IOS_API_KEY")
    : platform === "android"
    ? Deno.env.get("REVENUECAT_ANDROID_API_KEY")
    : undefined;
  const apiKey = platformKey ?? Deno.env.get("REVENUECAT_PUBLIC_API_KEY");
  if (!apiKey) {
    throw new Error(
      `Falta la clave pública de RevenueCat${platform ? ` para ${platform}` : ""}.`,
    );
  }
  return apiKey;
}

async function hasRevenueCatApplicationAccess(
  appUserId: string,
  platform?: RevenueCatPlatform,
) {
  const entitlementId = required("REVENUECAT_ENTITLEMENT_ID");
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${revenueCatApiKey(platform)}`,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`RevenueCat respondió ${response.status} al validar la suscripción.`);
  }
  const payload = await response.json() as {
    subscriber?: {
      entitlements?: Record<string, {
        expires_date?: string | null;
        grace_period_expires_date?: string | null;
      }>;
    };
  };
  const entitlement = payload.subscriber?.entitlements?.[entitlementId];
  if (!entitlement) return false;
  if (entitlement.expires_date === null) return true;

  const accessUntil = [entitlement.expires_date, entitlement.grace_period_expires_date]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];
  return Boolean(accessUntil && accessUntil > Date.now());
}

async function hasStripeWebApplicationAccess(admin: any, userId: string) {
  const { data, error } = await admin.from("stripe_subscriptions")
    .select("status,current_period_end").eq("user_id", userId)
    .in("status", ["active", "trialing"]).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();
}

async function hasApplicationAccess(admin: any, userId: string, platform?: ApplicationPlatform) {
  if (platform === "web") return hasStripeWebApplicationAccess(admin, userId);
  return hasRevenueCatApplicationAccess(userId, platform);
}

async function addEvent(
  admin: any,
  applicationId: string,
  userId: string,
  eventType: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await admin.from("application_events").insert({
    application_id: applicationId,
    user_id: userId,
    event_type: eventType,
    message,
    metadata,
  });
  if (error) throw error;
  await sendApplicationPush(admin, userId, eventType, message, {
    applicationId,
    ...metadata,
  });
}

async function setStatus(
  admin: any,
  applicationId: string,
  status: string,
  values: Record<string, unknown> = {},
) {
  await admin.from("applications").update({
    status,
    updated_at: new Date().toISOString(),
    ...values,
  }).eq("id", applicationId);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ status: "failed", message: "Método no permitido." }, 405);
  }

  let failureContext:
    | { admin: any; applicationId: string; userId: string }
    | null = null;
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return json({ status: "failed", message: "Sesión no válida." }, 401);
    }

    const url = required("SUPABASE_URL");
    const anonKey = required("SUPABASE_ANON_KEY");
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: userData, error: userError } = await userClient.auth
      .getUser();
    if (userError || !userData.user) {
      return json({ status: "failed", message: "Sesión no válida." }, 401);
    }
    const body = await request.json() as {
      jobId?: string;
      answers?: Record<string, unknown>;
      platform?: ApplicationPlatform;
    };
    if (!body.jobId) {
      return json({ status: "failed", message: "Falta la oferta." }, 400);
    }
    if (!await hasApplicationAccess(admin, userData.user.id, body.platform)) {
      return json({
        status: "failed",
        message: "Necesitas Landeo Pro para enviar candidaturas.",
      }, 402);
    }

    const [{ data: profile }, { data: job }, { data: target }] = await Promise
      .all([
        admin.from("profiles").select("*").eq("id", userData.user.id).single(),
        admin.from("jobs").select("*").eq("id", body.jobId).eq(
          "status",
          "active",
        ).single(),
        admin.from("job_application_targets").select("*").eq(
          "job_id",
          body.jobId,
        ).single(),
      ]);
    if (!profile) {
      return json({
        status: "failed",
        message: "Completa tu perfil antes de aplicar.",
      }, 422);
    }
    if (!job || !target) {
      return json({
        status: "failed",
        message: "La oferta ya no está disponible.",
      }, 404);
    }
    const { data: rightSwipe } = await admin.from("swipes").select("id").eq(
      "user_id",
      userData.user.id,
    ).eq("job_id", job.id).eq("direction", "right").maybeSingle();
    if (!rightSwipe) {
      return json({
        status: "failed",
        message: "Confirma la candidatura deslizando la oferta a la derecha.",
      }, 409);
    }
    if (
      !profile.cv_path && (target.mode === "email" || target.mode === "browser")
    ) {
      return json(
        { status: "failed", message: "Sube un CV antes de aplicar." },
        422,
      );
    }
    if (
      target.mode !== "external" &&
      (!profile.privacy_consent_at || !profile.automatic_application_consent_at)
    ) {
      return json({
        status: "failed",
        message:
          "Completa el perfil universal y autoriza el envío automático antes de aplicar.",
      }, 422);
    }

    const { data: existing } = await admin.from("applications").select("*").eq(
      "user_id",
      userData.user.id,
    ).eq("job_id", job.id).maybeSingle();
    if (existing?.status === "sent") {
      return json({
        status: "sent",
        message: "Esta candidatura ya estaba enviada.",
        externalReference: existing.external_reference,
      });
    }
    if (existing && ["queued", "processing"].includes(existing.status)) {
      return json({
        status: "queued",
        message: "Esta candidatura ya se está procesando.",
        externalReference: existing.id,
      });
    }
    if (existing?.status === "action_required" && target.mode === "external") {
      return json({
        status: "action_required",
        message:
          "Esta candidatura está pendiente de terminar en la web oficial.",
        actionUrl: target.apply_url,
      });
    }

    const applicationAnswers: Record<string, unknown> = { ...(body.answers ?? {}) };
    const generatedCoverLetter = await generateCoverLetter({
      userId: userData.user.id,
      profile,
      job,
    });
    if (generatedCoverLetter) {
      applicationAnswers.generatedCoverLetter = generatedCoverLetter.text;
      applicationAnswers.coverLetterModel = generatedCoverLetter.model;
      applicationAnswers.coverLetterGeneratedAt = generatedCoverLetter.generatedAt;
    }

    const { data: application, error: applicationError } = await admin.from(
      "applications",
    ).upsert({
      user_id: userData.user.id,
      job_id: job.id,
      status: "queued",
      cv_path: profile.cv_path ?? "infojobs:primary",
      answers: applicationAnswers,
      action_url: target.apply_url,
      required_fields: [],
      error_message: null,
      next_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      delivery_channel: target.mode,
    }, { onConflict: "user_id,job_id" }).select().single();
    if (applicationError) throw applicationError;
    failureContext = {
      admin,
      applicationId: application.id,
      userId: userData.user.id,
    };

    if (target.mode === "external") {
      const message = "Termina la candidatura en la web oficial de la empresa.";
      await setStatus(admin, application.id, "action_required", {
        action_url: target.apply_url,
        error_message: message,
      });
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "action_required",
        message,
        { actionUrl: target.apply_url },
      );
      return json({
        status: "action_required",
        message,
        actionUrl: target.apply_url,
      });
    }

    if (target.mode === "browser") {
      if (
        !target.apply_url || !["greenhouse", "lever"].includes(target.provider)
      ) {
        await setStatus(admin, application.id, "action_required", {
          action_url: target.apply_url,
          error_message:
            "Este formulario todavía no es compatible con Easy Apply.",
        });
        await addEvent(
          admin,
          application.id,
          userData.user.id,
          "action_required",
          "Este formulario necesita completarse en la web oficial.",
          { actionUrl: target.apply_url },
        );
        return json({
          status: "action_required",
          message:
            "Este formulario todavía necesita completarse en la web oficial.",
          actionUrl: target.apply_url,
        });
      }
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "queued",
        `Easy Apply preparado para ${target.provider}.`,
        { provider: target.provider },
      );
      return json({
        status: "queued",
        message:
          "Tu CV está en la cola de Easy Apply. Te avisaremos cuando se envíe.",
        externalReference: application.id,
      });
    }

    if (target.mode === "email") {
      const internalIntake = target.metadata?.internal_intake === true;
      const recipient = normalizeEmail(target.apply_email);
      const candidateEmail = normalizeEmail(profile.email);
      const authenticatedEmail = normalizeEmail(userData.user.email);
      const authorizedAt = target.email_authorized_at
        ? new Date(target.email_authorized_at)
        : null;
      const sourceUrl = String(target.email_source_url ?? "");
      const sourceIsValid = /^https:\/\//i.test(sourceUrl);
      if (
        !recipient || target.email_authorized !== true ||
        !authorizedAt || Number.isNaN(authorizedAt.getTime()) || !sourceIsValid
      ) {
        await setStatus(admin, application.id, "action_required", {
          action_url: target.apply_url,
          error_message:
            "El email de candidatura todavía no ha sido verificado en la fuente oficial.",
        });
        return json({
          status: "action_required",
          message:
            "Este email aún no está autorizado para Easy Apply. Usa la web oficial.",
          actionUrl: target.apply_url,
        }, 422);
      }
      if (
        !candidateEmail || !authenticatedEmail ||
        candidateEmail !== authenticatedEmail ||
        !userData.user.email_confirmed_at
      ) {
        await setStatus(admin, application.id, "action_required", {
          error_message:
            "El candidato debe verificar su email antes de enviar por correo.",
        });
        return json({
          status: "action_required",
          message: "Verifica tu email antes de enviar candidaturas.",
        }, 422);
      }
      if (!safeDisplayName(profile.full_name)) {
        await setStatus(admin, application.id, "action_required", {
          error_message: "El perfil necesita nombre completo.",
        });
        return json({
          status: "action_required",
          message: "Añade tu nombre completo al perfil antes de aplicar.",
        }, 422);
      }
      if (!String(profile.cv_path).startsWith(`${userData.user.id}/`)) {
        throw new Error("La ruta del CV no pertenece al usuario autenticado.");
      }

      const recipientDomain = emailDomain(recipient);
      const { data: suppression } = await admin.from("email_suppressions")
        .select("reason").eq("recipient_email", recipient).maybeSingle();
      if (suppression) {
        await setStatus(admin, application.id, "action_required", {
          action_url: target.apply_url,
          recipient_domain: recipientDomain,
          error_message:
            "El email de la empresa está bloqueado después de un fallo de entrega.",
        });
        return json({
          status: "action_required",
          message:
            "No podemos entregar correos a esa dirección. Usa la web oficial.",
          actionUrl: target.apply_url,
        }, 422);
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const [{ count: userEmailCount }, { count: domainEmailCount }] =
        await Promise
          .all([
            admin.from("applications").select("id", {
              count: "exact",
              head: true,
            }).eq("user_id", userData.user.id).eq(
              "delivery_channel",
              "email",
            ).in("status", ["queued", "processing", "sent"]).gte(
              "applied_at",
              today.toISOString(),
            ),
            admin.from("applications").select("id", {
              count: "exact",
              head: true,
            }).eq("recipient_domain", recipientDomain).eq(
              "delivery_channel",
              "email",
            ).in("status", ["queued", "processing", "sent"]).gte(
              "applied_at",
              today.toISOString(),
            ),
          ]);
      const userLimit = positiveInteger("EMAIL_USER_DAILY_LIMIT", 10);
      const domainLimit = positiveInteger("EMAIL_DOMAIN_DAILY_LIMIT", 50);
      if ((userEmailCount ?? 0) >= userLimit) {
        await setStatus(admin, application.id, "action_required", {
          error_message:
            `Límite diario de ${userLimit} candidaturas por email alcanzado.`,
        });
        return json({
          status: "action_required",
          message:
            `Has alcanzado el límite diario de ${userLimit} candidaturas por email.`,
        }, 429);
      }
      if ((domainEmailCount ?? 0) >= domainLimit) {
        await setStatus(admin, application.id, "action_required", {
          action_url: target.apply_url,
          recipient_domain: recipientDomain,
          error_message:
            "El dominio de la empresa alcanzó temporalmente el límite de seguridad.",
        });
        return json({
          status: "action_required",
          message:
            "Esta empresa ha alcanzado temporalmente el límite de seguridad. Usa su web oficial.",
          actionUrl: target.apply_url,
        }, 429);
      }

      const sendToken = crypto.randomUUID();
      const { data: claimed, error: claimError } = await admin.from(
        "applications",
      ).update({
        status: "processing",
        email_send_token: sendToken,
        delivery_channel: "email",
        recipient_domain: recipientDomain,
        delivery_status: null,
        updated_at: new Date().toISOString(),
      }).eq("id", application.id).is("email_send_token", null).select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        return json({
          status: "queued",
          message: "Esta candidatura ya se está procesando.",
          externalReference: application.id,
        });
      }
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "email_processing",
        internalIntake
          ? "Preparando el expediente para que Landeo gestione la candidatura."
          : "Preparando la candidatura para un email autorizado.",
        { recipientDomain, sourceUrl, internalIntake },
      );

      const { data: cv, error: cvError } = await admin.storage.from("cvs")
        .download(profile.cv_path);
      if (cvError || !cv) {
        throw cvError ?? new Error("No se pudo recuperar el CV.");
      }
      if (cv.size > MAX_CV_BYTES) {
        throw new Error(
          "El CV supera el límite seguro de 8 MB para envío por email.",
        );
      }
      const cvBase64 = bytesToBase64(new Uint8Array(await cv.arrayBuffer()));
      const fromMailbox = senderMailbox(required("RESEND_FROM_EMAIL"));
      const candidateName = safeDisplayName(profile.full_name);
      const from = `${candidateName} vía Landeo <${fromMailbox}>`;
      const phoneLine = profile.phone
        ? `<br>Teléfono: ${escapeHtml(profile.phone)}`
        : "";
      const introduction = internalIntake
        ? `${escapeHtml(candidateName)} ha pedido a Landeo que gestione su candidatura para <strong>${escapeHtml(job.title)}</strong> en <strong>${escapeHtml(job.company)}</strong>.`
        : `${escapeHtml(candidateName)} presenta su candidatura para <strong>${escapeHtml(job.title)}</strong> y ha autorizado este envío a través de Landeo.`;
      const plainIntroduction = internalIntake
        ? `${candidateName} ha pedido a Landeo que gestione su candidatura para ${job.title} en ${job.company}.`
        : `${candidateName} presenta su candidatura para ${job.title} y ha autorizado este envío a través de Landeo.`;
      const coverLetterText = typeof applicationAnswers.generatedCoverLetter === "string"
        ? applicationAnswers.generatedCoverLetter.trim()
        : "";
      const coverLetterHtml = coverLetterText
        ? `<hr><p><strong>Carta de presentación personalizada:</strong></p>${coverLetterText.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}`
        : "";
      const coverLetterPlain = coverLetterText
        ? `\n\nCarta de presentación personalizada:\n\n${coverLetterText}`
        : "";
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${required("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          reply_to: candidateEmail,
          subject: internalIntake
            ? `[Landeo · Por gestionar] ${job.company} — ${job.title} — ${profile.full_name}`
            : `Candidatura: ${job.title} — ${profile.full_name}`,
          html: `<p>Hola,</p><p>${introduction}</p><p>Email: ${
            escapeHtml(candidateEmail)
          }${phoneLine}</p>${coverLetterHtml}<p>CV adjunto. ${
            internalIntake
              ? "La candidatura todavía no consta como enviada a la empresa; debe tramitarse y confirmarse desde el canal oficial indicado."
              : "Puedes responder directamente a este mensaje para contactar con el candidato."
          }</p>`,
          text:
            `Hola,\n\n${plainIntroduction}\n\nEmail: ${candidateEmail}${
              profile.phone ? `\nTeléfono: ${profile.phone}` : ""
            }${coverLetterPlain}\n\nCV adjunto. ${
              internalIntake
                ? "La candidatura todavía no consta como enviada a la empresa; debe tramitarse y confirmarse desde el canal oficial indicado."
                : "Puedes responder directamente a este mensaje para contactar con el candidato."
            }`,
          headers: { "X-Entity-Ref-ID": application.id },
          attachments: [{
            filename: profile.cv_path.split("/").pop() || "CV.pdf",
            content: cvBase64,
          }],
        }),
      });
      const resend = await resendResponse.json() as {
        id?: string;
        message?: string;
      };
      if (!resendResponse.ok) {
        throw new Error(
          resend.message || `Resend respondió ${resendResponse.status}`,
        );
      }
      if (internalIntake) {
        await setStatus(admin, application.id, "queued", {
          external_reference: resend.id,
          delivery_status: "accepted",
          recipient_domain: recipientDomain,
        });
        await addEvent(
          admin,
          application.id,
          userData.user.id,
          "landeo_intake_received",
          "Landeo ha recibido tu CV y gestionará la candidatura por el canal oficial.",
          { externalReference: resend.id, sourceUrl },
        );
        return json({
          status: "queued",
          message:
            "Landeo ha recibido tu CV. La candidatura quedará en gestión hasta confirmar el envío a la empresa.",
          externalReference: application.id,
        });
      }
      await setStatus(admin, application.id, "sent", {
        external_reference: resend.id,
        delivery_status: "accepted",
        recipient_domain: recipientDomain,
      });
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "email_accepted",
        "Resend aceptó la candidatura para su entrega.",
        { externalReference: resend.id, recipientDomain },
      );
      return json({
        status: "sent",
        message: "CV enviado correctamente a la empresa.",
        externalReference: resend.id,
      });
    }

    const { data: integration } = await admin.from("user_integrations").select(
      "*",
    ).eq("user_id", userData.user.id).eq("provider", "infojobs").single();
    if (!integration) {
      const message = "Conecta tu cuenta de InfoJobs para terminar esta candidatura.";
      await setStatus(admin, application.id, "action_required", {
        action_url: target.apply_url,
        error_message: message,
      });
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "action_required",
        message,
        { actionUrl: target.apply_url },
      );
      return json({
        status: "action_required",
        message,
        actionUrl: target.apply_url,
      });
    }

    const clientId = required("INFOJOBS_CLIENT_ID");
    const clientSecret = required("INFOJOBS_CLIENT_SECRET");
    let accessToken = integration.access_token as string;
    if (
      integration.expires_at &&
      new Date(integration.expires_at).getTime() < Date.now() + 60_000 &&
      integration.refresh_token
    ) {
      const refreshResponse = await fetch(
        "https://www.infojobs.net/oauth/authorize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: integration.refresh_token,
          }),
        },
      );
      const refreshed = await refreshResponse.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!refreshResponse.ok || !refreshed.access_token) {
        throw new Error("Vuelve a conectar tu cuenta de InfoJobs.");
      }
      accessToken = refreshed.access_token;
      await admin.from("user_integrations").update({
        access_token: accessToken,
        refresh_token: refreshed.refresh_token ?? integration.refresh_token,
        expires_at: refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userData.user.id).eq("provider", "infojobs");
    }
    const infoJobsAuth = `Basic ${
      btoa(`${clientId}:${clientSecret}`)
    },Bearer ${accessToken}`;
    const questions = Array.isArray(job.metadata?.application_questions)
      ? job.metadata.application_questions as Array<
        { id: string; kind: "choice" | "text"; label: string }
      >
      : [];
    const infoJobsPayload = {
      offerKillerQuestions: questions.filter((question) =>
        question.kind === "choice"
      ).map((question) => ({
        id: Number(question.id),
        answerId: Number(body.answers?.[`question:${question.id}`]),
      })),
      offerOpenQuestions: questions.filter((question) =>
        question.kind === "text"
      ).map((question) => ({
        id: Number(question.id),
        answer: String(
          applicationAnswers[`question:${question.id}`] ??
            (/carta|cover\\s*letter|motivaci[oó]n|why.*you|por qu[eé]/i.test(question.label)
              ? applicationAnswers.generatedCoverLetter ?? ""
              : ""),
        ),
      })),
    };
    const applyResponse = await fetch(
      `https://api.infojobs.net/api/4/offer/${
        encodeURIComponent(job.external_id)
      }/application`,
      {
        method: "POST",
        headers: {
          Authorization: infoJobsAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(infoJobsPayload),
      },
    );
    const result = await applyResponse.json().catch(() => ({})) as {
      code?: string;
      error?: string;
      error_description?: string;
    };
    if (!applyResponse.ok) {
      const message = result.error_description ??
        "InfoJobs requiere responder preguntas antes de enviar.";
      await setStatus(admin, application.id, "action_required", {
        action_url: target.apply_url,
        error_message: message,
      });
      await addEvent(
        admin,
        application.id,
        userData.user.id,
        "action_required",
        message,
        { actionUrl: target.apply_url },
      );
      return json({
        status: "action_required",
        message,
        actionUrl: target.apply_url,
      });
    }

    await setStatus(admin, application.id, "sent", {
      external_reference: result.code,
    });
    await addEvent(
      admin,
      application.id,
      userData.user.id,
      "sent",
      "Candidatura enviada mediante InfoJobs.",
      { externalReference: result.code },
    );
    return json({
      status: "sent",
      message: "Candidatura enviada mediante InfoJobs.",
      externalReference: result.code,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (failureContext) {
      await setStatus(
        failureContext.admin,
        failureContext.applicationId,
        "failed",
        {
          error_message: message,
          delivery_status: "failed",
          email_send_token: null,
        },
      ).catch(() => undefined);
      await addEvent(
        failureContext.admin,
        failureContext.applicationId,
        failureContext.userId,
        "failed",
        message,
      ).catch(() => undefined);
    }
    return json({
      status: "failed",
      message,
    }, 500);
  }
});
