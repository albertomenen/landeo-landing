import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { prioritizeJobsByLocation } from "../lib/job-location.ts";
import { dashboardCopy } from "../lib/dashboard-i18n.ts";
import { marketingDemoJobs } from "../lib/marketing-demo.ts";

const root = new URL("../", import.meta.url);

async function render(path = "/", requestHeaders = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...requestHeaders },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Landeo landing page and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(
    html,
    /<title>Landeo — Deja los formularios\. Empieza a recibir respuestas<\/title>/i,
  );
  assert.match(html, /Deja de rellenar formularios/);
  assert.match(html, /Automatizar sin perder el control/i);
  assert.match(
    html,
    /Candidatos de Landeo han conseguido puestos en empresas líderes/i,
  );
  assert.match(html, /TODO TU PROCESO, EN UNA SOLA VISTA/i);
  assert.match(html, /Desliza para ver entrevistas y resultados/i);
  assert.match(html, /company-logos\/google\.webp/i);
  assert.match(html, />Google</);
  assert.doesNotMatch(html, /Northstar/);
  assert.match(html, /aria-label="Cambiar idioma"/i);
  assert.match(html, /og-bilingual\.png/);
  assert.match(
    html,
    /<meta name="msvalidate\.01" content="8817032EE0ED5D0365743F3506BDC91B"\s*\/>/i,
  );
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});

test("server-renders the English landing page for an English locale", async () => {
  const response = await render("/", { "accept-language": "en-GB,en;q=0.9" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Stop filling out forms/);
  assert.match(html, /Automation without losing control/i);
  assert.match(
    html,
    /Landeo candidates have landed roles at leading companies/i,
  );
  assert.match(html, /YOUR WHOLE SEARCH, IN ONE VIEW/i);
  assert.match(html, /Swipe to see interviews and results/i);
  assert.match(html, /Technology · San Francisco · Hybrid/);
  assert.match(html, /New York/);
  assert.match(html, /aria-label="Change language"/i);
});

test("renders the main product route", async () => {
  const response = await render("/app/jobs");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Empleos para ti/);
  assert.match(html, /Postularme/);
  assert.match(html, /Navegación móvil/);
  assert.match(html, /Consultando el catálogo de Supabase/);
});

test("ships a persistent bilingual dashboard and accessible job actions", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.equal(dashboardCopy.en.jobs.title, "Jobs for you");
  assert.equal(dashboardCopy.en.jobs.apply, "Apply");
  assert.equal(dashboardCopy.es.jobs.apply, "Postularme");
  assert.match(productApp, /landeo-locale/);
  assert.match(productApp, /aria-pressed/);
  assert.match(productApp, /Jobs by Adzuna/);
  assert.match(productApp, /Remotive/);
  assert.match(productApp, /mode-badge/);
  assert.match(productApp, /savedJobIds/);
  assert.match(productApp, /aria-pressed/);
  assert.match(productApp, /LazyMotion/);
  assert.match(productApp, /dashboardViewMotion/);
  assert.match(productApp, /jobCardMotion/);
  assert.match(productApp, /reducedMotion="user"/);
  assert.match(styles, /\.deck-actions button:focus-visible/);
  assert.match(styles, /\.dashboard-view-motion/);
  assert.match(styles, /\.dashboard-profile-progress/);
  assert.match(styles, /\.action-apply:hover:not\(:disabled\)::after/);
  assert.match(styles, /linear-gradient\(135deg,\s*#3b7f5a,\s*#2f6f4c\)/);
});

test("keeps the marketing demo isolated from real applications", async () => {
  assert.equal(marketingDemoJobs.length, 20);
  assert.equal(new Set(marketingDemoJobs.map((job) => job.id)).size, 20);
  assert.ok(marketingDemoJobs.every((job) => job.metadata?.demo === true));
  assert.ok(
    marketingDemoJobs.every(
      (job) => typeof job.metadata?.company_logo === "string",
    ),
  );
  const response = await render("/demo/marketing");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Marketing Demo/);
  assert.match(html, /Datos ficticios/);
  assert.match(html, /noindex/);
});

