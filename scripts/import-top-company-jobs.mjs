import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ashbyBoards = [
  ["openai", "OpenAI"],
  ["notion", "Notion"],
  ["ramp", "Ramp"],
  ["linear", "Linear"],
  ["perplexity", "Perplexity"],
];

const greenhouseBoards = [
  ["figma", "Figma"],
  ["datadog", "Datadog"],
  ["cloudflare", "Cloudflare"],
  ["discord", "Discord"],
  ["reddit", "Reddit"],
  ["gitlab", "GitLab"],
];

const countryCodes = new Map([
  ["australia", "AU"], ["austria", "AT"], ["belgium", "BE"],
  ["brazil", "BR"], ["canada", "CA"], ["denmark", "DK"],
  ["france", "FR"], ["germany", "DE"], ["india", "IN"],
  ["ireland", "IE"], ["italy", "IT"], ["japan", "JP"],
  ["mexico", "MX"], ["netherlands", "NL"], ["new zealand", "NZ"],
  ["poland", "PL"], ["portugal", "PT"], ["singapore", "SG"],
  ["south africa", "ZA"], ["south korea", "KR"], ["spain", "ES"],
  ["sweden", "SE"], ["switzerland", "CH"], ["united kingdom", "GB"],
  ["united states", "US"],
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
  let text = value;
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  }
  return text.replace(/\s+/g, " ").trim();
}

function countryCode(country = "", location = "") {
  const haystack = `${country} ${location}`.toLowerCase();
  for (const [name, code] of countryCodes) {
    if (haystack.includes(name)) return code;
  }
  if (/\b(remote|worldwide|global|anywhere|emea|europe)\b/i.test(haystack)) return "REMOTE";
  return "";
}

function workMode(workplaceType, isRemote, location) {
  const declared = String(workplaceType ?? "").toLowerCase();
  const place = String(location ?? "").toLowerCase();
  if (declared === "hybrid") return "Híbrido";
  if (declared === "onsite") return "Presencial";
  if (declared === "remote" || isRemote === true) return "Remoto";
  if (/\b(remote|remoto|worldwide|anywhere)\b/.test(place)) return "Remoto";
  if (/\b(hybrid|híbrido)\b/.test(place)) return "Híbrido";
  return "Presencial";
}

function seniority(title) {
  if (/\b(chief|vp|vice president|head|director)\b/i.test(title)) return "Leadership";
  if (/\b(principal|staff|lead|senior|sr\.?)\b/i.test(title)) return "Senior";
  if (/\b(junior|jr\.?|graduate|intern|entry level)\b/i.test(title)) return "Entry level";
  return null;
}

function logoFor(company) {
  const logos = {
    OpenAI: "/company-logos/openai.png",
    Notion: "/company-logos/notion.webp",
  };
  return logos[company] ?? null;
}

function rowBase({ source, board, externalId, company, title, description, location, mode, market, publishedAt, applyUrl, industry }) {
  const cleanDescription = decodeHtml(description).slice(0, 16_000);
  const sourceKey = `${source.toLowerCase()}:${board}:${externalId}`;
  return {
    id: stableUuid(sourceKey),
    source,
    external_id: `${board}:${externalId}`,
    company,
    title: title.trim(),
    summary: cleanDescription.slice(0, 520),
    description: cleanDescription,
    location: location || (mode === "Remoto" ? "Remote" : "Location not specified"),
    work_mode: mode,
    salary_min: null,
    salary_max: null,
    contract_type: "Full time",
    seniority: seniority(title),
    industry: industry || "Technology",
    apply_mode: "external",
    status: "active",
    published_at: publishedAt || new Date().toISOString(),
    expires_at: null,
    application_capability: "external",
    application_provider: "external",
    metadata: {
      source_url: applyUrl,
      canonical_apply_url: applyUrl,
      apply_provider: "external",
      market_country: market,
      salary_currency: market === "US" || market === "REMOTE" ? "USD" : "EUR",
      top_company: true,
      official_company_board: true,
      feed_priority: 90,
      company_logo: logoFor(company),
      job_board: board,
      imported_at: new Date().toISOString(),
    },
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Landeo jobs importer/1.0" } });
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`);
  return response.json();
}

async function importAshby(board, company) {
  const payload = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${board}`);
  return (payload.jobs ?? [])
    .filter((job) => job.isListed !== false && job.id && job.title)
    .map((job) => {
      const location = [
        job.location,
        ...(job.secondaryLocations ?? []).map((item) => item.location ?? item),
      ].filter(Boolean).join(" · ");
      const country = job.address?.postalAddress?.addressCountry ?? "";
      const description = job.descriptionPlain || job.descriptionHtml || "";
      const mode = workMode(job.workplaceType, job.isRemote, location);
      const market = countryCode(country, location) || (mode === "Remoto" ? "REMOTE" : "");
      return rowBase({
        source: "Ashby", board, externalId: job.id, company, title: job.title,
        description, location, mode, market, publishedAt: job.publishedAt,
        applyUrl: job.applyUrl || job.jobUrl, industry: job.department || job.team,
      });
    });
}

async function importGreenhouse(board, company) {
  const payload = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  return (payload.jobs ?? [])
    .filter((job) => job.id && job.title)
    .map((job) => {
      const location = job.location?.name ?? "";
      const description = job.content ?? "";
      const mode = workMode("", false, location);
      const market = countryCode("", location) || (mode === "Remoto" ? "REMOTE" : "");
      return rowBase({
        source: "Greenhouse", board, externalId: job.id,
        company: job.company_name || company, title: job.title, description,
        location, mode, market, publishedAt: job.updated_at || job.first_published,
        applyUrl: job.absolute_url,
        industry: job.departments?.map((item) => item.name).filter(Boolean).join(" · "),
      });
    });
}

async function upsertRows(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  for (let index = 0; index < rows.length; index += 150) {
    const response = await fetch(`${url}/rest/v1/jobs?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows.slice(index, index + 150)),
    });
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  }
}

await loadEnv();
const results = [];
for (const [board, company] of ashbyBoards) {
  const rows = await importAshby(board, company);
  results.push(...rows);
  console.log(`${company}: ${rows.length}`);
}
for (const [board, company] of greenhouseBoards) {
  const rows = await importGreenhouse(board, company);
  results.push(...rows);
  console.log(`${company}: ${rows.length}`);
}

await upsertRows(results);
console.log(`Imported ${results.length} current jobs from official company boards.`);
