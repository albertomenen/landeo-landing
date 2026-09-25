import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";

type NormalizedJob = {
  source:
    | "InfoJobs"
    | "Adzuna"
    | "ReliefWeb"
    | "Remotive"
    | "Greenhouse"
    | "Empresa";
  external_id: string;
  company: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  work_mode: "Remoto" | "Híbrido" | "Presencial";
  salary_min: number | null;
  salary_max: number | null;
  contract_type: string | null;
  seniority: string | null;
  industry: string | null;
  apply_mode: "direct" | "questions" | "external";
  status: "active";
  published_at: string | null;
  metadata: Record<string, unknown>;
  target: {
    mode: "email" | "infojobs" | "browser" | "external";
    apply_email?: string | null;
    apply_url: string | null;
    provider: "infojobs" | "greenhouse" | "lever" | null;
    metadata: Record<string, unknown>;
    email_authorized?: boolean;
    email_authorized_at?: string | null;
    email_source_url?: string | null;
  };
};

const greenhouseBoards = [
  { token: "figma", company: "Figma", domain: "figma.com" },
  { token: "datadog", company: "Datadog", domain: "datadoghq.com" },
  { token: "cloudflare", company: "Cloudflare", domain: "cloudflare.com" },
  { token: "discord", company: "Discord", domain: "discord.com" },
  { token: "reddit", company: "Reddit", domain: "redditinc.com" },
  { token: "gitlab", company: "GitLab", domain: "gitlab.com" },
  { token: "coinbase", company: "Coinbase", domain: "coinbase.com" },
  { token: "pinterest", company: "Pinterest", domain: "pinterest.com" },
  { token: "mongodb", company: "MongoDB", domain: "mongodb.com" },
  { token: "asana", company: "Asana", domain: "asana.com" },
  { token: "twilio", company: "Twilio", domain: "twilio.com" },
  { token: "lyft", company: "Lyft", domain: "lyft.com" },
  { token: "elastic", company: "Elastic", domain: "elastic.co" },
  { token: "monzo", company: "Monzo", domain: "monzo.com" },
  { token: "canonical", company: "Canonical", domain: "canonical.com" },
  { token: "wise", company: "Wise", domain: "wise.com" },
  { token: "celonis", company: "Celonis", domain: "celonis.com" },
  { token: "cabify", company: "Cabify", domain: "cabify.com" },
  { token: "aircallioinc", company: "Aircall", domain: "aircall.io" },
  { token: "neoris", company: "NEORIS", domain: "neoris.com" },
  { token: "soficonv", company: "Sofico", domain: "sofico.global" },
  { token: "speechify", company: "Speechify", domain: "speechify.com" },
  { token: "workato", company: "Workato", domain: "workato.com" },
  {
    token: "banyansoftware",
    company: "Banyan Software",
    domain: "banyansoftware.com",
  },
  { token: "vonage", company: "Vonage", domain: "vonage.com" },
  { token: "typeform", company: "Typeform", domain: "typeform.com" },
  { token: "wallapop", company: "Wallapop", domain: "wallapop.com" },
  { token: "remotecom", company: "Remote", domain: "remote.com" },
  { token: "clarityai", company: "Clarity AI", domain: "clarity.ai" },
  { token: "anthropic", company: "Anthropic", domain: "anthropic.com" },
  { token: "airbnb", company: "Airbnb", domain: "airbnb.com" },
  { token: "dropbox", company: "Dropbox", domain: "dropbox.com" },
  { token: "duolingo", company: "Duolingo", domain: "duolingo.com" },
  { token: "robinhood", company: "Robinhood", domain: "robinhood.com" },
  { token: "samsara", company: "Samsara", domain: "samsara.com" },
  { token: "scaleai", company: "Scale AI", domain: "scale.com" },
  { token: "stripe", company: "Stripe", domain: "stripe.com" },
] as const;

const leverBoards = [
  { token: "jobandtalent", company: "Job&Talent", domain: "jobandtalent.com" },
  { token: "aleph", company: "Aleph", domain: "alephholding.com" },
  { token: "adlook", company: "Adlook", domain: "adlook.com" },
  { token: "tsmg", company: "TSMG", domain: "tsmg.io" },
  { token: "palantir", company: "Palantir", domain: "palantir.com" },
  { token: "weloglobal", company: "Welocalize", domain: "welocalize.com" },
] as const;

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

const dictionaryValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    return String((value as { value: unknown }).value);
  }
  return null;
};

