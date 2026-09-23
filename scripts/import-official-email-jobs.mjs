import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const verifiedAt = new Date().toISOString();

const sources = [
  {
    company: "ECR Medio Ambiente",
    url: "https://ecr-medioambiente.com/oferta-de-empleo/",
    email: "barcelona@ecr-medioambiente.com",
    industry: "Engineering & Environment",
    jobs: [
      ["Topógrafo/a", "Barcelona, Spain", "Presencial", "ES", "Candidatura Topógrafo Barcelona", "Trabajo de topografía de campo y oficina en proyectos de obra civil en Barcelona."],
      ["Operario / Técnico de Instrumentación (Auscultación)", "Barcelona, Spain", "Presencial", "ES", "Candidatura Operario / Técnico de Instrumentación Barcelona", "Instalación, lectura y seguimiento de instrumentación para auscultación de obras."],
      ["BIM Manager", "Barcelona, Spain", "Presencial", "ES", "Candidatura BIM Manager Barcelona", "Coordinación BIM para proyectos complejos de edificación, obra civil y entornos urbanos."],
      ["Topógrafo/a", "Madrid, Spain", "Presencial", "ES", "Candidatura Topógrafo Madrid", "Trabajo de topografía de campo y oficina en proyectos de obra civil en Madrid."],
      ["Auxiliar de Topografía", "Barcelona, Spain", "Presencial", "ES", "Candidatura Auxiliar Topografía Barcelona", "Soporte de topografía en campo y oficina para el equipo de Barcelona."],
      ["Auxiliar de Topografía", "Madrid, Spain", "Presencial", "ES", "Candidatura Auxiliar Topografía Madrid", "Soporte de topografía en campo y oficina para el equipo de Madrid."],
      ["Técnico/a Senior en Suelos Contaminados y Geotecnia", "Barcelona, Spain", "Presencial", "ES", "Candidatura técnico/a Senior en Suelos Contaminados y Geotecnia Barcelona", "Desarrollo de proyectos de suelos contaminados y geotecnia con foco en obra civil y edificación."],
    ],
  },
  {
    company: "WATTEGA",
    url: "https://wattega.eu/en/join-our-team/",
    email: "talent@wattega.eu",
    industry: "Energy & Innovation",
    jobs: [
      ["Junior R&D Project Engineer – Energy & Digitalization", "Barcelona, Spain", "Híbrido", "ES", "Junior R&D Project Engineer – Energy & Digitalization", "Engineering role working on European research and innovation projects in energy and digitalization."],
      ["Project Manager – Research, Development and Innovation (Mid-Level)", "Barcelona, Spain", "Híbrido", "ES", "Project Manager – Research, Development and Innovation", "Project management role for European research, development and innovation initiatives."],
    ],
  },
  {
    company: "AVer USA",
    url: "https://averusa.com/company/careers",
    email: "jobs.usa@aver.com",
    industry: "Technology",
    jobs: [
      ["Regional Sales Manager, SIU & K12 (West)", "Remote — CA, TX, NV, OR or WA, United States", "Remoto", "US", "Application: Regional Sales Manager, SIU & K12 (West)", "Regional sales leadership for strategic industry units and K-12 education markets in the western United States."],
    ],
  },
  {
    company: "SunDance",
    url: "https://sundanceusa.com/about/careers/",
    email: "jobs@sundanceusa.com",
    industry: "Printing & Packaging",
    jobs: [
      ["Customer Service Representative", "Orlando, Florida, United States", "Presencial", "US", "Application: Customer Service Representative", "On-site customer service position supporting a growing printing, marketing and packaging business."],
      ["Bindery / Folder / Stitcher / Perfect Bound Operator", "Orlando, Florida, United States", "Presencial", "US", "Application: Bindery Operator", "First- or second-shift production role operating bindery and finishing machinery."],
      ["2nd Shift Pouching Operator", "Orlando, Florida, United States", "Presencial", "US", "Application: 2nd Shift Pouching Operator", "Second-shift flexible-packaging production role with quality and food-safety responsibilities."],
      ["Print Sales Representative", "Orlando, Florida, United States", "Presencial", "US", "Application: Print Sales Representative", "Sales role developing client relationships and print, marketing and packaging solutions."],
      ["Account Executive / Technical Sales – Flexible Packaging", "Orlando, Florida, United States", "Presencial", "US", "Application: Account Executive / Technical Sales – Flexible Packaging", "Sales role growing the flexible-packaging division and managing customer projects."],
    ],
  },
  {
    company: "Expand & Raise",
    url: "https://expand-raise.com/careers/",
    email: "info@expand-raise.com",
    industry: "Business Services",
    jobs: [
      ["Multilingual Call Center Agent", "Remote", "Remoto", "REMOTE", "Application: Multilingual Call Center Agent", "Remote full-time customer support role for English, German, Dutch or Arabic speakers."],
      ["Shopify / WordPress Developer", "Remote", "Remoto", "REMOTE", "Application: Shopify / WordPress Developer", "Remote full-time web development role working with Shopify and WordPress."],
      ["SEO Specialist", "Remote", "Remoto", "REMOTE", "Application: SEO Specialist", "Remote SEO role available part-time or full-time."],
      ["Virtual Assistant", "Remote", "Remoto", "REMOTE", "Application: Virtual Assistant", "Remote part-time administration and support role."],
      ["Appointment Setter / SDR", "Remote", "Remoto", "REMOTE", "Application: Appointment Setter / SDR", "Remote full-time lead-generation and appointment-setting role."],
    ],
  },
  {
    company: "WebWorks",
    url: "https://www.webworks.com/company/careers",
    email: "jobs@webworks.com",
    industry: "Technology",
    jobs: [
      ["Entry-level Sales — Account Manager", "United States", "Presencial", "US", "Job Application — Entry-level Sales — Account Manager", "Entry-level account management and sales opportunity at WebWorks."],
    ],
  },
  {
    company: "Digital Apple",
    url: "https://digitalapple.ai/career/",
    email: "hello@digitalapple.ai",
    industry: "Creative Technology",
    jobs: [
      ["Graphic Designer", "India / Remote", "Remoto", "REMOTE", "Application: Graphic Designer", "Remote graphic design role at an AI-native B2B creative agency."],
      ["Financial Controller", "India / Remote", "Remoto", "REMOTE", "Application: Financial Controller", "Remote finance and controllership role at an international creative agency."],
      ["Three.js Specialist", "India / Remote", "Remoto", "REMOTE", "Application: Three.js Specialist", "Remote interactive 3D web development role using Three.js."],
      ["Full-Stack Developer", "Remote", "Remoto", "REMOTE", "Application: Full-Stack Developer", "Senior remote full-stack development role."],
      ["Sales Development Representative (SDR)", "India / Remote", "Remoto", "REMOTE", "Application: Sales Development Representative (SDR)", "Remote sales development role focused on prospecting and pipeline generation."],
      ["PHP Developer", "India / Remote", "Remoto", "REMOTE", "Application: PHP Developer", "Remote PHP development role at an AI-native B2B creative agency."],
    ],
  },
];

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

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

