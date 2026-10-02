// Dry run by default. --write inserts this reviewed batch without pruning other feeds.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const batch = JSON.parse(await readFile(new URL("./junior-email-jobs-2026-10-02.json", import.meta.url), "utf8"));
const write = process.argv.includes("--write");
const verifyOnly = process.argv.includes("--verify-db");
const now = new Date().toISOString();
const source = "Official email junior";
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const fingerprint = (j) => [j.company, j.title, j.location].map(norm).join("|");
function uuid(s) {
  const b = createHash("sha256").update(s).digest().subarray(0, 16);
  b[6] = (b[6] & 15) | 80; b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const pages = new Map();
async function page(url) {
  if (!pages.has(url)) pages.set(url, (async () => {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`Source ${r.status}: ${url}`);
    // Fail closed when a removed role redirects to a generic careers page.
    if (new URL(r.url).pathname.replace(/\/$/, "") !== new URL(url).pathname.replace(/\/$/, "")) throw new Error(`Source redirected: ${url}`);
    let body = await r.text();
    body += [...body.matchAll(/data-cfemail="([0-9a-f]+)"/gi)].map((m) => {
      const key = parseInt(m[1].slice(0,2), 16);
      return Buffer.from(m[1].slice(2), "hex").map((b) => b ^ key).toString();
    }).join(" ");
    return body;
  })());
  return pages.get(url);
}
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Load Supabase credentials using node --env-file=.env.local; credentials are never printed.");
async function api(table, query, method = "GET", body) {
  const r = await fetch(`${base}/rest/v1/${table}?${query}`, {
    method, signal: AbortSignal.timeout(30000),
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
let added = 0, skipped = 0;
for (const j of batch) {
  const id = uuid(`${source}:${fingerprint(j)}`);
  if (verifyOnly) {
    const [rows, targets] = await Promise.all([
      api("jobs", `select=id,status,application_capability,application_provider,seniority&id=eq.${id}`),
      api("job_application_targets", `select=job_id,mode,apply_email,email_authorized&job_id=eq.${id}`),
    ]);
    if (rows[0]?.status !== "active" || rows[0]?.application_capability !== "automatic" || rows[0]?.application_provider !== "email" || rows[0]?.seniority !== "Entry level" || targets[0]?.mode !== "email" || targets[0]?.apply_email !== j.email || targets[0]?.email_authorized !== true) throw new Error(`Incomplete import: ${j.title}`);
    console.log(`Confirmed ${j.company} | ${j.title} | ${j.location}`);
    continue;
  }
  if (j.expiresAt && Date.parse(j.expiresAt) <= Date.now()) throw new Error(`Expired: ${j.title}`);
  const body = await page(j.url);
  const emailBody = await page(j.emailSourceUrl || j.url);
  const text = norm(body.replace(/<[^>]+>/g, " ").replace(/&amp;/g, " and "));
  if (!text.includes(norm(j.title))) throw new Error(`Role missing: ${j.title}`);
  if (!emailBody.toLowerCase().includes(j.email.toLowerCase())) throw new Error(`Email missing: ${j.company}`);
  const existing = await api("jobs", `select=id,company,title,location,status&company=eq.${encodeURIComponent(j.company)}`);
  const duplicate = existing.find((row) => fingerprint(row) === fingerprint(j));
  if (duplicate && duplicate.id !== id) {
    console.log(`Skipped existing job ${j.company} | ${j.title}`); skipped++; continue;
  }
  if (!write) { console.log(`Verified ${j.company} | ${j.title} | ${j.location}`); continue; }
  if (duplicate?.status === "active") { console.log(`Already active ${j.title}`); skipped++; continue; }
  const metadata = {
    source_url: j.url, canonical_apply_url: j.emailSourceUrl || j.url,
    apply_provider: "email", market_country: j.market,
    salary_currency: j.currency, salary_interval: j.salary ? "year" : null,
    salary_disclosed: !!j.salary, official_company_board: true,
    verified_email_application: true, application_subject: j.subject,
    verified_at: now, imported_at: now, source_published_at: null,
    publication_date_unknown: true, posting_language: j.language || "en",
    work_mode_disclosed: !!j.workMode, import_batch: "junior-email-2026-10-02",
  };
  // New records stay closed until their delivery target has been saved successfully.
  if (!duplicate) await api("jobs", "", "POST", [{
    id, source, external_id: id, company: j.company, title: j.title,
    summary: j.description, description: j.description, location: j.location,
    work_mode: j.workMode || null, salary_min: j.salary || null, salary_max: j.salary || null,
    contract_type: "Full time", seniority: "Entry level", industry: j.industry,
    apply_mode: "direct", status: "closed", published_at: null,
    expires_at: j.expiresAt || null, application_capability: "automatic",
    application_provider: "email", metadata,
  }]);
  const target = { job_id: id, mode: "email", provider: "email", apply_email: j.email,
    apply_url: j.url, email_authorized: true, email_authorized_at: now,
    email_source_url: j.emailSourceUrl || j.url,
    metadata: { source_url: j.url, application_subject: j.subject, internal_intake: false,
      authorization_basis: "Official employer application instructions explicitly accept CV submissions by email.", verified_at: now },
  };
  const previous = await api("job_application_targets", `select=job_id&job_id=eq.${id}`);
  await api("job_application_targets", previous.length ? `job_id=eq.${id}` : "", previous.length ? "PATCH" : "POST", previous.length ? target : [target]);
  await api("jobs", `id=eq.${id}`, "PATCH", { status: "active" });
  added++; console.log(`Added ${j.company} | ${j.title} | ${j.location}`);
}
console.log(JSON.stringify({ mode: verifyOnly ? "verify-db" : write ? "write" : "dry-run", reviewed: batch.length, added, skipped }));
