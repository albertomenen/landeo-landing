export const AUTH_EMAIL_CODE_LENGTH = 8;
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
    case "network":return "No pudimos conectar con el servicio de acceso. Comprueba tu conexión y vuelve a intentarlo.";
    case "account_missing":return "No encontramos una cuenta con este email. Pulsa «Crear perfil» para registrarte o comprueba la dirección.";
    case "configuration":return "Este método de acceso no está disponible temporalmente. Puedes continuar con el código por email.";
    case "access_denied":return "El acceso fue cancelado o el navegador lo ha bloqueado. Prueba en Chrome o Safari, o continúa con email.";
    default:return "No pudimos completar el acceso. Vuelve a intentarlo; si continúa, solicita un código nuevo o contacta con soporte.";
  }
}