const numericValue = (value: unknown) => {
  const parsed = Number(
    String(dictionaryValue(value) ?? value ?? "").replace(/[^0-9]/g, ""),
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const inferMode = (value: unknown): NormalizedJob["work_mode"] => {
  const label = String(dictionaryValue(value) ?? value ?? "").toLowerCase();
  if (label.includes("solo") && label.includes("tele")) return "Remoto";
  if (label.includes("tele") || label.includes("híbr")) return "Híbrido";
  return "Presencial";
};

function plainText(value: string) {
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

const EMAIL_IN_TEXT_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function applicationEmailFromInstructions(value: string) {
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

function emailApplicationRules(value: string) {
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

function domainFromUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function requirementLines(value: string) {
  const candidates = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(?:li|p|div)>/gi, "\n")
    .split(/\n+/)
    .map((line) => plainText(line).replace(/^[-*•–—\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 12 && line.length <= 240)
    .filter((line) =>
      /required|requirement|qualification|experience|degree|education|skill|language|proficien|knowledge|ability|must|essential|requisito|experiencia|titulaci[oó]n|idioma|conocimiento|capacidad/i
        .test(
          line,
        )
    );
  return uniqueStrings(candidates).slice(0, 8);
}

type TargetMarket =
  | "AR"
  | "AT"
  | "AU"
  | "BR"
  | "CA"
  | "CL"
  | "CO"
  | "DE"
  | "ES"
  | "FR"
  | "GB"
  | "IN"
  | "IT"
  | "MX"
  | "NL"
  | "NZ"
  | "PE"
  | "PL"
  | "PT"
  | "SG"
  | "TR"
  | "US"
  | "ZA"
  | "REMOTE";

function targetMarket(value: string): TargetMarket | null {
  if (/united states|\busa\b|\bu\.s\.\b|,\s*us\b/i.test(value)) return "US";
  if (/united kingdom|\buk\b|great britain|,\s*gb\b/i.test(value)) return "GB";
  if (/spain|españa|,\s*es\b/i.test(value)) return "ES";
  if (/turkey|türkiye|turkiye/i.test(value)) return "TR";
  if (/(?:^|[,;]\s*)mexico(?:$|[,;])|méxico|,\s*mx\b/i.test(value)) return "MX";
  if (/colombia/i.test(value)) return "CO";
  if (/argentina/i.test(value)) return "AR";
  if (/chile/i.test(value)) return "CL";
  if (/peru|perú/i.test(value)) return "PE";
  if (/brazil|brasil/i.test(value)) return "BR";
  if (/australia|,\s*au\b/i.test(value)) return "AU";
  if (/austria|österreich/i.test(value)) return "AT";
  if (/canada|canadá/i.test(value)) return "CA";
  if (/germany|deutschland|alemania/i.test(value)) return "DE";
  if (/france|francia/i.test(value)) return "FR";
  if (/india|,\s*in\b/i.test(value)) return "IN";
  if (/italy|italia/i.test(value)) return "IT";
  if (/netherlands|nederland|países bajos|paises bajos/i.test(value)) {
    return "NL";
  }
  if (/new zealand|aotearoa/i.test(value)) return "NZ";
  if (/poland|polska|polonia/i.test(value)) return "PL";
  if (/portugal/i.test(value)) return "PT";
  if (/singapore|singapur/i.test(value)) return "SG";
  if (/south africa|sudáfrica|sudafrica/i.test(value)) return "ZA";
  if (
    /new york|california|texas|florida|washington|boston|chicago|seattle|san francisco|los angeles/i
      .test(
        value,
      )
  ) {
    return "US";
  }
  if (
    /england|scotland|wales|london|manchester|birmingham|edinburgh/i.test(value)
  ) {
    return "GB";
  }
  if (
    /madrid|barcelona|málaga|malaga|valencia|sevilla|bilbao|galicia/i.test(
      value,
    )
  ) {
    return "ES";
  }
  if (/istanbul|İstanbul|ankara|izmir/i.test(value)) return "TR";
  if (/mexico city|ciudad de méxico|cdmx|guadalajara|monterrey/i.test(value)) {
    return "MX";
  }
  if (/bogot[aá]|medell[ií]n|\bcali\b|barranquilla/i.test(value)) return "CO";
  if (/buenos aires|c[oó]rdoba|rosario|mendoza/i.test(value)) return "AR";
  if (/santiago de chile|valpara[ií]so|concepci[oó]n/i.test(value)) return "CL";
  if (/\blima\b|arequipa|trujillo/i.test(value)) return "PE";
  if (
    /s[aã]o paulo|rio de janeiro|belo horizonte|bras[ií]lia|curitiba/i.test(
      value,
    )
  ) {
    return "BR";
  }
  if (/sydney|melbourne|brisbane|perth|adelaide/i.test(value)) return "AU";
  if (/vienna|wien|salzburg|graz/i.test(value)) return "AT";
  if (/toronto|vancouver|montreal|montréal|ottawa|calgary/i.test(value)) {
    return "CA";
  }
  if (/berlin|munich|münchen|hamburg|frankfurt|cologne|köln/i.test(value)) {
    return "DE";
  }
  if (/paris|lyon|marseille|toulouse|lille/i.test(value)) return "FR";
  if (/bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai/i.test(value)) {
    return "IN";
  }
  if (/milan|milano|rome|roma|turin|torino|bologna/i.test(value)) return "IT";
  if (/amsterdam|rotterdam|utrecht|eindhoven|the hague|den haag/i.test(value)) {
    return "NL";
  }
  if (/auckland|wellington|christchurch/i.test(value)) return "NZ";
  if (/warsaw|warszawa|krak[oó]w|wroclaw|wrocław|gdansk|gdańsk/i.test(value)) {
    return "PL";
  }
  if (/lisbon|lisboa|porto|braga|coimbra/i.test(value)) return "PT";
  if (/johannesburg|cape town|pretoria|durban/i.test(value)) return "ZA";
  if (/remote|anywhere|worldwide|global|europe|emea/i.test(value)) {
    return "REMOTE";
  }
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const result = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= items.length) return;
        result[index] = await mapper(items[index]);
      }
    }),
  );
  return result;
}

async function greenhouseJobs(
  requestedBoards: Set<string> | null = null,
): Promise<NormalizedJob[]> {
  const selectedBoards = requestedBoards
    ? greenhouseBoards.filter((board) => requestedBoards.has(board.token))
    : greenhouseBoards;
  const results = await Promise.allSettled(
    selectedBoards.map(async (board) => {
      const response = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true&pay_transparency=true`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(
          `Greenhouse ${board.token} respondió ${response.status}`,
        );
      }
      const payload = (await response.json()) as {
        jobs?: Array<{
          id: number;
          title: string;
          updated_at?: string;
          absolute_url: string;
          content?: string;
          location?: { name?: string };
          departments?: Array<{ name?: string }>;
          pay_input_ranges?: Array<{
            min_cents?: number;
            max_cents?: number;
            currency_type?: string;
            title?: string;
          }>;
        }>;
      };
      return (payload.jobs ?? [])
        .filter((job) => targetMarket(job.location?.name ?? ""))
        .map((job): NormalizedJob => {
          const description = plainText(job.content ?? "");
          const location = job.location?.name || "España";
          const provider = browserProvider(job.absolute_url);
          const payRange = job.pay_input_ranges?.find(
            (range) => range.currency_type === "EUR",
          ) ?? job.pay_input_ranges?.[0];
          const workMode = /remote|remoto/i.test(
              `${job.title} ${location} ${description}`,
            )
            ? "Remoto"
            : /hybrid|híbrido|hibrido/i.test(
                `${job.title} ${location} ${description}`,
              )
            ? "Híbrido"
            : "Presencial";
          return {
            source: "Greenhouse",
            external_id: `${board.token}:${job.id}`,
            company: board.company,
            title: job.title,
            summary: description.slice(0, 500),
            description,
            location,
            work_mode: workMode,
            salary_min: typeof payRange?.min_cents === "number"
              ? Math.round(payRange.min_cents / 100)
              : null,
            salary_max: typeof payRange?.max_cents === "number"
              ? Math.round(payRange.max_cents / 100)
              : null,
            contract_type: "Jornada completa",
            seniority: null,
            industry: job.departments?.[0]?.name ?? null,
            apply_mode: provider ? "direct" : "external",
            status: "active",
            published_at: job.updated_at ?? null,
            metadata: {
              source_url: job.absolute_url,
              canonical_apply_url: job.absolute_url,
              requirements: [],
              nice_to_have: [],
              company_domain: board.domain,
              logo_color: "#245C40",
              easy_apply: Boolean(provider),
              apply_provider: provider ?? "external",
              verified_source: "greenhouse_public_job_board",
              official_company_board: true,
              top_company: true,
              feed_priority: 90,
              job_board: board.token,
              imported_at: new Date().toISOString(),
              salary_currency: payRange?.currency_type ?? null,
              salary_interval: "year",
              salary_source: payRange ? "employer" : null,
              salary_title: payRange?.title ?? null,
              market_country: targetMarket(location),
            },
            target: {
              mode: provider ? "browser" : "external",
              apply_url: job.absolute_url,
              provider,
              metadata: { board_token: board.token },
            },
          };
        });
    }),
  );
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failures.length) {
    throw new Error(
      `${failures.length} boards de Greenhouse no respondieron: ${
        failures
          .map((failure) => errorMessage(failure.reason))
          .join("; ")
      }`,
    );
  }
  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}

async function leverJobs(): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(
    leverBoards.map(async (board) => {
      const response = await fetch(
        `https://api.lever.co/v0/postings/${board.token}?mode=json`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`Lever ${board.token} respondió ${response.status}`);
      }
      const payload = (await response.json()) as Array<{
        id: string;
        text?: string;
        descriptionPlain?: string;
        hostedUrl?: string;
        applyUrl?: string;
        createdAt?: number;
        workplaceType?: string;
        country?: string;
        categories?: {
          location?: string;
          commitment?: string;
          team?: string;
          department?: string;
        };
        salaryRange?: {
          currency?: string;
          interval?: string;
          min?: number;
          max?: number;
        };
      }>;
      return payload
        .filter((job) =>
          targetMarket(
            `${job.categories?.location ?? ""} ${job.country ?? ""}`,
          )
        )
        .slice(0, 150)
        .map((job): NormalizedJob => {
          const location = job.categories?.location || job.country || "España";
          const description = plainText(job.descriptionPlain ?? "");
          const applyUrl = job.applyUrl || job.hostedUrl || null;
          const workMode =
            job.workplaceType === "remote" || /remote|remoto/i.test(location)
              ? "Remoto"
              : job.workplaceType === "hybrid"
              ? "Híbrido"
              : "Presencial";
          return {
            source: "Empresa",
            external_id: `lever:${board.token}:${job.id}`,
            company: board.company,
            title: job.text || "Oferta de empleo",
            summary: description.slice(0, 500),
            description,
            location,
            work_mode: workMode,
            salary_min: typeof job.salaryRange?.min === "number"
              ? Math.round(job.salaryRange.min)
              : null,
            salary_max: typeof job.salaryRange?.max === "number"
              ? Math.round(job.salaryRange.max)
              : null,
            contract_type: job.categories?.commitment ?? null,
            seniority: null,
            industry: job.categories?.team ?? job.categories?.department ??
              null,
            apply_mode: applyUrl ? "direct" : "external",
            status: "active",
            published_at: typeof job.createdAt === "number"
              ? new Date(job.createdAt).toISOString()
              : null,
            metadata: {
              source_url: job.hostedUrl ?? applyUrl,
              canonical_apply_url: applyUrl,
              requirements: [],
              nice_to_have: [],
              company_domain: board.domain,
              logo_color: "#6C4CF1",
              easy_apply: Boolean(applyUrl),
              apply_provider: applyUrl ? "lever" : "external",
              verified_source: "lever_public_postings_api",
              salary_currency: job.salaryRange?.currency ?? null,
              salary_interval: job.salaryRange?.interval ?? "year",
              salary_source: job.salaryRange ? "employer" : null,
              market_country: targetMarket(`${location} ${job.country ?? ""}`),
            },
            target: {
              mode: applyUrl ? "browser" : "external",
              apply_url: applyUrl,
              provider: applyUrl ? "lever" : null,
              metadata: { site: board.token },
            },
          };
        });
    }),
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}

async function getOnBoardJobs(): Promise<NormalizedJob[]> {
  const pages = Math.min(
    5,
    Math.max(1, Number(Deno.env.get("GETONBOARD_PAGES") || 3)),
  );
  const jobs: NormalizedJob[] = [];

  for (let page = 1; page <= pages; page += 1) {
    const url = new URL("https://www.getonbrd.com/api/v0/search/jobs");
    url.searchParams.set("featured", "false");
    url.searchParams.set(
      "expand",
      JSON.stringify([
        "company",
        "seniority",
        "modality",
        "location_cities",
        "tags",
      ]),
    );
    url.searchParams.set("lang", "es");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "120");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Landeo job importer",
      },
    });
    if (!response.ok) {
      if (jobs.length) break;
      throw new Error(
        `Get on Board página ${page} respondió ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        attributes?: {
          title?: string;
          description?: string;
          projects?: string;
          functions?: string;
          benefits?: string;
          desirable?: string;
          remote?: boolean;
          remote_modality?: string;
          remote_zone?: string | null;
          countries?: string[];
          category_name?: string;
          perks?: string[];
          min_salary?: number | null;
          max_salary?: number | null;
          published_at?: number;
          applications_count?: number;
          location_cities?: {
            data?: Array<{ attributes?: { name?: string; country?: string } }>;
          };
          modality?: { data?: { attributes?: { name?: string } } };
          seniority?: { data?: { attributes?: { name?: string } } };
          tags?: { data?: Array<{ attributes?: { name?: string } }> };
          company?: {
            data?: {
              attributes?: { name?: string; logo?: string; country?: string };
            };
          };
        };
        links?: { public_url?: string };
      }>;
      meta?: { total_pages?: number };
    };

    for (const job of payload.data ?? []) {
      const attributes = job.attributes ?? {};
      const company = attributes.company?.data?.attributes;
      const cities = attributes.location_cities?.data ?? [];
      const countries = attributes.countries ?? [];
      const locationParts = cities
        .map((city) => city.attributes?.name)
        .filter((name): name is string => Boolean(name));
      const location = locationParts.length
        ? locationParts.join(", ")
        : attributes.remote_zone || countries.join(", ") || "Latinoamérica";
      const market = targetMarket(`${location} ${countries.join(" ")}`);
      if (!market) continue;

      const sections = [
        attributes.description,
        attributes.projects,
        attributes.functions,
        attributes.benefits,
        attributes.desirable,
      ].filter((value): value is string => Boolean(value));
      const description = plainText(sections.join("\n"));
      const applyUrl = job.links?.public_url ?? null;
      const remoteModality = attributes.remote_modality ?? "";
      const workMode: NormalizedJob["work_mode"] =
        attributes.remote || /fully_remote|remote_local/i.test(remoteModality)
          ? "Remoto"
          : /hybrid|temporarily_remote/i.test(remoteModality)
          ? "Híbrido"
          : "Presencial";
      const tags = (attributes.tags?.data ?? [])
        .map((tag) => tag.attributes?.name)
        .filter((name): name is string => Boolean(name));

      jobs.push({
        source: "Empresa",
        external_id: `getonboard:${job.id}`,
        company: company?.name || "Empresa en Get on Board",
        title: attributes.title || "Oferta de empleo",
        summary: description.slice(0, 500),
        description,
        location,
        work_mode: workMode,
        salary_min: typeof attributes.min_salary === "number"
          ? Math.round(attributes.min_salary)
          : null,
        salary_max: typeof attributes.max_salary === "number"
          ? Math.round(attributes.max_salary)
          : null,
        contract_type: attributes.modality?.data?.attributes?.name ?? null,
        seniority: attributes.seniority?.data?.attributes?.name ?? null,
        industry: attributes.category_name ?? null,
        apply_mode: "external",
        status: "active",
        published_at: typeof attributes.published_at === "number"
          ? new Date(attributes.published_at * 1_000).toISOString()
          : null,
        metadata: {
          source_url: applyUrl,
          canonical_apply_url: applyUrl,
          requirements: [],
          nice_to_have: tags,
          perks: attributes.perks ?? [],
          applicants: attributes.applications_count ?? 0,
          company_logo_url: company?.logo ?? null,
          logo_color: "#6039D4",
          easy_apply: false,
          apply_provider: "external",
          verified_source: "getonboard_public_api",
          salary_currency: "USD",
          salary_interval: "month",
          salary_source: attributes.min_salary || attributes.max_salary
            ? "employer"
            : null,
          market_country: market,
        },
        target: {
          mode: "external",
          apply_url: applyUrl,
          provider: null,
          metadata: { source: "getonboard_public_api", market_country: market },
        },
      });
    }

    if (page >= (payload.meta?.total_pages ?? page)) break;
  }

  if (!jobs.length) {
    throw new Error(
      "Get on Board no devolvió ofertas para los mercados compatibles",
    );
  }
  return jobs;
}

function browserProvider(value: string | null) {
  if (!value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (
      hostname === "greenhouse.io" ||
      hostname.endsWith(".greenhouse.io") ||
      hostname === "greenhouse.com" ||
      hostname.endsWith(".greenhouse.com")
    ) {
      return "greenhouse" as const;
    }
    if (hostname === "lever.co" || hostname.endsWith(".lever.co")) {
      return "lever" as const;
    }
  } catch {
    return null;
  }
  return null;
}

async function infoJobsJobs(): Promise<NormalizedJob[]> {
  const clientId = required("INFOJOBS_CLIENT_ID");
  const clientSecret = required("INFOJOBS_CLIENT_SECRET");
  const authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  const response = await fetch(
    "https://api.infojobs.net/api/9/offer?country=espana&sinceDate=_7_DAYS&order=updated-desc&maxResults=30",
    { headers: { Authorization: authorization, Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`InfoJobs respondió ${response.status}`);
  const payload = (await response.json()) as {
    offers?: Array<Record<string, unknown>>;
  };

  return Promise.all(
    (payload.offers ?? []).map(async (offer) => {
      const id = String(offer.id);
      const detailResponse = await fetch(
        `https://api.infojobs.net/api/7/offer/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: authorization, Accept: "application/json" },
        },
      );
      const detail = detailResponse.ok
        ? ((await detailResponse.json()) as Record<string, unknown>)
        : offer;
      const author = (detail.author ?? offer.author ?? {}) as Record<
        string,
        unknown
      >;
      const externalUrl =
        typeof detail.externalUrlForm === "string" && detail.externalUrlForm
          ? detail.externalUrlForm
          : null;
      const link = typeof detail.link === "string"
        ? detail.link
        : typeof offer.link === "string"
        ? offer.link
        : null;
      const city = String(detail.city ?? offer.city ?? "España");
      const province = dictionaryValue(detail.province ?? offer.province);
      const description = String(
        detail.description ?? detail.minRequirements ?? offer.title ?? "",
      );
      const applicationQuestions: Array<Record<string, unknown>> = [];
      if (detail.hasKillerQuestions) {
        const questionsResponse = await fetch(
          `https://api.infojobs.net/api/1/offer/${
            encodeURIComponent(
              id,
            )
          }/killerquestion`,
          {
            headers: {
              Authorization: authorization,
              Accept: "application/json",
            },
          },
        );
        if (questionsResponse.ok) {
          const rawQuestions = (await questionsResponse.json()) as
            | Array<{
              id: number;
              question: string;
              answers?: Array<{ id: number; answer: string }>;
            }>
            | {
              killerQuestions?: Array<{
                id: number;
                question: string;
                answers?: Array<{ id: number; answer: string }>;
              }>;
            };
          const questions = Array.isArray(rawQuestions)
            ? rawQuestions
            : (rawQuestions.killerQuestions ?? []);
          for (const question of questions) {
            applicationQuestions.push({
              id: String(question.id),
              label: question.question,
              kind: "choice",
              options: (question.answers ?? []).map((answer) => ({
                id: String(answer.id),
                label: answer.answer,
              })),
            });
          }
        }
      }
      if (detail.hasOpenQuestions) {
        const questionsResponse = await fetch(
          `https://api.infojobs.net/api/1/offer/${
            encodeURIComponent(
              id,
            )
          }/openquestion`,
          {
            headers: {
              Authorization: authorization,
              Accept: "application/json",
            },
          },
        );
        if (questionsResponse.ok) {
          const rawQuestions = (await questionsResponse.json()) as
            | Array<{ id: number; question: string }>
            | { openQuestions?: Array<{ id: number; question: string }> };
          const questions = Array.isArray(rawQuestions)
            ? rawQuestions
            : (rawQuestions.openQuestions ?? []);
          for (const question of questions) {
            applicationQuestions.push({
              id: String(question.id),
              label: question.question,
              kind: "text",
            });
          }
        }
      }

      return {
        source: "InfoJobs",
        external_id: id,
        company: String(author.name ?? author.value ?? "Empresa en InfoJobs"),
        title: String(detail.title ?? offer.title ?? "Oferta de empleo"),
        summary: description.slice(0, 500),
        description,
        location: province && !city.includes(province)
          ? `${city}, ${province}`
          : city,
        work_mode: inferMode(detail.teleworking ?? offer.teleworking),
        salary_min: numericValue(detail.salaryMin ?? offer.salaryMin),
        salary_max: numericValue(detail.salaryMax ?? offer.salaryMax),
        contract_type: dictionaryValue(
          detail.contractType ?? offer.contractType,
        ),
        seniority: dictionaryValue(detail.experienceMin ?? offer.experienceMin),
        industry: dictionaryValue(detail.category ?? offer.category),
        apply_mode: externalUrl
          ? "external"
          : applicationQuestions.length
          ? "questions"
          : "direct",
        status: "active",
        published_at: String(
          detail.creationDate ?? offer.published ?? offer.updated ?? "",
        ) || null,
        metadata: {
          applicants: Number(detail.applications ?? offer.applications ?? 0),
          source_url: link,
          requirements: [],
          nice_to_have: [],
          application_questions: applicationQuestions,
          logo_color: "#EF4136",
          easy_apply: !externalUrl,
          apply_provider: externalUrl ? "external" : "infojobs",
          market_country: "ES",
        },
        target: {
          mode: externalUrl ? "external" : "infojobs",
          apply_url: externalUrl ?? link,
          provider: externalUrl ? null : "infojobs",
          metadata: {},
        },
      };
    }),
  );
}

