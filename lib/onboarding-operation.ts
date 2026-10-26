export type OnboardingStage = "session" | "upload" | "profile_read" | "profile_save";

export function safeErrorCode(error: unknown): string {
  const value = error as {code?: unknown; status?: unknown; statusCode?: unknown; name?: string; message?: string};
  const code = String(value?.code ?? value?.statusCode ?? value?.status ?? "");
  if (/^(?:[0-9]{3}|[0-9A-Z]{5}|[a-z_]{3,60})$/.test(code)) return code;
  if (value?.name === "AbortError" || value?.name === "TimeoutError") return "timeout";
  if (/fetch|network|connection|load failed|offline/i.test(value?.message ?? "")) return "network";
  return "unknown";
}

export class OnboardingOperationError extends Error {
  readonly stage: OnboardingStage;
  readonly code: string;
  constructor(stage: OnboardingStage, code: string, locale: "es" | "en") {
    const es = locale === "es";
    const description = stage === "session" ? (es ? "verificar tu sesión" : "verify your session")
      : stage === "upload" ? (es ? "subir tu CV" : "upload your résumé")
      : (es ? "guardar tu perfil" : "save your profile");
    super(es ? `No hemos podido ${description}. ${code === "timeout" ? "El servicio ha tardado demasiado. " : ""}Tus respuestas no se han borrado. Pulsa Reintentar; si continúa, contacta con soporte. Referencia: ${stage}/${code}.`
      : `We couldn't ${description}. ${code === "timeout" ? "The service took too long. " : ""}Your answers have not been cleared. Retry or contact support. Reference: ${stage}/${code}.`);
    this.stage = stage;
    this.code = code;
  }
}

/** Bounds each attempt and cancels its request. Retrying writes requires a stable upsert key. */
export async function onboardingOperation<T>(stage: OnboardingStage, operation: (signal: AbortSignal) => PromiseLike<T>, options: {
  locale: "es" | "en"; timeoutMs?: number; attempts?: number;
  onAttempt?: (attempt: number) => void; wait?: (ms: number) => Promise<unknown>;
}): Promise<T> {
  const attempts = options.attempts ?? 2;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    options.onAttempt?.(attempt);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new DOMException("Request timed out", "TimeoutError"));
            controller.abort();
          }, options.timeoutMs ?? 15_000);
        }),
      ]);
    } catch (error) {
      const code = safeErrorCode(error);
      const transient = ["timeout", "network", "408", "429", "57014"].includes(code) || /^5\d\d$/.test(code);
      if (!transient || attempt === attempts) throw new OnboardingOperationError(stage, code, options.locale);
    } finally { if (timer) clearTimeout(timer); }
    await (options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(attempt * 750);
  }
  throw new OnboardingOperationError(stage, "unknown", options.locale);
}

// Memory only: never persist CV contents or access tokens. A different File or user must upload again.
const uploadedFiles = new WeakMap<object, Map<string, string>>();
export async function reuseUploadedCv(file: object, userId: string, upload: () => Promise<string>) {
  const cached = uploadedFiles.get(file)?.get(userId);
  if (cached) return cached;
  const path = await upload();
  const users = uploadedFiles.get(file) ?? new Map<string, string>();
  users.set(userId, path);
  uploadedFiles.set(file, users);
  return path;
}
