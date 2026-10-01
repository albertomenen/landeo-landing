export type CoverLetterLanguage = "en" | "es";

const englishWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "build", "by", "can", "company",
  "experience", "for", "from", "have", "in", "is", "of", "on", "our", "role",
  "team", "that", "the", "their", "this", "to", "we", "will", "with", "you",
  "your",
]);
const spanishWords = new Set([
  "a", "al", "con", "de", "del", "el", "en", "equipo", "es", "esta", "este",
  "experiencia", "la", "las", "los", "nuestro", "para", "por", "puesto",
  "que", "se", "ser", "su", "sus", "trabajo", "un", "una", "y",
]);
const englishRoles = /\b(engineer|developer|designer|manager|intern|internship|analyst|marketing|sales|recruiter|scientist)\b/i;
const spanishRoles = /\b(ingenier[oa]|desarrollador(?:a)?|diseñador(?:a)?|becari[oa]|prácticas|analista|ventas|científic[oa])\b/i;

function score(text: string) {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  let en = 0;
  let es = 0;
  for (const word of words.slice(0, 500)) {
    if (englishWords.has(word)) en++;
    if (spanishWords.has(word)) es++;
  }
  return { en, es };
}

/** Detect the posting's language without letting Spanish profile answers dominate it. */
export function coverLetterLanguage(job: {
  title?: unknown;
  summary?: unknown;
  description?: unknown;
}): CoverLetterLanguage {
  const title = String(job.title ?? "");
  const description = String(job.description || job.summary || "").slice(0, 3_000);
  const bodyScore = score(description);
  if (bodyScore.en >= bodyScore.es + 3) return "en";
  if (bodyScore.es >= bodyScore.en + 3) return "es";

  const titleScore = score(title);
  const en = bodyScore.en + titleScore.en * 2 + (englishRoles.test(title) ? 2 : 0);
  const es = bodyScore.es + titleScore.es * 2 + (spanishRoles.test(title) ? 2 : 0);
  return en > es ? "en" : "es";
}