async function adzunaJobs(): Promise<NormalizedJob[]> {
  const appId = required("ADZUNA_APP_ID");
  const appKey = required("ADZUNA_APP_KEY");
  const pages = Math.min(
    6,
    Math.max(1, Number(Deno.env.get("ADZUNA_PAGES") || 2)),
  );
  const markets = [
    { endpoint: "es", code: "ES", currency: "EUR", defaultLocation: "España" },
    {
      endpoint: "us",
      code: "US",
      currency: "USD",
      defaultLocation: "United States",
    },
    {
      endpoint: "gb",
      code: "GB",
      currency: "GBP",
      defaultLocation: "United Kingdom",
    },
    { endpoint: "mx", code: "MX", currency: "MXN", defaultLocation: "México" },
    { endpoint: "br", code: "BR", currency: "BRL", defaultLocation: "Brasil" },
    {
      endpoint: "au",
      code: "AU",
      currency: "AUD",
      defaultLocation: "Australia",
    },
    { endpoint: "at", code: "AT", currency: "EUR", defaultLocation: "Austria" },
    { endpoint: "ca", code: "CA", currency: "CAD", defaultLocation: "Canada" },
    { endpoint: "de", code: "DE", currency: "EUR", defaultLocation: "Germany" },
    { endpoint: "fr", code: "FR", currency: "EUR", defaultLocation: "France" },
    { endpoint: "in", code: "IN", currency: "INR", defaultLocation: "India" },
    { endpoint: "it", code: "IT", currency: "EUR", defaultLocation: "Italy" },
    {
      endpoint: "nl",
      code: "NL",
      currency: "EUR",
      defaultLocation: "Netherlands",
    },
    {
      endpoint: "nz",
      code: "NZ",
      currency: "NZD",
      defaultLocation: "New Zealand",
    },
    { endpoint: "pl", code: "PL", currency: "PLN", defaultLocation: "Poland" },
    {
      endpoint: "sg",
      code: "SG",
      currency: "SGD",
      defaultLocation: "Singapore",
    },
    {
      endpoint: "za",
      code: "ZA",
      currency: "ZAR",
      defaultLocation: "South Africa",
    },
  ] as const;

  const marketResults = await Promise.allSettled(
    markets.map(async (market) => {
      const payloads: Array<{ results?: Array<Record<string, unknown>> }> = [];
      for (let index = 0; index < pages; index += 1) {
        if (index) await new Promise((resolve) => setTimeout(resolve, 900));
        const url = new URL(
          `https://api.adzuna.com/v1/api/jobs/${market.endpoint}/search/${
            index + 1
          }`,
        );
        url.searchParams.set("app_id", appId);
        url.searchParams.set("app_key", appKey);
        url.searchParams.set("results_per_page", "50");
        url.searchParams.set("sort_by", "date");
        url.searchParams.set("content-type", "application/json");
        let response: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          if (response.status !== 429) break;
          const retryAfter = Number(response.headers.get("retry-after"));
          await response.body?.cancel();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Number.isFinite(retryAfter) && retryAfter > 0
                ? retryAfter * 1000
                : 1_500 * (attempt + 1),
            )
          );
        }
        if (!response?.ok) {
          if (payloads.length) break;
          throw new Error(
            `Adzuna ${market.code} página ${index + 1} respondió ${
              response?.status ?? "sin respuesta"
            }`,
          );
        }
        payloads.push(
          (await response.json()) as {
            results?: Array<Record<string, unknown>>;
          },
        );
      }
      const uniqueOffers = [
        ...new Map(
          payloads
            .flatMap((payload) => payload.results ?? [])
            .map((offer) => [String(offer.id), offer]),
        ).values(),
      ];
      return await mapWithConcurrency(
        uniqueOffers,
        6,
        async (offer): Promise<NormalizedJob> => {
          const company = (offer.company ?? {}) as Record<string, unknown>;
          const location = (offer.location ?? {}) as Record<string, unknown>;
          const category = (offer.category ?? {}) as Record<string, unknown>;
          const description = String(offer.description ?? "");
          const sourceUrl = typeof offer.redirect_url === "string"
            ? offer.redirect_url
            : null;
          const applyUrl = sourceUrl;
          const provider = null;
          return {
            source: "Adzuna",
            external_id: market.code === "ES"
              ? String(offer.id)
              : `${market.endpoint}:${String(offer.id)}`,
            company: String(company.display_name ?? "Empresa"),
            title: String(offer.title ?? "Oferta de empleo"),
            summary: description.slice(0, 500),
            description,
            location: String(location.display_name ?? market.defaultLocation),
            work_mode: /remote|remoto|teletrabajo/i.test(
                `${offer.title} ${description}`,
              )
              ? "Remoto"
              : "Presencial",
            salary_min: typeof offer.salary_min === "number"
              ? Math.round(offer.salary_min)
              : null,
            salary_max: typeof offer.salary_max === "number"
              ? Math.round(offer.salary_max)
              : null,
            contract_type: typeof offer.contract_type === "string"
              ? offer.contract_type
              : null,
            seniority: null,
            industry: typeof category.label === "string"
              ? category.label
              : null,
            apply_mode: provider ? "direct" : "external",
            status: "active",
            published_at: typeof offer.created === "string"
              ? offer.created
              : null,
            metadata: {
              source_url: sourceUrl,
              canonical_apply_url: applyUrl,
              requirements: [],
              nice_to_have: [],
              logo_color: "#1778F2",
              easy_apply: Boolean(provider),
              apply_provider: provider ?? "external",
              salary_currency: market.currency,
              salary_interval: "year",
              salary_source: offer.salary_is_predicted
                ? "adzuna_estimate"
                : offer.salary_min || offer.salary_max
                ? "employer"
                : null,
              market_country: market.code,
            },
            target: {
              mode: provider ? "browser" : "external",
              apply_url: applyUrl,
              provider,
              metadata: { source_url: sourceUrl, market_country: market.code },
            },
          };
        },
      );
    }),
  );

  const jobs = marketResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  if (!jobs.length) {
    throw new Error("Adzuna no devolvió ofertas para ningún mercado");
  }
  return jobs;
}

