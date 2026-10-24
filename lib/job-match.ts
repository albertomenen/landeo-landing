import { resolveCountryCode } from "./job-location.ts";

export type MatchProfile = {
  role: string;
  location: string;
  skills: string[];
  workModes: string[];
  minSalary: number | null;
  maxSalary: number | null;
  yearsExperience: number;
  country: string;
  workAuthorizationCountries?: string[];
  visaRequirement?: string;
};

export type MatchableJob = {
  title: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  seniority: string | null;
  metadata: Record<string, unknown> | null;
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "your", "you", "de", "del", "la", "el", "los", "las", "para", "con", "en", "y", "un", "una",
  "senior", "junior", "mid", "lead", "intern", "internship", "engineer", "engineering", "developer", "manager", "specialist",
]);

function clean(value: string | null) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

const ROLE_ALIASES: Array<{ match: RegExp; terms: string }> = [
  { match: /marketing|mercadotecnia|comunicacion/, terms: "marketing marketer growth brand content communications demand generation acquisition lifecycle seo sem performance go-to-market community" },
  { match: /software|ingenier|developer|programador|frontend|backend|full.?stack|web developer/, terms: "software engineering developer frontend backend fullstack mobile platform devops" },
  { match: /product|producto/, terms: "product product-management product-owner product-operations" },
  { match: /design|disen|ux|ui/, terms: "design designer ux ui product-design research" },
  { match: /sales|ventas|comercial/, terms: "sales account executive business development partnerships revenue" },
  { match: /data|datos|analytics/, terms: "data analytics analyst machine-learning artificial-intelligence" },
  { match: /human resources|recursos humanos|talent|people/, terms: "recruiting recruiter talent people human-resources hr" },
  { match: /finance|finanzas|accounting|contab|auditor|fp&a|riesgo/, terms: "finance financial accounting accountant controller contabilidad contador financiero finanzas tesoreria auditoria audit risk riesgo" },
  { match: /consult/, terms: "consulting consultant strategy consultor consultoria estrategia" },
  { match: /operaciones|operations|supply|suministro|logistic|compras|procurement|project management|gestion de proyectos|clientes|customer/, terms: "operations operaciones logistics logistica supply-chain suministro procurement compras purchasing coordinator coordinador project-manager administrative administrativo customer-service atencion-al-cliente customer-success soporte support" },
  { match: /legal|abogad|compliance|cumplimiento/, terms: "legal lawyer abogado counsel compliance cumplimiento paralegal contracts contratos" },
  { match: /salud|health|medic|enfermer|clinic|farmac|pharma/, terms: "health salud medical medico nurse enfermero clinical clinico pharma farmaceutico" },
];

type RoleFamily = "software" | "marketing" | "product" | "design" | "sales" | "data" | "people" | "finance" | "consulting" | "operations" | "legal" | "health";

const FAMILY_PATTERNS: Array<[RoleFamily, RegExp]> = [
  ["software", /frontend|backend|full.?stack|software|developer|programador|devops|web development|mobile development/],
  ["marketing", /marketing|mercadotecnia|comunicacion|growth|brand|content|seo|sem\b|publicidad|community manager|redes sociales/],
  ["product", /product manager|product owner|product operations|producto/],
  ["design", /product design|ux|ui\b|designer|disen/],
  ["sales", /sales|ventas|vendedor|account executive|business development|comercial|ejecutivo de cuentas/],
  ["data", /data|datos|analytics|machine learning|artificial intelligence|\bai\b/],
  ["people", /human resources|recursos humanos|rrhh|talent|talento|recruit|reclutad|seleccion de personal|people operations|capital humano|gestion humana/],
  ["finance", /finance|finanzas|financier|accounting|accountant|contab|contador|controller|tesorer|auditor|audit|impuesto|nomina|fp&a|riesgo|risk/],
  ["consulting", /consulting|consultant|consultor|consultoria/],
  ["legal", /\blegal\b|abogad|lawyer|counsel|compliance|cumplimiento|paralegal/],
  ["health", /salud|health|medic|enfermer|nurse|clinic|farmac|pharma/],
  ["operations", /operaciones|operations|logistic|supply|suministro|compras|procurement|purchasing|project manage|project management|gestion de proyectos|coordinador|coordinator|administrativ|customer service|atencion al cliente|servicio al cliente|soporte|customer success|customer support|customer operations|operaciones de clientes/],
];

