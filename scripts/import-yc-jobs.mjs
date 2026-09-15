import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const YC_BASE_URL = "https://www.ycombinator.com";
const YC_FEEDS = [
  "/jobs/role/all",
  "/jobs/role/all/remote",
];

const countryAliases = new Map([
  ["united states", "US"], ["usa", "US"], ["u.s.", "US"],
  ["united kingdom", "GB"], ["england", "GB"], ["scotland", "GB"],
  ["spain", "ES"], ["españa", "ES"], ["mexico", "MX"], ["méxico", "MX"],
  ["colombia", "CO"], ["canada", "CA"], ["brazil", "BR"], ["argentina", "AR"],
  ["india", "IN"], ["singapore", "SG"], ["germany", "DE"], ["france", "FR"],
  ["portugal", "PT"], ["ireland", "IE"], ["netherlands", "NL"], ["australia", "AU"],
]);

async function loadEnv() {
  const text = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function stableUuid(value) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function extractJobPostings(html) {
  const match = html.match(/<div id="WaasJobListingsPage[^>]+data-page="([^"]+)"/);
  if (!match) throw new Error("YC jobs page did not contain WaasJobListingsPage data.");
  const page = JSON.parse(decodeHtml(match[1]));
  return Array.isArray(page?.props?.jobPostings) ? page.props.jobPostings : [];
}

function countryCode(location = "") {
  const value = location.toLowerCase();
  for (const [alias, code] of countryAliases) {
    if (value.includes(alias)) return code;
  }
  const codes = [...location.matchAll(/(?:^|[\s;(/,])([A-Z]{2})(?=$|[\s;),/])/g)]
    .map((match) => match[1]);
  const uniqueCodes = [...new Set(codes)];
  if (/\bremote\b/i.test(location) && uniqueCodes.length >= 4) return "REMOTE";
  for (const code of ["US", "GB", "ES", "MX", "IN", "BR", "CO", "CA", "PT", "DE", "FR", "AU", "SG"]) {
    if (codes.includes(code)) {
      if ((code === "CA" || code === "CO") && !/\bremote\b/i.test(location) && !codes.includes("US")) return "US";
      return code;
    }
  }
  const usStateCodes = new Set(["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]);
  if (codes.some((code) => usStateCodes.has(code))) return "US";
  return /\b(remote|worldwide|anywhere)\b/i.test(location) ? "REMOTE" : "";
}

function workMode(location = "") {
  if (/\bhybrid\b/i.test(location)) return "Híbrido";
  if (/\b(remote|worldwide|anywhere)\b/i.test(location)) return "Remoto";
  return "Presencial";
}

function seniority(job) {
  const experience = String(job.minExperience ?? "");
  const title = String(job.title ?? "");
  if (/\b(chief|vp|vice president|head|director)\b/i.test(title)) return "Leadership";
  if (/\b(principal|staff|lead|senior|sr\.?)\b/i.test(title) || /(?:6|7|8|9|10)\+?\s*years/i.test(experience)) return "Senior";
  if (/\b(junior|jr\.?|graduate|intern|entry level)\b/i.test(title) || /new grads/i.test(experience)) return "Entry level";
  return null;
}

function salary(job) {
  const values = String(job.salaryRange ?? "").match(/[\d,.]+\s*[Kk]?/g) ?? [];
  const numbers = values.map((value) => {
    const compact = value.replace(/,/g, "").trim();
    const amount = Number.parseFloat(compact);
    return /k$/i.test(compact) ? amount * 1000 : amount;
  }).filter(Number.isFinite);
  const currency = String(job.salaryRange ?? "").includes("£")
    ? "GBP"
    : String(job.salaryRange ?? "").includes("€")
      ? "EUR"
      : String(job.salaryRange ?? "").includes("₹")
        ? "INR"
        : "USD";
  return { min: numbers[0] ?? null, max: numbers[1] ?? numbers[0] ?? null, currency };
}

function toRow(job) {
  const location = String(job.location || "Location not specified");
  const mode = workMode(location);
  const market = countryCode(location) || (mode === "Remoto" ? "REMOTE" : "");
  const compensation = salary(job);
  const officialJobUrl = job.url?.startsWith("http") ? job.url : `${YC_BASE_URL}${job.url}`;
  const applyUrl = job.ctaUrl || job.applyUrl || officialJobUrl;
  const summary = [job.companyOneLiner, job.prettyRole, job.roleSpecificType]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 520);

  return {
    id: stableUuid(`y-combinator:${job.id}`),
    source: "Y Combinator",
    external_id: String(job.id),
    company: job.companyName,
    title: String(job.title).trim(),
    summary,
    description: summary,
    location,
    work_mode: mode,
    salary_min: compensation.min,
    salary_max: compensation.max,
    contract_type: job.type || "Full-time",
    seniority: seniority(job),
    industry: job.prettyRole || "Technology",
    apply_mode: "external",
    status: "active",
    published_at: new Date().toISOString(),
    expires_at: null,
    application_capability: "external",
    application_provider: "y_combinator",
    metadata: {
      source_url: officialJobUrl,
      canonical_apply_url: applyUrl,
      apply_provider: "y_combinator",
      market_country: market,
      salary_currency: compensation.currency,
      official_company_board: true,
      official_source: "Y Combinator — Work at a Startup",
      yc_company: true,
      yc_batch: job.companyBatchName || null,
      yc_job_id: job.id,
      yc_profile_required: true,
      yc_ask_us: Boolean(job.askUs),
      equity_range: job.equityRange || null,
      visa: job.visa || null,
      requirements: Array.isArray(job.skills) ? job.skills.slice(0, 12) : [],
      company_logo: job.companyLogoUrl || null,
      feed_priority: 92,
      imported_at: new Date().toISOString(),
    },
  };
}

async function fetchJobs(path) {
  const response = await fetch(`${YC_BASE_URL}${path}`, {
    headers: { "User-Agent": "Landeo jobs importer/1.0 (+https://getlandeo.com)" },
  });
  if (!response.ok) throw new Error(`${response.status} while fetching ${path}`);
  return extractJobPostings(await response.text());
}

async function upsertRows(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  for (let index = 0; index < rows.length; index += 100) {
    const response = await fetch(`${url}/rest/v1/jobs?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows.slice(index, index + 100)),
    });
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  }
}

async function deactivateMissing(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const response = await fetch(`${url}/rest/v1/jobs?select=id,external_id&source=eq.Y%20Combinator`, { headers });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  const currentIds = new Set(rows.map((row) => row.external_id));
  const staleIds = (await response.json()).filter((row) => !currentIds.has(row.external_id)).map((row) => row.id);
  for (let index = 0; index < staleIds.length; index += 100) {
    const ids = staleIds.slice(index, index + 100).join(",");
    const update = await fetch(`${url}/rest/v1/jobs?id=in.(${ids})`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: "closed" }),
    });
    if (!update.ok) throw new Error(`${update.status}: ${await update.text()}`);
  }
  return staleIds.length;
}

await loadEnv();
const postings = [];
for (const feed of YC_FEEDS) {
  const jobs = await fetchJobs(feed);
  console.log(`${feed}: ${jobs.length}`);
  postings.push(...jobs);
}

const uniqueJobs = [...new Map(postings.map((job) => [String(job.id), job])).values()];
const rows = uniqueJobs.filter((job) => job.id && job.title && job.companyName && job.url).map(toRow);
await upsertRows(rows);
const deactivated = await deactivateMissing(rows);
console.log(`Imported ${rows.length} current YC jobs and deactivated ${deactivated} expired listings.`);