async function reliefWebJobs(): Promise<NormalizedJob[]> {
  const appName = required("RELIEFWEB_APP_NAME");
  const url = new URL("https://api.reliefweb.int/v2/jobs");
  url.searchParams.set("appname", appName);
  url.searchParams.set("limit", "1000");
  url.searchParams.set("preset", "latest");
  url.searchParams.set("profile", "full");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Landeo/1.0" },
  });
  if (!response.ok) {
    throw new Error(`ReliefWeb respondió ${response.status}`);
  }
  const payload = (await response.json()) as {
    data?: Array<{
      id: number | string;
      fields?: {
        title?: string;
        body?: string;
        "body-html"?: string;
        how_to_apply?: string;
        "how_to_apply-html"?: string;
        url?: string;
        url_alias?: string;
        status?: string;
        date?: {
          created?: string;
          changed?: string;
          closing?: string;
        };
        closing_date?: string;
        source?: Array<{
          name?: string;
          longname?: string;
          homepage?: string;
        }>;
        country?: Array<{ name?: string; iso3?: string; primary?: boolean }>;
        city?: Array<{ name?: string }>;
        type?: Array<{ name?: string }> | { name?: string };
        career_categories?: Array<{ name?: string }>;
        job_experience?: Array<{ name?: string }> | { name?: string };
      };
    }>;
  };

  return (payload.data ?? []).flatMap((entry): NormalizedJob[] => {
    const fields = entry.fields ?? {};
    const source = fields.source?.[0];
    const sourceUrl = fields.url || fields.url_alias ||
      `https://reliefweb.int/job/${entry.id}`;
    if (!/^https:\/\//i.test(sourceUrl)) return [];
    const rawDescription = fields["body-html"] || fields.body || "";
    const description = plainText(rawDescription);
    const rawInstructions = fields["how_to_apply-html"] ||
      fields.how_to_apply || "";
    const instructions = plainText(rawInstructions);
    const emailCandidate = applicationEmailFromInstructions(rawInstructions);
    const rules = emailApplicationRules(rawInstructions);
    const automaticEmail = Boolean(
      emailCandidate && !rules.asksForOnlineForm &&
        !rules.manualDocuments.length,
    );
    const countries = fields.country ?? [];
    const cities = fields.city ?? [];
    const location = uniqueStrings([
      ...cities.map((city) => city.name ?? ""),
      ...countries.map((country) => country.name ?? ""),
    ]).join(", ") || "Internacional";
    const market = targetMarket(location) ||
      (/remote|home.?based|worldwide|international/i.test(
          `${fields.title ?? ""} ${description}`,
        )
        ? "REMOTE"
        : null);
    const types = Array.isArray(fields.type)
      ? fields.type
      : fields.type
      ? [fields.type]
      : [];
    const experiences = Array.isArray(fields.job_experience)
      ? fields.job_experience
      : fields.job_experience
      ? [fields.job_experience]
      : [];
    const categories = fields.career_categories ?? [];
    const company = source?.longname || source?.name ||
      "Organización humanitaria";
    const domain = domainFromUrl(source?.homepage);
    const workMode: NormalizedJob["work_mode"] =
      /remote|home.?based|telework|teletrabajo|remoto/i.test(
          `${fields.title ?? ""} ${location} ${description}`,
        )
        ? "Remoto"
        : /hybrid|híbrido|hibrido/i.test(description)
        ? "Híbrido"
        : "Presencial";

    return [{
      source: "ReliefWeb",
      external_id: `reliefweb:${entry.id}`,
      company,
      title: fields.title || "Oferta de empleo",
      summary: description.slice(0, 500),
      description,
      location,
      work_mode: workMode,
      salary_min: null,
      salary_max: null,
      contract_type: types.map((type) =>
        type.name
      ).filter(Boolean).join(", ") ||
        null,
      seniority: experiences.map((experience) =>
        experience.name
      ).filter(Boolean).join(", ") ||
        null,
      industry: categories.map((category) =>
        category.name
      ).filter(Boolean).join(", ") ||
        "Humanitario y cooperación",
      apply_mode: automaticEmail ? "direct" : "external",
      status: "active",
      published_at: fields.date?.created ?? fields.date?.changed ?? null,
      metadata: {
        source_url: sourceUrl,
        canonical_apply_url: sourceUrl,
        requirements: requirementLines(rawDescription),
        nice_to_have: categories.map((category) =>
          category.name
        ).filter(Boolean),
        company_domain: domain,
        logo_color: "#147A68",
        easy_apply: automaticEmail,
        apply_provider: automaticEmail ? "email" : "external",
        verified_source: "reliefweb_public_api",
        verified_at: new Date().toISOString(),
        closing_date: fields.date?.closing ?? fields.closing_date ?? null,
        market_country: market,
      },
      target: {
        mode: automaticEmail ? "email" : "external",
        apply_email: automaticEmail ? emailCandidate?.email ?? null : null,
        apply_url: sourceUrl,
        provider: null,
        metadata: {
          source: "reliefweb_public_api",
          market_country: market,
          application_instructions: instructions,
          email_evidence: emailCandidate?.context ?? null,
          email_confidence_score: emailCandidate?.score ?? 0,
          required_documents: rules.requiredDocuments,
          email_subject: rules.subject,
          discovered_urls: rules.urls,
          rejected_manual_documents: rules.manualDocuments,
          requires_online_form: rules.asksForOnlineForm,
        },
        email_authorized: automaticEmail,
        email_authorized_at: automaticEmail ? new Date().toISOString() : null,
        email_source_url: automaticEmail ? sourceUrl : null,
      },
    }];
  });
}

