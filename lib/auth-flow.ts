// New emails carry 6 digits; codes issued earlier have 8 and stay valid for up to
// an hour, so both are accepted (this also keeps sign-in working while Supabase's
// setting and the published site are switched in two separate steps).
export const AUTH_EMAIL_CODE_LENGTH = 6;
export const AUTH_LEGACY_CODE_LENGTH = 8;
export const AUTH_MAX_CODE_LENGTH = AUTH_LEGACY_CODE_LENGTH;
export function isValidAuthCode(value: string) {
  return /^\d+$/.test(value) && (value.length === AUTH_EMAIL_CODE_LENGTH || value.length === AUTH_LEGACY_CODE_LENGTH);
}
export const AUTH_PENDING_KEY = "landeo-auth-pending";
export const AUTH_PENDING_TTL_MS = 15 * 60 * 1000;
export const AUTH_RESEND_SECONDS = 60;

/**
 * A code was already requested in this tab. Restoring the "enter your code"
 * screen after a refresh matters because Supabase will not send another code to
 * the same address for 60 seconds, while the one already in the inbox still works.
 */
export function parsePendingCode(raw: string | null, mode: string, now = Date.now()) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { email?: unknown; mode?: unknown; at?: unknown };
    const at = Number(value.at);
    if (typeof value.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return null;
    if (value.mode !== mode || !Number.isFinite(at) || at > now || now - at > AUTH_PENDING_TTL_MS) return null;
    return { email: value.email, resendIn: Math.max(0, AUTH_RESEND_SECONDS - Math.floor((now - at) / 1000)) };
  } catch {
    return null;
  }
}
export function safeAuthNext(value:string|null,fallback="/app/jobs"){
  return value?.startsWith("/")&&!value.startsWith("//")&&!/[\\\u0000-\u001f\u007f]/.test(value)?value:fallback;
}
export function authDestination(next:string,completed:boolean|null){
  if(completed===null)return "/app/jobs";
  if(!completed)return "/onboarding";
  return /^\/onboarding(?:[/?#]|$)/.test(next)?"/app/jobs":safeAuthNext(next);
}
export function authErrorCategory(value:unknown){
  const error=value as {code?:string;message?:string}|null;
  const text=`${error?.code??""} ${error?.message??String(value)}`.toLowerCase();
  if(/otp_expired|expired|invalid.*token/.test(text))return "expired";
  if(/pkce|code_verifier|flow_state/.test(text))return "pkce";
  if(/rate|too many|over_email_send/.test(text))return "rate_limited";
  if(/timeout:/.test(text))return "timeout";
  if(/network|fetch|timeout/.test(text))return "network";
  if(/signup_disabled|signups not allowed|user not found/.test(text))return "account_missing";
  if(/missing oauth secret|provider.*not.*enabled|configuration/.test(text))return "configuration";
  if(/access_denied|disallowed_useragent/.test(text))return "access_denied";
  return "other";
}
export function readableAuthError(value:unknown){
  switch(authErrorCategory(value)){
    case "expired":return "El código o enlace ha caducado, es incorrecto o ya se ha utilizado. Comprueba el último correo o solicita uno nuevo.";
    case "pkce":return "No pudimos validar este enlace en este navegador. Introduce tu email y accede con el código del nuevo correo.";
    case "rate_limited":return "Has hecho varios intentos seguidos. Espera al menos un minuto antes de solicitar otro código.";
    case "timeout":return "Está tardando más de lo normal. Pulsa «Verificar» para reintentarlo; si sigue igual, solicita un código nuevo.";
    case "network":return "No pudimos conectar con el servicio de acceso. Comprueba tu conexión y vuelve a intentarlo.";
    case "account_missing":return "No encontramos una cuenta con este email. Pulsa «Crear perfil» para registrarte o comprueba la dirección.";
    case "configuration":return "Este método de acceso no está disponible temporalmente. Puedes continuar con el código por email.";
    case "access_denied":return "El acceso fue cancelado o el navegador lo ha bloqueado. Prueba en Chrome o Safari, o continúa con email.";
    default:return "No pudimos completar el acceso. Vuelve a intentarlo; si continúa, solicita un código nuevo o contacta con soporte.";
  }
}


/** Rejects instead of waiting forever, so a stuck request can never freeze the form. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
