// Hacker News "Ask HN: Who is hiring?" importer.
//
// Companies themselves post these roles in the monthly thread (via the public HN Algolia API) and many state
// an email to send applications to. A post is imported ONLY when it names an application email with clear
// context (same rules as ReliefWeb), does not ask for an online form or extra manual documents, and we can
// tell where the job is. The canonical source URL is the HN comment, which is the evidence of the email.
import {
  applicationEmailFromInstructions,
  domainFromUrl,
  emailApplicationRules,
  plainText,
} from "./application-email.ts";

type Helpers = {
  targetMarket: (value: string) => string | null;
  inferredSeniority: (title: string, contractType?: string) => string | null;
};

const ROLE =
  /engineer|developer|\bdev\b|\bswe\b|programmer|architect|devops|\bsre\b|sysadmin|data (?:scientist|analyst|engineer)|machine learning|\bml\b|\bai\b|researcher|scientist|designer|product|\bpm\b|manager|\blead\b|\bhead\b|\bcto\b|analyst|support|security|qa\b|tester|writer|marketing|sales|growth|recruiter|operations|founding/i;
const FREE_MAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|icloud|proton|protonmail|me|live|aol)\./i;

// Residence/work-authorisation restrictions. Without a recognisable country the job is treated as unrestricted
// ONLY when it says it is open worldwide; "REMOTE (US)" style hints restrict it to that country.
const RESTRICTIONS: Array<[RegExp, string[]]> = [
  [/(?:^|\W)(?:us|usa|u\.s\.|united states)(?=\W|$)[^|]{0,25}\b(?:only|based|residents?|citizens?|timezones?|time zones?|hours)\b|\b(?:remote|remoto)\s*\(\s*(?:us|usa|united states)[^)]*\)|\bus[- ]based\b|work authori[sz]ation (?:in|for) the (?:us|u\.s\.)|\bmust be (?:located )?in the (?:us|u\.s\.|united states)/i, ["US"]],
  [/\b(?:uk|united kingdom)\b[^|]{0,25}\b(?:only|based|residents?|citizens?)\b|\bremote\s*\(\s*uk[^)]*\)/i, ["GB"]],
  [/\b(?:eu|europe|emea|european)\b[^|]{0,25}\b(?:only|based|residents?|timezones?|time zones?)\b|\bremote\s*\(\s*(?:eu|europe|emea)[^)]*\)/i, ["ES", "DE", "FR", "IT", "NL", "PT", "PL", "AT"]],
  [/\bcanada\b[^|]{0,25}\b(?:only|based|residents?)\b|\bremote\s*\(\s*canada[^)]*\)/i, ["CA"]],
];
const WORLDWIDE = /\b(?:worldwide|anywhere|global(?:ly)?|any ?where in the world|any country|all countries)\b/i;

