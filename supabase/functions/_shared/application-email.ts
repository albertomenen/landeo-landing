// Extraction of application emails from job text (moved out of import-jobs unchanged).
export function plainText(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded.replace(
      /&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
      (match, entity: string) => {
        const normalized = entity.toLowerCase();
        if (normalized.startsWith("#x")) {
          const codePoint = Number.parseInt(normalized.slice(2), 16);
          return Number.isFinite(codePoint)
            ? String.fromCodePoint(codePoint)
            : match;
        }
        if (normalized.startsWith("#")) {
          const codePoint = Number.parseInt(normalized.slice(1), 10);
          return Number.isFinite(codePoint)
            ? String.fromCodePoint(codePoint)
            : match;
        }
        return (
          (
            {
              amp: "&",
              apos: "'",
              gt: ">",
              lt: "<",
              nbsp: " ",
              quot: '"',
            } as Record<string, string>
          )[normalized] ?? match
        );
      },
    );
    if (next === decoded) break;
    decoded = next;
  }
  return decoded
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<\/\s*(?:div|p|h[1-6]|li|section)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/<[^>]*$/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/(?:\.\s*){2,}/g, ". ")
    .trim();
}

export const EMAIL_IN_TEXT_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function applicationEmailFromInstructions(value: string) {
  const instructions = plainText(value);
  const matches = [...instructions.matchAll(EMAIL_IN_TEXT_PATTERN)];
  const ranked = uniqueStrings(matches.map((match) => match[0].toLowerCase()))
    .map((email) => {
      const index = instructions.toLowerCase().indexOf(email);
      const context = instructions.slice(
        Math.max(0, index - 220),
        Math.min(instructions.length, index + email.length + 220),
      );
      let score = 0;
      if (
        /apply|application|candidate|candidatur|postul|solicitud|vacancy|position|job/i
          .test(context)
      ) score += 2;
      if (
        /send|submit|forward|email|e-mail|env[ií]a|remit|adjunt/i.test(context)
      ) score += 2;
      if (
        /\bcv\b|r[eé]sum[eé]|curriculum|cover letter|motivation letter/i.test(
          context,
        )
      ) score += 2;
      if (
        /recruit|career|jobs?|vacanc|talent|humanresources|hr@/i.test(email)
      ) score += 1;
      if (
        /support|help(?:desk)?|technical|privacy|data.?protection|\bdpo\b|press|media|complaint|fraud|safeguard|accommodation/i
          .test(context)
      ) score -= 5;
      if (/no-?reply|noreply|donotreply/i.test(email)) score -= 10;
      return { email, score, context: context.replace(/\s+/g, " ").trim() };
    })
    .sort((left, right) => right.score - left.score);

  const selected = ranked[0];
  const ambiguous = ranked.length > 1 && ranked[1].score >= selected.score;
  if (!selected || selected.score < 4 || ambiguous) return null;
  return selected;
}

export function emailApplicationRules(value: string) {
  const instructions = plainText(value);
  const urls = uniqueStrings(
    [...instructions.matchAll(/https?:\/\/[^\s)\]>]+/gi)].map((match) =>
      match[0].replace(/[.,;:]+$/, "")
    ),
  );
  const asksForOnlineForm = urls.length > 0 &&
    /apply\s+(?:online|through|via)|online application|application form|complete (?:the|this) form|portal/i
      .test(
        instructions,
      );
  const coverLetterRequired =
    /(?:must|required|please|include|attach|submit|send)[^.!?]{0,90}(?:cover|motivation) letter|(?:cover|motivation) letter[^.!?]{0,90}(?:must|required|include|attach|submit|send)/i
      .test(
        instructions,
      );
  const manualDocuments = [
    /technical proposal/i,
    /financial proposal/i,
    /writing sample/i,
    /reference letters?/i,
    /letters? of reference/i,
    /passport copy/i,
    /certified (?:copy|copies)/i,
    /completed application form/i,
  ].filter((pattern) => pattern.test(instructions)).map((pattern) =>
    pattern.source
  );
  const subjectPatterns = [
    /(?:subject(?: line)?|asunto)\s*(?:must be|should be|:|–|-)\s*["“]?([^\n.!?"”]{3,140})/i,
    /(?:indicat|mention|include|put|use)[^.!?]{0,45}(?:subject(?: line)?|asunto)[^:–-]{0,20}[:–-]\s*["“]?([^\n.!?"”]{3,140})/i,
  ];
  const subject = subjectPatterns
    .map((pattern) => instructions.match(pattern)?.[1]?.trim())
    .find(Boolean) ?? null;
  const requiredDocuments = [
    "cv",
    ...(coverLetterRequired ? ["cover_letter"] : []),
  ];
  return {
    asksForOnlineForm,
    manualDocuments,
    requiredDocuments,
    subject,
    urls,
  };
}

export function domainFromUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

