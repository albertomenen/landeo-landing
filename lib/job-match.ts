export type MatchProfile = {
  role: string;
  location: string;
  skills: string[];
  workModes: string[];
  minSalary: number | null;
  maxSalary: number | null;
  yearsExperience: number;
  country: string;
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
  { match: /finance|finanzas|accounting/, terms: "finance financial accounting accountant controller" },
  { match: /consult/, terms: "consulting consultant strategy operations" },
];

type RoleFamily = "software" | "marketing" | "product" | "design" | "sales" | "data" | "people" | "finance" | "consulting";

function roleFamily(value: string): RoleFamily | null {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/frontend|backend|full.?stack|software|developer|programador|devops|web development|mobile development/.test(normalized)) return "software";
  if (/marketing|mercadotecnia|comunicacion|growth|brand|content|seo|sem/.test(normalized)) return "marketing";
  if (/product manager|product owner|product operations|producto/.test(normalized)) return "product";
  if (/product design|ux|ui|designer|disen/.test(normalized)) return "design";
  if (/sales|ventas|account executive|business development|comercial/.test(normalized)) return "sales";
  if (/data|datos|analytics|machine learning|artificial intelligence|\bai\b/.test(normalized)) return "data";
  if (/human resources|recursos humanos|talent|recruit|people operations/.test(normalized)) return "people";
  if (/finance|finanzas|accounting|accountant|controller/.test(normalized)) return "finance";
  if (/consulting|consultant|consultor/.test(normalized)) return "consulting";
  return null;
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
  const desiredFamily = roleFamily(profile.role);
  if (!desiredFamily) return overlap(roleTokens(profile.role), tokens(`${row.title} ${row.metadata?.department ?? ""}`)) > 0;
  if (jobRoleFamily(row) === desiredFamily) return true;
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
  const [minYears, maxYears] = expectedExperience(row.seniority, row.title);
  if (profile.yearsExperience >= minYears && profile.yearsExperience <= maxYears + 2) { score += 10; reasons.push("experience"); }
  else if (profile.yearsExperience < minYears) score -= 8;
  if (!roleHits && !skillHits) score -= 22;
  if (!isJobProfessionallyRelevant(row, profile)) score = Math.min(score, 24);
  return { score: Math.max(12, Math.min(98, Math.round(score))), reasons: reasons.slice(0, 3).length ? reasons.slice(0, 3) : ["profile"] };
}