function splitHeader(html: string) {
  const first = html.split(/<p>/i)[0] ?? "";
  return plainText(first).split("|").map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export type HnJob = {
  source: string;
  external_id: string;
  company: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  work_mode: "Remoto" | "Híbrido" | "Presencial";
  salary_min: null;
  salary_max: null;
  contract_type: string | null;
  seniority: string | null;
  industry: string;
  apply_mode: "direct";
  status: "active";
  published_at: string | null;
  metadata: Record<string, unknown>;
  target: Record<string, unknown> & { mode: "email" };
};

/** Turns one top-level comment of the thread into a job, or null when it is not a verifiable email posting. */
export function hnPostToJob(
  comment: { id: number | string; text?: string | null; created_at?: string | null },
  helpers: Helpers,
): HnJob | null {
  const html = comment.text ?? "";
  if (!html || /\[dead\]|\[flagged\]/i.test(html)) return null;
  const header = splitHeader(html);
  if (header.length < 3) return null;
  const company = header[0].replace(/\s*\(.*?\)\s*$/, "").slice(0, 80);
  const roleSegments = header.slice(1).filter((part) => ROLE.test(part) && part.length <= 120 && !/^https?:/i.test(part));
  const title = roleSegments[0];
  if (!company || !title) return null;

  const description = plainText(html);
  const emailCandidate = applicationEmailFromInstructions(html);
  const rules = emailApplicationRules(html);
  if (!emailCandidate || rules.asksForOnlineForm || rules.manualDocuments.length) return null;

  const headerText = header.join(" | ");
  const remote = /\bremote\b|\bremoto\b|work from anywhere|distributed/i.test(headerText);
  const hybrid = /\bhybrid\b|h[ií]brido/i.test(headerText);
  const onsite = /\bonsite\b|\bon-site\b|\bin[- ]office\b|\bpresencial\b/i.test(headerText);
  const workMode: HnJob["work_mode"] = hybrid ? "Híbrido" : remote && !/only onsite|onsite only/i.test(headerText) ? "Remoto" : "Presencial";
  const locationParts = header.slice(1).filter((part) =>
    part !== title && !/^(?:full[- ]?time|part[- ]?time|contract|internship|permanent|salary|\$|€|£)/i.test(part) &&
    !/https?:\/\//i.test(part) && part.length <= 90 && !ROLE.test(part)
  );
  const location = locationParts.join(", ") || (remote ? "Remote" : "");

  // Where may the candidate live? Never guess: restricted when the text says so, worldwide when it says so.
  let allowed: string[] | null = null;
  const restrictionText = `${headerText} ${description.slice(0, 1500)}`;
  if (!WORLDWIDE.test(headerText) && !/\bprefer(?:red|ably)?\b|\bideally\b/i.test(headerText)) for (const [pattern, countries] of RESTRICTIONS) if (pattern.test(restrictionText)) { allowed = countries; break; }
  let market: string | null;
  if (workMode === "Remoto") {
    market = "REMOTE";
  } else {
    market = helpers.targetMarket(location || headerText);
    if (!market || market === "REMOTE") return null; // on-site/hybrid without a known country cannot be geo-checked
    allowed = [market];
  }

  const email = emailCandidate.email;
  const emailDomain = email.split("@")[1] ?? "";
  const companyDomain = FREE_MAIL.test(emailDomain) ? null : domainFromUrl(`https://${emailDomain}`);
  const contract = /intern/i.test(headerText) ? "Internship" : /part[- ]?time/i.test(headerText) ? "Part-time" : /contract/i.test(headerText) ? "Contract" : /full[- ]?time/i.test(headerText) ? "Full-time" : null;
  const sourceUrl = `https://news.ycombinator.com/item?id=${comment.id}`;
  const publishedAt = comment.created_at ?? null;

  return {
    source: "HackerNews",
    external_id: `hackernews:${comment.id}`,
    company,
    title,
    summary: description.slice(0, 500),
    description,
    location: location || "Remote",
    work_mode: workMode,
    salary_min: null,
    salary_max: null,
    contract_type: contract,
    seniority: helpers.inferredSeniority(title, contract ?? ""),
    industry: "Tecnología",
    apply_mode: "direct",
    status: "active",
    published_at: publishedAt,
    metadata: {
      source_url: sourceUrl,
      canonical_apply_url: sourceUrl,
      requirements: [],
      nice_to_have: [],
      company_domain: companyDomain,
      easy_apply: true,
      apply_provider: "email",
      verified_source: "hackernews_who_is_hiring",
      verified_at: new Date().toISOString(),
      market_country: market,
      ...(allowed ? { auto_apply_allowed_countries: allowed } : {}),
      // A hiring thread is only current for about a month.
      closing_date: publishedAt ? new Date(new Date(publishedAt).getTime() + 35 * 86_400_000).toISOString() : null,
    },
    target: {
      mode: "email",
      apply_email: email,
      apply_url: sourceUrl,
      provider: null,
      metadata: {
        source: "hackernews_who_is_hiring",
        market_country: market,
        application_instructions: description.slice(0, 2000),
        email_evidence: emailCandidate.context,
        email_confidence_score: emailCandidate.score,
        required_documents: rules.requiredDocuments,
        email_subject: rules.subject,
        discovered_urls: rules.urls,
      },
      email_authorized: true,
      email_authorized_at: new Date().toISOString(),
      email_source_url: sourceUrl,
    },
  };
}

export async function hackerNewsJobs(helpers: Helpers, now = Date.now()): Promise<HnJob[]> {
  const headers = { Accept: "application/json", "User-Agent": "Landeo/1.0" };
  const search = await fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=6", { headers });
  if (!search.ok) throw new Error(`Hacker News respondió ${search.status}`);
  const stories = ((await search.json()) as { hits?: Array<{ objectID: string; title: string; created_at_i: number }> }).hits ?? [];
  const threads = stories
    .filter((story) => /who is hiring/i.test(story.title) && !/wants to be hired|freelancer/i.test(story.title))
    .filter((story) => now - story.created_at_i * 1000 < 40 * 86_400_000)
    .slice(0, 2);
  const jobs: HnJob[] = [];
  for (const thread of threads) {
    const response = await fetch(`https://hn.algolia.com/api/v1/items/${thread.objectID}`, { headers });
    if (!response.ok) throw new Error(`Hacker News respondió ${response.status}`);
    const item = (await response.json()) as { children?: Array<{ id: number; text?: string | null; created_at?: string }> };
    for (const comment of item.children ?? []) {
      const job = hnPostToJob(comment, helpers);
      if (job) jobs.push(job);
    }
  }
  return jobs;
}
