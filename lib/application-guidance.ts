import type { DashboardLocale } from "./dashboard-i18n";
import type { LiveApplication } from "./landeo";

type GuideTone = "action" | "waiting" | "progress" | "closed";

export type ApplicationGuide = {
  tone: GuideTone;
  title: string;
  description: string;
  waitingOn: string;
  nextStep: string;
  source: "delivery" | "personal";
};

const copy = (locale: DashboardLocale, es: string, en: string) =>
  locale === "es" ? es : en;

export function applicationGuide(
  application: LiveApplication,
  locale: DashboardLocale,
): ApplicationGuide {
  const { status, actionUrl, requiredFields, tracking } = application;

  if (status === "action_required") return {
    tone: "action",
    title: copy(locale, "Necesita una acción tuya", "You need to take action"),
    description: actionUrl
      ? copy(locale, "La candidatura aún no está terminada. Completa el paso pendiente en la web oficial.", "The application is not finished yet. Complete the pending step on the official website.")
      : copy(locale, "La candidatura está pendiente de información o de un paso adicional.", "The application is waiting for information or another step."),
    waitingOn: copy(locale, "Tú", "You"),
    nextStep: requiredFields.length
      ? copy(locale, `Revisa los datos solicitados: ${requiredFields.join(", ")}.`, `Review the requested details: ${requiredFields.join(", ")}.`)
      : actionUrl
        ? copy(locale, "Abre el enlace oficial y termina la solicitud.", "Open the official link and finish the application.")
        : copy(locale, "Consulta el estado del envío y los requisitos de abajo.", "Check the delivery status and requirements below."),
    source: "delivery",
  };

  if (status === "failed") return {
    tone: "action",
    title: copy(locale, "No se completó el envío", "The submission was not completed"),
    description: copy(locale, "No asumimos que la empresa haya recibido esta candidatura.", "We cannot assume the company received this application."),
    waitingOn: copy(locale, "Tú", "You"),
    nextStep: copy(locale, "Revisa el error indicado abajo antes de volver a intentarlo.", "Review the error shown below before trying again."),
    source: "delivery",
  };

  if (status === "queued" || status === "processing") return {
    tone: "waiting",
    title: copy(locale, "Landeo está gestionando el envío", "Landeo is handling the submission"),
    description: copy(locale, "Todavía no hay confirmación de envío a la empresa. No es una respuesta del reclutador.", "Submission to the company is not confirmed yet. This is not a recruiter response."),
    waitingOn: "Landeo",
    nextStep: copy(locale, "Por ahora, espera una actualización del estado de envío.", "For now, wait for an update to the delivery status."),
    source: "delivery",
  };

  if (status === "rejected") return {
    tone: "closed",
    title: copy(locale, "Proceso cerrado", "Process closed"),
    description: copy(locale, "La candidatura figura como rechazada.", "This application is recorded as rejected."),
    waitingOn: copy(locale, "Nadie", "No one"),
    nextStep: copy(locale, "Puedes conservar tus notas y seguir buscando otras oportunidades.", "You can keep your notes and continue exploring other opportunities."),
    source: "delivery",
  };

  if (tracking.updatedAt && tracking.stage === "offer") return {
    tone: "progress",
    title: copy(locale, "Oferta anotada en tu seguimiento", "Offer noted in your tracking"),
    description: copy(locale, "Esta etapa la has marcado tú; Landeo no ha verificado una decisión de la empresa.", "You marked this stage yourself; Landeo has not verified a company decision."),
    waitingOn: copy(locale, "Tú", "You"),
    nextStep: copy(locale, "Revisa condiciones, plazos y los próximos pasos que hayas acordado.", "Review the terms, deadlines and any next steps you agreed on."),
    source: "personal",
  };

  if (tracking.updatedAt && tracking.stage === "closed") return {
    tone: "closed",
    title: copy(locale, "Proceso cerrado en tu seguimiento", "Process closed in your tracking"),
    description: copy(locale, "Esta etapa la has marcado tú; no representa una confirmación nueva de la empresa.", "You marked this stage yourself; it is not a new confirmation from the company."),
    waitingOn: copy(locale, "Nadie", "No one"),
    nextStep: copy(locale, "Conserva aquí tus notas si quieres recordar el resultado.", "Keep your notes here if you want to remember the outcome."),
    source: "personal",
  };

  if (status === "interview" || (tracking.updatedAt && tracking.stage === "interview")) return {
    tone: "progress",
    title: copy(locale, "Etapa de entrevista", "Interview stage"),
    description: status === "interview"
      ? copy(locale, "La candidatura figura en entrevista.", "The application is recorded at the interview stage.")
      : copy(locale, "Has marcado esta etapa en tu seguimiento personal.", "You marked this stage in your personal tracking."),
    waitingOn: copy(locale, "Tú", "You"),
    nextStep: copy(locale, "Confirma la fecha con la empresa y prepara la entrevista.", "Confirm the date with the company and prepare for the interview."),
    source: status === "interview" ? "delivery" : "personal",
  };

  if (tracking.updatedAt && tracking.stage === "screening") return {
    tone: "waiting",
    title: copy(locale, "En revisión según tu seguimiento", "In review according to your tracking"),
    description: copy(locale, "Has marcado esta etapa; no significa que la empresa haya confirmado la revisión.", "You marked this stage; it does not mean the company confirmed a review."),
    waitingOn: copy(locale, "Empresa, si está revisando", "Company, if reviewing"),
    nextStep: copy(locale, "Espera respuesta o apunta abajo una fecha para hacer seguimiento.", "Wait for a response or add a follow-up date below."),
    source: "personal",
  };

  return {
    tone: "waiting",
    title: status === "viewed"
      ? copy(locale, "Candidatura marcada como vista", "Application marked as viewed")
      : copy(locale, "Candidatura enviada", "Application sent"),
    description: copy(locale, "El canal ha confirmado el envío, pero aún no tenemos una respuesta de la empresa.", "The channel confirmed submission, but we do not have a company response yet."),
    waitingOn: copy(locale, "Empresa", "Company"),
    nextStep: copy(locale, "Espera respuesta. Si tienes un contacto, puedes programar un seguimiento abajo.", "Wait for a response. If you have a contact, you can schedule a follow-up below."),
    source: "delivery",
  };
}