function normalizedRole(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Every family a (possibly multi-specialty) role belongs to, in priority order. */
function roleFamilies(value: string): RoleFamily[] {
  const normalized = normalizedRole(value);
  return FAMILY_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(([family]) => family);
}

function roleFamily(value: string): RoleFamily | null {
  return roleFamilies(value)[0] ?? null;
}

function jobRoleFamily(row: MatchableJob): RoleFamily | null {
  const title = `${row.title} ${row.metadata?.department ?? ""} ${row.metadata?.team ?? ""}`;
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fullText = `${normalized} ${clean(row.summary)} ${clean(row.description)}`.toLowerCase();
  if (/frontend|backend|full.?stack|software|developer|programmer|devops|web engineer|mobile engineer|ios engineer|android engineer/.test(normalized)) return "software";
  if (/\bengineer\b/.test(normalized) && /javascript|typescript|react|node|python|java|golang|software|api|cloud|kotlin|swift/.test(fullText)) return "software";
  return roleFamily(normalized);
}

export function isJobProfessionallyRelevant(row: MatchableJob, profile: MatchProfile | null) {
  if (!profile?.role.trim()) return true;
  const desiredFamilies = roleFamilies(profile.role);
  if (!desiredFamilies.length) return overlap(roleTokens(profile.role), tokens(`${row.title} ${row.metadata?.department ?? ""}`)) > 0;
  const jobFamily = jobRoleFamily(row);
  if (jobFamily && desiredFamilies.includes(jobFamily)) return true;
  const skillHits = overlap(tokens(profile.skills.join(" ")), tokens(`${row.title} ${clean(row.summary)}`));
  return skillHits > 0;
}

function roleTokens(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const alias = ROLE_ALIASES.find((group) => group.match.test(normalized));
  return tokens(`${value} ${alias?.terms ?? ""}`);
}

function overlap(left: Set<string>, right: Set<string>) {
  let total = 0;
  for (const token of left) if (right.has(token)) total++;
  return total;
}

function expectedExperience(value: string | null, title: string) {
  const text = `${value ?? ""} ${title}`.toLowerCase();
  if (/intern|graduate|entry|beca|práctic|emerging talent/.test(text)) return [0, 2] as const;
  if (/junior|associate/.test(text)) return [0, 3] as const;
  if (/senior|staff|principal|lead|head|director|expert/.test(text)) return [5, 30] as const;
  return [2, 8] as const;
}

function workMode(value: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("remot")) return "remote";
  if (normalized.includes("híbr") || normalized.includes("hybrid")) return "hybrid";
  return "onsite";
}

function metadataBoolean(metadata: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "available", "supported", "1"].includes(normalized)) return true;
      if (["false", "no", "unavailable", "not supported", "0"].includes(normalized)) return false;
    }
  }
  return null;
}