async function remotiveJobs(): Promise<NormalizedJob[]> {
  const response = await fetch("https://remotive.com/api/remote-jobs", {
    headers: { Accept: "application/json", "User-Agent": "Landeo/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Remotive respondió ${response.status}`);
  }
  const payload = (await response.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      title: string;
      company_name: string;
      category?: string;
      job_type?: string;
      publication_date?: string;
      candidate_required_location?: string;
      salary?: string;
      description?: string;
    }>;
  };
  return (payload.jobs ?? []).map((job): NormalizedJob => {
    const location = job.candidate_required_location || "Worldwide";
    const market = /worldwide|anywhere|global|europe|emea/i.test(location)
      ? "REMOTE"
      : targetMarket(location) || "REMOTE";
    const description = plainText(job.description ?? "");
    return {
      source: "Remotive",
      external_id: `remotive:${job.id}`,
      company: job.company_name || "Company",
      title: job.title || "Remote role",
      summary: description.slice(0, 500),
      description,
      location,
      work_mode: "Remoto",
      salary_min: null,
      salary_max: null,
      contract_type: job.job_type ?? null,
      seniority: null,
      industry: job.category ?? null,
      apply_mode: "external",
      status: "active",
      published_at: job.publication_date ?? null,
      metadata: {
        source_url: job.url,
        canonical_apply_url: job.url,
        requirements: [],
        nice_to_have: [],
        salary_text: job.salary || null,
        easy_apply: false,
        apply_provider: "external",
        verified_source: "remotive_public_api",
        market_country: market,
      },
      target: {
        mode: "external",
        apply_url: job.url,
        provider: null,
        metadata: { source_url: job.url, market_country: market },
      },
    };
  });
}

async function saveJobs(supabase: any, jobs: NormalizedJob[]) {
  if (!jobs.length) return 0;
  let saved = 0;
  const batchSize = 200;
  for (let start = 0; start < jobs.length; start += batchSize) {
    const batch = jobs.slice(start, start + batchSize);
    const rows = batch.map(({ target: _target, ...job }) => job);
    const { data, error } = await supabase
      .from("jobs")
      .upsert(rows, {
        onConflict: "source,external_id",
      })
      .select("id,source,external_id");
    if (error) throw error;
    const ids = new Map(
      (data ?? []).map(
        (row: { id: string; source: string; external_id: string }) => [
          `${row.source}:${row.external_id}`,
          row.id,
        ],
      ),
    );
    const targets = batch.flatMap((job) => {
      const jobId = ids.get(`${job.source}:${job.external_id}`);
      return jobId ? [{ job_id: jobId, ...job.target }] : [];
    });
    if (targets.length) {
      // Nunca sustituimos un canal de email que un administrador ya verificó
      // contra una fuente oficial. Las importaciones periódicas solo actualizan
      // los destinos no verificados procedentes de los job boards.
      const targetJobIds = targets.map((target) => target.job_id);
      const { data: protectedTargets, error: protectedTargetsError } =
        await supabase
          .from("job_application_targets")
          .select("job_id")
          .in("job_id", targetJobIds)
          .eq("mode", "email")
          .eq("email_authorized", true);
      if (protectedTargetsError) throw protectedTargetsError;
      const protectedJobIds = new Set(
        (protectedTargets ?? []).map(
          (target: { job_id: string }) => target.job_id,
        ),
      );
      const mutableTargets = targets.filter(
        (target) => !protectedJobIds.has(target.job_id),
      );
      if (!mutableTargets.length) continue;
      const { error: targetError } = await supabase
        .from("job_application_targets")
        .upsert(mutableTargets, { onConflict: "job_id" });
      if (targetError) throw targetError;
    }
    saved += data?.length ?? 0;
  }
  return saved;
}

async function deactivateMissingGreenhouse(
  supabase: any,
  jobs: NormalizedJob[],
  selectedBoards: Set<string>,
) {
  const currentExternalIds = new Set(jobs.map((job) => job.external_id));
  const staleIds: string[] = [];
  const pageSize = 1000;
  for (let start = 0;; start += pageSize) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id,external_id")
      .eq("source", "Greenhouse")
      .eq("status", "active")
      .range(start, start + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const board = String(row.external_id ?? "").split(":", 1)[0];
      if (
        selectedBoards.has(board) &&
        !currentExternalIds.has(row.external_id)
      ) staleIds.push(row.id);
    }
    if ((data?.length ?? 0) < pageSize) break;
  }
  for (let start = 0; start < staleIds.length; start += 200) {
    const { error } = await supabase
      .from("jobs")
      .update({ status: "closed" })
      .in("id", staleIds.slice(start, start + 200));
    if (error) throw error;
  }
  return staleIds.length;
}

