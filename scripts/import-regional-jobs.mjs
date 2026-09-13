import { readFile } from "node:fs/promises";

const markets = [
  { endpoint: "es", code: "ES", currency: "EUR", fallback: "España" },
  { endpoint: "mx", code: "MX", currency: "MXN", fallback: "México" },
  { endpoint: "us", code: "US", currency: "USD", fallback: "United States" },
  { endpoint: "gb", code: "GB", currency: "GBP", fallback: "United Kingdom" },
];

async function loadEnv() {
  const text = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function clean(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function workMode(job) {
  const text = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
  if (/\b(remote|remoto|home[- ]?based|work from home)\b/.test(text)) return "Remoto";
  if (/\b(hybrid|híbrido)\b/.test(text)) return "Híbrido";
  return "Presencial";
}

function seniority(title = "") {
  if (/\b(chief|vp|vice president|head|director)\b/i.test(title)) return "Leadership";
  if (/\b(principal|staff|lead|senior|sr\.?)\b/i.test(title)) return "Senior";
  if (/\b(junior|jr\.?|graduate|intern|entry level)\b/i.test(title)) return "Entry level";
  return null;
}

async function fetchPage(market, page) {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${market.endpoint}/search/${page}`);
  url.searchParams.set("app_id", process.env.ADZUNA_APP_ID);
  url.searchParams.set("app_key", process.env.ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("sort_by", "date");
  url.searchParams.set("content-type", "application/json");
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${market.code} page ${page}: ${response.status}`);
  return response.json();
}

function normalize(job, market) {
  const description = clean(job.description).slice(0, 16_000);
  const sourceUrl = job.redirect_url || job.adref || "";
  return {
    source: "Adzuna",
    external_id: String(job.id),
    company: clean(job.company?.display_name || "Company"),
    title: clean(job.title || "Job opportunity"),
    summary: description.slice(0, 520),
    description,
    location: clean(job.location?.display_name || market.fallback),
    work_mode: workMode(job),
    salary_min: Number.isFinite(job.salary_min) ? Math.round(job.salary_min) : null,
    salary_max: Number.isFinite(job.salary_max) ? Math.round(job.salary_max) : null,
    contract_type: clean(job.contract_type || job.contract_time || "") || null,
    seniority: seniority(job.title),
    industry: clean(job.category?.label || "") || null,
    apply_mode: "external",
    status: "active",
    published_at: job.created || new Date().toISOString(),
    application_capability: "external",
    application_provider: "external",
    metadata: {
      source_url: sourceUrl,
      canonical_apply_url: sourceUrl,
      apply_provider: "external",
      market_country: market.code,
      salary_currency: market.currency,
      salary_interval: "year",
      feed_priority: 25,
      regional_refresh: true,
      imported_at: new Date().toISOString(),
    },
  };
}

async function upsert(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  for (let index = 0; index < rows.length; index += 150) {
    const response = await fetch(`${url}/rest/v1/jobs?on_conflict=source,external_id`, {
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
if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
  throw new Error("Missing Adzuna credentials.");
}

const rows = [];
for (const market of markets) {
  const marketRows = [];
  for (let page = 1; page <= 6; page += 1) {
    const payload = await fetchPage(market, page);
    marketRows.push(...(payload.results ?? []).map((job) => normalize(job, market)));
  }
  rows.push(...marketRows);
  console.log(`${market.code}: ${marketRows.length}`);
}

await upsert(rows);
console.log(`Imported ${rows.length} fresh regional jobs.`);