async function verifySource(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Landeo official job verifier/1.0 (+https://getlandeo.com)" },
  });
  if (!response.ok) throw new Error(`${source.company}: official page returned ${response.status}`);
  const rawBody = await response.text();
  const body = rawBody.toLowerCase();
  if (!body.includes(source.email.toLowerCase())) {
    throw new Error(`${source.company}: application email is no longer published on the official page`);
  }
  const searchable = rawBody
    .replace(/&amp;|&#038;/gi, " and ")
    .replace(/<[^>]+>/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ");
  for (const [title] of source.jobs) {
    const marker = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)
      .filter((word) => word.length > 2 && !["and", "the"].includes(word))
      .slice(0, 3);
    if (!marker.every((word) => searchable.includes(word))) {
      throw new Error(`${source.company}: could not verify current role ${title}`);
    }
  }
}

function buildRows() {
  const jobs = [];
  const targets = [];
  for (const source of sources) {
    for (const [title, location, workMode, market, subject, description] of source.jobs) {
      const externalId = `${slug(source.company)}:${slug(title)}:${slug(location)}`;
      const id = stableUuid(`official-email:${externalId}`);
      jobs.push({
        id,
        source: "Official email",
        external_id: externalId,
        company: source.company,
        title,
        summary: description,
        description,
        location,
        work_mode: workMode,
        salary_min: null,
        salary_max: null,
        contract_type: "Full time",
        seniority: /senior|manager/i.test(title) ? "Senior" : /junior|entry-level/i.test(title) ? "Entry level" : null,
        industry: source.industry,
        apply_mode: "direct",
        status: "active",
        published_at: verifiedAt,
        expires_at: null,
        application_capability: "automatic",
        application_provider: "email",
        metadata: {
          source_url: source.url,
          canonical_apply_url: source.url,
          apply_provider: "email",
          market_country: market,
          salary_currency: market === "US" ? "USD" : "EUR",
          official_company_board: true,
          verified_email_application: true,
          employer_delivery_confirmed: true,
          application_subject: subject,
          feed_priority: 130,
          verified_at: verifiedAt,
          imported_at: verifiedAt,
        },
      });
      targets.push({
        job_id: id,
        mode: "email",
        provider: "email",
        apply_email: source.email.toLowerCase(),
        apply_url: source.url,
        email_authorized: true,
        email_authorized_at: verifiedAt,
        email_source_url: source.url,
        metadata: {
          source_url: source.url,
          application_subject: subject,
          employer_delivery_confirmed: true,
          internal_intake: false,
          authorization_basis: "The employer's official careers page explicitly instructs candidates to send a CV or resume to this email address.",
          verified_at: verifiedAt,
        },
      });
    }
  }
  return { jobs, targets };
}

async function upsert(table, rows, conflict) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table} ${response.status}: ${await response.text()}`);
}

async function deactivateMissing(activeIds) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const response = await fetch(
    `${url}/rest/v1/jobs?select=id&source=eq.Official%20email&status=eq.active`,
    { headers },
  );
  if (!response.ok) throw new Error(`jobs ${response.status}: ${await response.text()}`);
  const activeSet = new Set(activeIds);
  const staleIds = (await response.json()).map((row) => row.id)
    .filter((id) => !activeSet.has(id));
  if (!staleIds.length) return 0;
  const update = await fetch(
    `${url}/rest/v1/jobs?id=in.(${staleIds.join(",")})`,
    {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: "closed" }),
    },
  );
  if (!update.ok) throw new Error(`jobs ${update.status}: ${await update.text()}`);
  return staleIds.length;
}

await loadEnv();
for (const source of sources) {
  await verifySource(source);
  console.log(`Verified ${source.company}: ${source.jobs.length} jobs → ${source.email}`);
}
const { jobs, targets } = buildRows();
await upsert("jobs", jobs, "id");
await upsert("job_application_targets", targets, "job_id");
const deactivated = await deactivateMissing(jobs.map((job) => job.id));
console.log(`Imported ${jobs.length} automatic email jobs from ${sources.length} official employer pages and closed ${deactivated} stale listings.`);