function authorizationContext(row: MatchableJob, profile: MatchProfile | null) {
  const requirement = profile?.visaRequirement?.trim().toLowerCase() ?? "";
  const explicitlyNoSponsorship = /\b(no|without|sin)\b/.test(requirement);
  const requiresSponsorship = !explicitlyNoSponsorship && (requirement.includes("sponsor") || requirement.includes("patrocin"));
  const unknown = !requirement || requirement.includes("unknown") || requirement.includes("desconoc");
  const sponsorship = metadataBoolean(row.metadata, [
    "visa_sponsorship",
    "sponsorship_available",
    "sponsors_visa",
    "work_visa_sponsorship",
  ]);
  const authorizedCountries = new Set(
    (profile?.workAuthorizationCountries ?? [])
      .map((country) => resolveCountryCode(country, country))
      .filter(Boolean),
  );
  const market = String(row.metadata?.market_country ?? "").toUpperCase();
  const jobCountry = market && market !== "REMOTE"
    ? market
    : resolveCountryCode("", row.location ?? "");
  const remoteGlobal = workMode(row.work_mode) === "remote" && (
    market === "REMOTE" ||
    /\b(global|worldwide|anywhere|latam|latin america|emea|europe)\b/i.test(row.location ?? "")
  );
  return { requirement, requiresSponsorship, unknown, sponsorship, authorizedCountries, jobCountry, remoteGlobal };
}

/**
 * Only removes a job when the source gives us enough information to know the
 * candidate cannot legally work there. Unknown sponsorship data stays visible
 * and is handled as a ranking signal instead of emptying the feed.
 */
export function isJobWorkAuthorizationCompatible(row: MatchableJob, profile: MatchProfile | null) {
  if (!profile) return true;
  const context = authorizationContext(row, profile);
  if (context.unknown) return true;
  if (context.requiresSponsorship) return context.sponsorship !== false;
  if (!context.authorizedCountries.size || !context.jobCountry || context.remoteGlobal) return true;
  return context.authorizedCountries.has(context.jobCountry);
}

export function calculateJobMatch(row: MatchableJob, profile: MatchProfile | null) {
  if (!profile) return { score: 68, reasons: ["profile"] };
  let score = 42;
  const reasons: string[] = [];
  const jobText = tokens(`${row.title} ${clean(row.summary)} ${clean(row.description)}`);
  const roleHits = overlap(roleTokens(profile.role), jobText);
  const skillHits = overlap(tokens(profile.skills.join(" ")), jobText);
  if (roleHits) { score += Math.min(24, 10 + roleHits * 6); reasons.push("role"); }
  if (skillHits) { score += Math.min(24, 8 + skillHits * 5); reasons.push("skills"); }
  const mode = workMode(row.work_mode);
  const preferred = profile.workModes.join(" ").toLowerCase();
  const location = `${row.location ?? ""}`.toLowerCase();
  const city = profile.location.toLowerCase();
  const country = profile.country.toLowerCase();
  if (mode === "remote") { score += preferred.includes("remot") ? 14 : 8; reasons.push("remote"); }
  else if ((city && location.includes(city)) || (country && location.includes(country))) { score += 14; reasons.push("location"); }
  if (profile.minSalary && row.salary_max) {
    if (row.salary_max >= profile.minSalary) { score += 8; reasons.push("salary"); }
    else score -= 8;
  }
  const authorization = authorizationContext(row, profile);
  if (!authorization.unknown) {
    if (authorization.requiresSponsorship) {
      if (authorization.sponsorship === true) { score += 12; reasons.unshift("authorization"); }
      else if (authorization.sponsorship === false) score -= 35;
      else score -= 4;
    } else if (
      authorization.remoteGlobal ||
      (authorization.jobCountry && authorization.authorizedCountries.has(authorization.jobCountry))
    ) {
      score += 10;
      reasons.unshift("authorization");
    } else if (authorization.jobCountry && authorization.authorizedCountries.size) score -= 30;
  }
  const [minYears, maxYears] = expectedExperience(row.seniority, row.title);
  if (profile.yearsExperience >= minYears && profile.yearsExperience <= maxYears + 2) { score += 10; reasons.push("experience"); }
  else if (profile.yearsExperience < minYears) score -= 8;
  if (!roleHits && !skillHits) score -= 22;
  if (!isJobProfessionallyRelevant(row, profile)) score = Math.min(score, 24);
  return { score: Math.max(12, Math.min(98, Math.round(score))), reasons: reasons.slice(0, 3).length ? reasons.slice(0, 3) : ["profile"] };
}
