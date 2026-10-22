type Locale = "es" | "en";
export class CvUploadError extends Error {}

export function resumeFormat(file: Pick<File, "name" | "size">, locale: Locale) {
  const extension = file.name.toLowerCase().split(".").pop();
  const types: Record<string, string> = {pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"};
  if (!extension || !types[extension]) throw new CvUploadError(locale === "es" ? "El CV debe ser PDF, DOC o DOCX. Selecciona otro archivo." : "Choose a PDF, DOC or DOCX résumé.");
  if (!file.size || file.size > 10 * 1024 * 1024) throw new CvUploadError(locale === "es" ? "El CV está vacío o supera los 10 MB. Selecciona otro archivo." : "The résumé is empty or exceeds 10 MB. Choose another file.");
  return {extension, contentType: types[extension]};
}

export async function uploadCvWithRetry(upload: () => PromiseLike<{error: unknown}>, locale: Locale, onAttempt?: (attempt: number) => void, wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    onAttempt?.(attempt);
    let failure: unknown;
    try { const result = await upload(); if (!result.error) return; failure = result.error; }
    catch (error) { failure = error; }
    const detail = failure as {statusCode?: string | number; status?: number; message?: string};
    const status = Number(detail?.statusCode ?? detail?.status ?? 0);
    const message = detail?.message ?? "";
    const transient = [408, 429].includes(status) || status >= 500 || (!status && /fetch|network|timeout|connection|load failed|offline/i.test(message));
    if (transient && attempt < 3) { await wait(attempt * 1000); continue; }
    const es = locale === "es";
    const reason = status === 413 ? (es ? "El archivo supera el tamaño permitido. Selecciona un CV de hasta 10 MB." : "The file is too large. Choose a résumé up to 10 MB.")
      : /mime|file type|content.type/i.test(message) ? (es ? "No se ha aceptado el formato del CV. Prueba a exportarlo como PDF." : "The résumé format was not accepted. Try exporting it as PDF.")
      : [401, 403].includes(status) ? (es ? "No se ha podido autorizar la subida del CV. Vuelve a iniciar sesión y selecciona el archivo de nuevo." : "The résumé upload could not be authorized. Sign in again and select the file again.")
      : transient ? (es ? "No hemos podido subir tu CV tras 3 intentos por un problema de conexión o del servicio. Comprueba tu conexión y pulsa Reintentar." : "We couldn't upload your résumé after 3 attempts due to a connection or service problem. Check your connection and select Retry.")
      : (es ? "No hemos podido subir tu CV y no podemos confirmar la causa. Prueba con un PDF o contacta con soporte." : "We couldn't upload your résumé and couldn't confirm the cause. Try a PDF or contact support.");
    throw new CvUploadError(reason);
  }
}