Deno.serve(async (request) => {
  try {
    if (request.method !== "POST") {
      return json({ error: "Método no permitido" }, 405);
    }
    const importSecret = required("IMPORT_JOBS_SECRET");
    const bearerToken = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    const authorizedWithServiceRole =
      bearerToken === required("SUPABASE_SERVICE_ROLE_KEY");
    if (
      request.headers.get("x-import-secret") !== importSecret &&
      !authorizedWithServiceRole
    ) {
      return json({ error: "No autorizado" }, 401);
    }

    const supabase = createClient(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const { error: repairVerifiedEmailsError } = await supabase
      .from("job_application_targets")
      .update({ mode: "email", provider: null })
      .eq("email_authorized", true)
      .not("apply_email", "is", null)
      .neq("mode", "email");
    if (repairVerifiedEmailsError) throw repairVerifiedEmailsError;

    const payload = await request.json().catch(() => ({})) as {
      sources?: string[];
      boards?: string[];
    };
    const requestedSources = Array.isArray(payload.sources)
      ? new Set(payload.sources.map((source) => source.toLowerCase()))
      : null;
    const requestedGreenhouseBoards = Array.isArray(payload.boards)
      ? new Set(payload.boards.map((board) => board.toLowerCase()))
      : null;
    if (requestedGreenhouseBoards) {
      const knownBoards = new Set<string>(
        greenhouseBoards.map((board) => board.token),
      );
      const unknownBoards = [...requestedGreenhouseBoards].filter(
        (board) => !knownBoards.has(board),
      );
      if (unknownBoards.length) {
        return json(
          {
            error: `Boards de Greenhouse desconocidos: ${
              unknownBoards.join(", ")
            }`,
          },
          400,
        );
      }
    }
    const sourceTasks = [
      { name: "Adzuna", load: adzunaJobs },
      { name: "Get on Board", load: getOnBoardJobs },
      {
        name: "Greenhouse",
        load: () => greenhouseJobs(requestedGreenhouseBoards),
      },
      { name: "Lever", load: leverJobs },
      { name: "Remotive", load: remotiveJobs },
    ];
    if (Deno.env.get("RELIEFWEB_APP_NAME")) {
      sourceTasks.unshift({ name: "ReliefWeb", load: reliefWebJobs });
    }
    if (
      Deno.env.get("INFOJOBS_CLIENT_ID") &&
      Deno.env.get("INFOJOBS_CLIENT_SECRET")
    ) {
      sourceTasks.unshift({ name: "InfoJobs", load: infoJobsJobs });
    }
    const selectedTasks = requestedSources
      ? sourceTasks.filter((source) =>
        requestedSources.has(source.name.toLowerCase())
      )
      : sourceTasks;
    if (!selectedTasks.length) {
      return json({ error: "No se reconoció ninguna fuente solicitada" }, 400);
    }
    const imported: Record<string, number> = {};
    const deactivated: Record<string, number> = {};
    const errors: string[] = [];
    for (const source of selectedTasks) {
      try {
        const jobs = await source.load();
        imported[source.name] = await saveJobs(supabase, jobs);
        if (source.name === "Greenhouse") {
          deactivated[source.name] = await deactivateMissingGreenhouse(
            supabase,
            jobs,
            requestedGreenhouseBoards ??
              new Set(greenhouseBoards.map((board) => board.token)),
          );
        }
      } catch (sourceError) {
        errors.push(`${source.name}: ${errorMessage(sourceError)}`);
      }
    }
    return json({ imported, deactivated, errors });
  } catch (error) {
    return json(
      {
        error: errorMessage(error),
      },
      500,
    );
  }
});