test("animates onboarding interactions and exposes issue reporting", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  const onboarding = await readFile(
    new URL("components/Onboarding.tsx", root),
    "utf8",
  );
  assert.match(packageJson, /"motion"/);
  assert.match(onboarding, /AnimatePresence/);
  assert.match(onboarding, /LazyMotion/);
  assert.match(onboarding, /reducedMotion="user"/);
  assert.match(onboarding, /careers@haired\.app/);
  assert.match(onboarding, /onboarding-report-link/);
});

test("prioritizes Madrid and compatible remote jobs without leaking Lisbon roles", () => {
  const job = (id, location, workMode, market) => ({
    id,
    company: "Test",
    title: "Role",
    summary: "",
    description: "",
    location,
    market,
    workMode,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "EUR",
    contractType: "",
    seniority: "",
    industry: "",
    applyCapability: "external",
    match: 80,
    publishedAt: "2026-09-08",
    skills: [],
    source: "test",
    applyProvider: "external",
    applyMode: "external",
    metadata: {},
  });
  const jobs = [
    job("lisbon", "Lisboa, Portugal", "onsite", "PT"),
    job("madrid", "Madrid, España", "onsite", "ES"),
    job("emea", "Remote-EMEA", "remote", "REMOTE"),
    job("germany", "Remote-Germany", "remote", "REMOTE"),
    job("spain", "Remote-Spain", "remote", "ES"),
  ];
  assert.deepEqual(
    prioritizeJobsByLocation(jobs, "Madrid, España", "España").map(
      (item) => item.id,
    ),
    ["madrid", "spain", "emea"],
  );
});

test("renders localized legal documents and the Apple addendum", async () => {
  const englishPrivacy = await render("/privacy?lang=en", {
    "accept-language": "es-ES",
  });
  assert.equal(englishPrivacy.status, 200);
  const privacyHtml = await englishPrivacy.text();
  assert.match(privacyHtml, /Privacy Policy/);
  assert.match(privacyHtml, /permanently delete your account/);
  assert.match(privacyHtml, /alberto@haired\.app/);

  const spanishTerms = await render("/terms?lang=es", {
    "accept-language": "en-GB",
  });
  assert.equal(spanishTerms.status, 200);
  const termsHtml = await spanishTerms.text();
  assert.match(termsHtml, /Términos de servicio/);
  assert.match(termsHtml, /Anexo de Apple App Store/);
  assert.match(termsHtml, /Apple Standard EULA/);
});

test("removes the disposable starter and keeps integration contracts", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  const contracts = await readFile(
    new URL("lib/supabase/contracts.ts", root),
    "utf8",
  );
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const jobLocation = await readFile(
    new URL("lib/job-location.ts", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /@supabase\/ssr/);
  assert.doesNotMatch(packageJson, /@revenuecat\/purchases-js/);
  assert.match(contracts, /platform:"web"/);
  assert.match(productApp, /triggerConfetti/);
  assert.match(
    productApp,
    /triggerConfetti\(\);[\s\S]*removeCurrent\(1\);[\s\S]*submitApplication\(jobId\)/,
  );
  assert.match(productApp, /pendingApplications/);
  assert.doesNotMatch(productApp, /\{outcome &&/);
  assert.match(landeo, /prioritizeJobsByLocation/);
  assert.match(landeo, /metadata->>market_country/);
  assert.match(landeo, /work_mode","Remoto"/);
  assert.match(landeo, /profile\?\.universal_profile/);
  assert.match(
    jobLocation,
    /global\|worldwide\|anywhere\|europe\|europa\|emea/,
  );
  assert.match(styles, /@keyframes landeo-confetti/);
  assert.match(
    styles,
    /prefers-reduced-motion:\s*reduce\)[\s\S]*\.confetti-burst\s*\{[\s\S]*display:\s*none/,
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)),
  );
  await access(new URL("public/og.png", root));
  await access(new URL("public/og-landing.png", root));
  await access(new URL("public/og-bilingual.png", root));
});
