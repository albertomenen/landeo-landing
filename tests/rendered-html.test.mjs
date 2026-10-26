import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { prioritizeJobsByLocation } from "../lib/job-location.ts";
import { dashboardCopy } from "../lib/dashboard-i18n.ts";
import { marketingDemoJobs } from "../lib/marketing-demo.ts";
import { nextProfileForm } from "../lib/profile-form.ts";
import { AUTH_RESEND_SECONDS, authErrorCategory, isValidAuthCode, parsePendingCode, readableAuthError, withTimeout } from "../lib/auth-flow.ts";
import { applicationGuide, deliveryState } from "../lib/application-guidance.ts";
import { classifyInbound, parseReplyToken, parseSender, previewFromText } from "../supabase/functions/_shared/inbound-reply.ts";
import { calculateJobMatch, isJobProfessionallyRelevant, isJobWorkAuthorizationCompatible } from "../lib/job-match.ts";

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
  await access(new URL("public/brand/landeo-mark.webp", root));
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
  assert.match(html, /brand\/landeo-mark\.webp/);
  assert.match(
    html,
    /<meta name="msvalidate\.01" content="8817032EE0ED5D0365743F3506BDC91B"\s*\/>/i,
  );
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});

test("loads Microsoft Clarity only after analytics consent and masks private routes", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const analytics = await readFile(
    new URL("components/GoogleAnalytics.tsx", root),
    "utf8",
  );
  const legal = await readFile(new URL("lib/legal-documents.ts", root), "utf8");
  assert.match(layout, /clarityId="yi6pc0lycq"/);
  assert.match(analytics, /consent !== "granted"/);
  assert.match(analytics, /www\.clarity\.ms\/tag/);
  assert.match(analytics, /"consentv2"/);
  assert.match(analytics, /data-clarity-mask/);
  assert.match(legal, /Microsoft Clarity/);
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
  assert.match(html, /Cargando/);
  assert.match(html, /aria-busy="true"/);
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
  assert.match(productApp, /profileStep/);
  assert.match(productApp, /changeProfileStep/);
  assert.match(productApp, /role="tablist"/);
  assert.match(productApp, /role="tabpanel"/);
  assert.match(productApp, /profile-file-drop/);
  assert.match(styles, /\.block-nav button\.active/);
  assert.doesNotMatch(styles, /\.block-nav button:first-child/);
  assert.match(productApp, /jobCardMotion/);
  assert.match(productApp, /actionButtonMotion/);
  assert.match(productApp, /AnimatePresence mode="sync"/);
  assert.match(productApp, /whileFocus/);
  assert.match(productApp, /saas-icon-button/);
  assert.match(productApp, /passIconMotion/);
  assert.match(productApp, /saveIconMotion/);
  assert.match(productApp, /applyIconMotion/);
  assert.match(productApp, /reducedMotion="user"/);
  assert.match(productApp, /history\.pushState/);
  assert.match(productApp, /data-no-transition="true"/);
  assert.match(productApp, /activeView/);
  assert.match(styles, /\.deck-actions button:focus-visible/);
  assert.match(styles, /\.dashboard-view-motion/);
  assert.match(styles, /\.dashboard-profile-progress/);
  assert.match(styles, /\.action-apply:hover:not\(:disabled\)::after/);
  assert.match(styles, /linear-gradient\(135deg,\s*#3b7f5a,\s*#2f6f4c\)/);
  assert.match(styles, /@keyframes action-apply-alive/);
  assert.match(styles, /@keyframes action-ready-pulse/);
  assert.match(styles, /Cohesive SaaS interaction system/);
  assert.match(styles, /--control-shadow-hover/);
});

test("tracks each application with a persistent user-owned pipeline", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(productApp, /trackingStages/);
  assert.match(productApp, /Próxima acción/);
  assert.match(productApp, /Notas privadas/);
  assert.match(productApp, /updateApplicationTracking/);
  assert.match(landeo, /trackingStage/);
  assert.match(landeo, /trackingNextActionAt/);
  assert.match(landeo, /\.eq\("user_id",user\.id\)/);
  assert.match(styles, /\.tracking-stages/);
  assert.match(styles, /\.tracking-notes/);
});

test("opens each notification in its matching application", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(productApp, /app\/applications\?application=\$\{encodeURIComponent\(event\.applicationId\)\}/);
  assert.match(productApp, /onOpenApplication\(clickEvent, event\.applicationId\)/);
  assert.match(productApp, /next\.find\(\(item\) => item\.id === targetId\)/);
  assert.match(productApp, /detailRef\.current\?\.scrollIntoView/);
  assert.match(styles, /\.notification-list > a:focus-visible/);
});

test("keeps the owner-only marketing pipeline separate from real applications", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const demo = productApp.split("function MarketingPipelineDemo")[1]?.split("function SavedView")[0];
  assert.match(productApp, /user\?\.email\?\.trim\(\)\.toLowerCase\(\) === "alberto\.menendez89@gmail\.com"/);
  assert.match(demo, /useState\(100\)/);
  assert.match(demo, /value: 25/);
  assert.match(demo, /value: 6/);
  assert.match(demo, /value: 1/);
  assert.match(demo, /setApplied\(\(count\) => count \+ 1\)/);
  assert.match(demo, /window\.setInterval\(tick, 1000\)/);
  assert.match(demo, /window\.clearInterval\(interval\)/);
  assert.match(demo, /aria-pressed=\{running\}/);
  assert.match(demo, /"Autoapplying"/);
  assert.match(demo, /"Pause autoapplying"/);
  assert.doesNotMatch(demo, /submitApplication|updateApplicationTracking|\.from\(/);
});

test("deletes an account and its private data through an authenticated flow", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const deleteAccount = await readFile(
    new URL("supabase/functions/delete-account/index.ts", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(productApp, /Eliminar cuenta/);
  assert.match(productApp, /deleteConfirmation\.trim\(\)/);
  assert.match(productApp, /Eliminar definitivamente/);
  assert.match(landeo, /functions\.invoke\("delete-account"/);
  assert.match(deleteAccount, /deleteStripeCustomer/);
  assert.match(deleteAccount, /application-receipts/);
  assert.match(deleteAccount, /admin\.auth\.admin\.deleteUser/);
  assert.match(styles, /\.account-delete-dialog/);
});

test("keeps applied and duplicate jobs out of the application feed", async () => {
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const submitApplication = await readFile(
    new URL("supabase/functions/submit-application/index.ts", root),
    "utf8",
  );
  assert.match(landeo, /neq\("direction","save"\)/);
  assert.match(landeo, /hiddenFingerprints/);
  assert.match(landeo, /available-job-targets/);
  assert.match(landeo, /targetIds\.has\(row\.id\)/);
  assert.match(landeo, /seenFingerprints/);
  assert.match(submitApplication, /equivalentJobIds/);
  assert.match(submitApplication, /\.in\("job_id", equivalentJobIds\)/);
});

test("shows accessible route feedback without flashing on quick navigation", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const loading = await readFile(new URL("app/loading.tsx", root), "utf8");
  const transition = await readFile(
    new URL("components/RouteTransition.tsx", root),
    "utf8",
  );
  const safeLink = await readFile(
    new URL("components/SafeLink.tsx", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(layout, /<RouteTransition\s*\/>/);
  assert.match(safeLink, /return <a href=\{href\}/);
  assert.match(transition, /SHOW_DELAY_MS = 180/);
  assert.match(transition, /SAFETY_TIMEOUT_MS/);
  assert.match(transition, /pathname\.startsWith\("\/app\/"\)/);
  assert.match(transition, /role="status"/);
  assert.match(loading, /route-transition-fallback/);
  assert.match(styles, /\.route-transition\.is-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("reuses short-lived dashboard data without crossing user sessions", async () => {
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  assert.match(landeo, /JOB_CACHE_MS=60_000/);
  assert.match(landeo, /DASHBOARD_CACHE_MS=30_000/);
  assert.match(landeo, /data\.session\?\.user\.id\?\?"anonymous"/);
  assert.match(landeo, /clearDashboardCaches/);
  assert.match(landeo, /function mapJob\(row:JobRow\):Job/);
  assert.match(landeo, /map\(row=>mapJob\(row\)\)/);
  assert.doesNotMatch(landeo, /\.map\(mapJob\)/);
});

test("keeps authentication redirects recoverable and preserves the requested route", async () => {
  const authCard = await readFile(
    new URL("components/AuthCard.tsx", root),
    "utf8",
  );
  assert.match(authCard, /skipBrowserRedirect:true/);
  assert.match(authCard, /window\.location\.assign\(data\.url\)/);
  assert.match(authCard, /OAUTH_REDIRECT_TIMEOUT_MS/);
  assert.match(authCard, /new URLSearchParams\(window\.location\.search\)\.get\("next"\)/);
  assert.match(authCard, /window\.location\.replace\(authDestination/);
});

test("guides first-time dashboard visitors through every job action", async () => {
  const tour = await readFile(
    new URL("components/DashboardTour.tsx", root),
    "utf8",
  );
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(tour, /landeo-dashboard-tour-v1/);
  assert.match(tour, /localStorage\.setItem\(storageKey, "complete"\)/);
  assert.match(tour, /dashboard_tour_version/);
  assert.match(tour, /role="dialog"/);
  assert.match(tour, /aria-modal="true"/);
  assert.match(tour, /Automática significa/);
  assert.match(tour, /Automatic means Landeo/);
  assert.match(tour, /createPortal/);
  assert.match(productApp, /data-tour="filters"/);
  assert.match(productApp, /data-tour="job-card"/);
  assert.match(productApp, /data-tour="pass-action"/);
  assert.match(productApp, /data-tour="save-action"/);
  assert.match(productApp, /data-tour="apply-action"/);
  assert.match(productApp, /data-tour=\{item\.id === "applications"/);
  assert.match(productApp, /querySelector\("\.dashboard-tour-layer"\)/);
  assert.match(styles, /\.dashboard-tour-spotlight/);
  assert.match(styles, /\.dashboard-tour-card\.is-anchored/);
});

test("calculates a personalized job match without inflating it by apply channel", () => {
  const profile = {
    role: "Frontend React developer",
    location: "Madrid",
    country: "España",
    skills: ["React", "TypeScript", "Testing"],
    workModes: ["Remoto", "Híbrido"],
    minSalary: 45000,
    maxSalary: 70000,
    yearsExperience: 4,
  };
  const aligned = calculateJobMatch({
    title: "Frontend React Developer",
    summary: "Build a TypeScript product with automated testing.",
    description: "React, TypeScript and testing for a distributed product team.",
    location: "Madrid, España",
    work_mode: "Híbrido",
    salary_min: 50000,
    salary_max: 65000,
    seniority: "Mid level",
    metadata: {},
  }, profile);
  const unrelated = calculateJobMatch({
    title: "Senior Medical Sales Director",
    summary: "Lead hospital sales across Lisbon.",
    description: "Healthcare procurement and enterprise sales.",
    location: "Lisboa, Portugal",
    work_mode: "Presencial",
    salary_min: 25000,
    salary_max: 35000,
    seniority: "Senior",
    metadata: {},
  }, profile);
  assert.ok(aligned.score > unrelated.score);
  assert.ok(aligned.reasons.includes("skills"));
  assert.ok(aligned.reasons.includes("location"));
});

test("understands adjacent marketing role names when calculating relevance", () => {
  const profile = {
    role: "Marketing",
    location: "Madrid",
    country: "España",
    skills: ["SEO", "Content strategy"],
    workModes: ["Híbrido"],
    minSalary: null,
    maxSalary: null,
    yearsExperience: 3,
  };
  const growthRole = calculateJobMatch({
    title: "Growth & Brand Specialist",
    summary: "Own acquisition campaigns and content strategy.",
    description: "Build lifecycle and SEO programs for Spain.",
    location: "Madrid, España",
    work_mode: "Híbrido",
    salary_min: null,
    salary_max: null,
    seniority: "Mid level",
    metadata: {},
  }, profile);
  assert.ok(growthRole.score >= 80);
  assert.ok(growthRole.reasons.includes("role"));
});

test("uses work authorization without hiding jobs whose sponsorship data is unknown", () => {
  const baseJob = {
    title: "Product Designer",
    summary: "Design a global product.",
    description: "Work with a distributed product team.",
    work_mode: "Presencial",
    salary_min: null,
    salary_max: null,
    seniority: "Mid level",
  };
  const authorizedInSpain = {
    role: "Product Designer",
    location: "Madrid",
    country: "España",
    skills: ["Product design"],
    workModes: ["Híbrido"],
    minSalary: null,
    maxSalary: null,
    yearsExperience: 3,
    workAuthorizationCountries: ["España"],
    visaRequirement: "No sponsorship required",
  };
  const madrid = { ...baseJob, location: "Madrid, Spain", metadata: { market_country: "ES" } };
  const newYork = { ...baseJob, location: "New York, United States", metadata: { market_country: "US" } };
  const globalRemote = { ...baseJob, location: "Remote · Worldwide", work_mode: "Remote", metadata: { market_country: "REMOTE" } };
  assert.equal(isJobWorkAuthorizationCompatible(madrid, authorizedInSpain), true);
  assert.equal(isJobWorkAuthorizationCompatible(newYork, authorizedInSpain), false);
  assert.equal(isJobWorkAuthorizationCompatible(globalRemote, authorizedInSpain), true);
  assert.ok(calculateJobMatch(madrid, authorizedInSpain).reasons.includes("authorization"));

  const needsSponsorship = {
    ...authorizedInSpain,
    workAuthorizationCountries: [],
    visaRequirement: "Requires sponsorship",
  };
  assert.equal(isJobWorkAuthorizationCompatible(newYork, needsSponsorship), true);
  assert.equal(isJobWorkAuthorizationCompatible({ ...newYork, metadata: { market_country: "US", visa_sponsorship: false } }, needsSponsorship), false);
  assert.equal(isJobWorkAuthorizationCompatible({ ...newYork, metadata: { market_country: "US", visa_sponsorship: true } }, needsSponsorship), true);
});

test("offers the real Landeo plans before opening Stripe", async () => {
  const productApp = await readFile(
    new URL("components/ProductApp.tsx", root),
    "utf8",
  );
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  const landeoLib = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const stripeFunction = await readFile(
    new URL("supabase/functions/create-stripe-checkout/index.ts", root),
    "utf8",
  );
  assert.match(productApp, /14,99 €/);
  assert.match(productApp, /34,99 €/);
  assert.match(productApp, /89,99 €/);
  assert.match(productApp, /startStripe\("checkout", selectedPlan\)/);
  assert.match(productApp, /name="landeo-plan"/);
  assert.match(productApp, /Secure payment with Stripe/);
  assert.match(landeoLib, /window\.location\.pathname/);
  assert.match(landeoLib, /returnTo/);
  assert.match(stripeFunction, /safeReturnUrl/);
  assert.match(stripeFunction, /body\.returnTo/);
  assert.match(styles, /\.plan-picker-modal/);
  assert.match(styles, /\.plan-picker-options label\.selected/);
  assert.match(styles, /\.plan-picker-visual/);
});

test("keeps the marketing demo isolated from real applications", async () => {
  assert.ok(marketingDemoJobs.length >= 20);
  assert.equal(new Set(marketingDemoJobs.map((job) => job.id)).size, marketingDemoJobs.length);
  assert.ok(marketingDemoJobs.every((job) => job.metadata?.demo === true));
  assert.ok(
    marketingDemoJobs.filter(
      (job) => typeof job.metadata?.company_logo === "string",
    ).length >= 10,
  );
  const response = await render("/demo/marketing");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Landeo — Marketing/);
  assert.match(html, /Datos ficticios/);
  assert.match(html, /noindex/);
});

test("animates onboarding interactions and exposes issue reporting", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  const onboarding = await readFile(
    new URL("components/Onboarding.tsx", root),
    "utf8",
  );
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(packageJson, /"motion"/);
  assert.match(onboarding, /AnimatePresence/);
  assert.match(onboarding, /LazyMotion/);
  assert.match(onboarding, /reducedMotion="user"/);
  assert.match(onboarding, /careers@haired\.app/);
  assert.match(onboarding, /onboarding-report-link/);
  assert.match(onboarding, /workAuthorization/);
  assert.match(onboarding, /authorizationChoices/);
  assert.match(onboarding, /job-route-map/);
  assert.match(onboarding, /potential-dashboard/);
  assert.match(onboarding, /potential-match-list/);
  assert.match(onboarding, /potential-scan-line/);
  assert.doesNotMatch(onboarding, /job-route-map potential-route-map/);
  assert.match(onboarding, /YOUR PREFERENCES/);
  assert.match(onboarding, /PRIORITIZED OPPORTUNITIES/);
  assert.match(onboarding, /Target range/);
  assert.match(onboarding, /company-logos\/openai\.png/);
  assert.match(onboarding, /getResilientSession/);
  assert.match(onboarding, /login\?next=\/onboarding/);
  assert.match(landeo, /workAuthorizationCountries/);
  assert.match(landeo, /Requires sponsorship/);
  assert.match(styles, /\.route-connector/);
  assert.match(styles, /@keyframes route-flow/);
  assert.match(styles, /\.onboarding-choice-grid button \{[\s\S]*?min-height: 88px/);
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
    /const result = await submitApplication\(jobId[\s\S]*triggerConfetti\(\);[\s\S]*removeCurrent\(1\)/,
  );
  assert.match(productApp, /prepareCoverLetter\(job\.id\)/);
  assert.match(productApp, /Review it before sending/);
  assert.match(productApp, /pendingApplications/);
  assert.doesNotMatch(productApp, /\{outcome &&/);
  assert.match(landeo, /prioritizeJobsWithRemoteFallback/);
  assert.match(landeo, /metadata->>market_country/);
  assert.match(landeo, /application_capability","automatic"/);
  assert.match(landeo, /includeDismissed/);
  assert.match(landeo, /includeWorldwide/);
  assert.match(landeo, /work_mode",\["Remoto","Híbrido"\]/);
  assert.match(landeo, /profile\?\.universal_profile/);
  assert.match(jobLocation, /worldwide\|global\|anywhere/);
  assert.match(jobLocation, /europe\|europa\|european\|eu\|eea\|emea/);
  assert.match(styles, /@keyframes landeo-confetti/);
  assert.match(productApp, /automaticEverywhere/);
  assert.match(productApp, /router\.push\(`\/app\/jobs\/\$\{job\.id\}`\)/);
  assert.match(productApp, /Ver oferta completa/);
  assert.match(landeo, /jobSearchGroups/);
  assert.match(landeo, /featuredScore/);
  assert.match(landeo, /requestedSearch/);
  assert.match(styles, /\.automatic-empty-actions/);
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

test("city autocomplete matches Spanish names such as Ciudad de México", async () => {
  const onboarding = await readFile(new URL("components/Onboarding.tsx", root), "utf8");
  const cities = JSON.parse(await readFile(new URL("public/cities-world.json", root), "utf8"));
  const block = onboarding.match(/const CITY_ALIASES[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const aliases = [...block.matchAll(/"([^"|]+)\|([A-Z]{2})":\s*\[([^\]]*)\]/g)];
  assert.ok(aliases.length >= 10);
  const normalize = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [, name, code] of aliases) {
    assert.ok(cities.some((city) => city.n === name && city.cc === code), `${name}|${code} is not in cities-world.json`);
  }
  const mexico = aliases.find(([, name, code]) => name === "Mexico City" && code === "MX");
  const names = [...mexico[3].matchAll(/"([^"]+)"/g)].map((match) => normalize(match[1]));
  assert.ok(names.some((name) => name.startsWith(normalize("Ciudad de Mexico"))));
});

test("searching for a place finds its jobs and never leaves the feed empty", async () => {
  const landeo = await readFile(new URL("lib/landeo.ts", root), "utf8");
  const productApp = await readFile(new URL("components/ProductApp.tsx", root), "utf8");
  // The search also queries the location column, with the usual city spellings.
  assert.match(landeo, /function requestedSearchFilter[\s\S]*location\.ilike/);
  assert.match(landeo, /requestedFilter=options\.search\?requestedSearchFilter\(options\.search\)/);
  // A searched place overrides the profile city and the sponsorship filter.
  assert.match(landeo, /searchedMarket=options\.search\?resolveCountryCode\(""/);
  assert.match(landeo, /searchedMarket\|\|isJobWorkAuthorizationCompatible/);
  // The client matches on location and falls back to remote roles.
  assert.match(productApp, /citySearchTerms\(value\)/);
  assert.match(productApp, /searchFallback/);
  assert.match(productApp, /job\.workMode === "remote"/);
});


test("shows what actually happened to an application, not the personal stage", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  const app = (status, extra = {}) => ({
    status, deliveryStatus: null, appliedAt: "2026-10-22T12:00:00Z", actionUrl: null, requiredFields: [],
    tracking: { stage: "applied", notes: "", nextAction: "", nextActionAt: null, updatedAt: null }, ...extra,
  });
  assert.equal(deliveryState(app("action_required"), "es", now).key, "pending");
  assert.equal(deliveryState(app("failed"), "es", now).key, "failed");
  assert.equal(deliveryState(app("queued"), "es", now).key, "processing");
  assert.equal(deliveryState(app("sent", { deliveryStatus: "delivered" }), "es", now).label, "Entregada a la empresa");
  assert.equal(deliveryState(app("sent"), "en", now).label, "Sent to the company");
  // A queued application that has waited a week is called out, never shown as "Aplicada".
  const old = app("queued", { appliedAt: "2026-10-10T12:00:00Z" });
  assert.match(deliveryState(old, "es", now).label, /13 días/);
  const guide = applicationGuide(old, "es");
  assert.equal(guide.tone, "action");
  assert.match(guide.title, /días en gestión/);
  assert.match(guide.nextStep, /directamente/);
  const fresh = applicationGuide(app("queued"), "es");
  assert.equal(fresh.tone, "waiting");
});


test("recognises company replies sent to an application's reply address", () => {
  const token = "0123456789abcdef0123456789abcdef";
  const domain = "reply.getlandeo.com";
  assert.equal(parseReplyToken([`apply+${token}@${domain}`], domain), token);
  assert.equal(parseReplyToken([`"Ana Pérez" <APPLY+${token.toUpperCase()}@Reply.GetLandeo.com>`], domain), token);
  // Other products share the Resend account: anything else is ignored.
  assert.equal(parseReplyToken(["hello@mail.haired.app"], domain), null);
  assert.equal(parseReplyToken([`apply+${token}@other.example.com`], domain), null);
  assert.equal(parseReplyToken([`apply+short@${domain}`], domain), null);
  assert.equal(parseReplyToken(undefined, domain), null);
  assert.deepEqual(parseSender('"Marta Gil" <Marta@Empresa.COM>'), { name: "Marta Gil", address: "marta@empresa.com", domain: "empresa.com" });
});

test("tells human replies from automatic acknowledgements and bounces", () => {
  const kind = (from, subject, headers = {}) => classifyInbound({ from, subject, headers });
  assert.equal(kind("Marta Gil <marta@empresa.com>", "Re: Application: Partnerships Manager"), "reply");
  assert.equal(kind("Marta Gil <marta@empresa.com>", "Sobre tu candidatura"), "reply");
  assert.equal(kind("jobs@empresa.com", "Hemos recibido tu candidatura"), "auto_reply");
  assert.equal(kind("jobs@empresa.com", "Thank you for applying"), "auto_reply");
  assert.equal(kind("marta@empresa.com", "Fuera de la oficina"), "auto_reply");
  assert.equal(kind("no-reply@ats.example.com", "Update"), "auto_reply");
  assert.equal(kind("hr@empresa.com", "Hello", { "Auto-Submitted": "auto-replied" }), "auto_reply");
  assert.equal(kind("hr@empresa.com", "Hello", [{ name: "Precedence", value: "bulk" }]), "auto_reply");
  assert.equal(kind("hr@empresa.com", "Hello", { "Auto-Submitted": "no" }), "reply");
  assert.equal(kind("MAILER-DAEMON@mx.empresa.com", "Returned mail"), "bounce");
  assert.equal(kind("postmaster@empresa.com", "Delivery Status Notification (Failure)"), "bounce");
});

test("keeps only a short preview of a reply, without quoted history", () => {
  const text = "Hola Daniel,\n\nGracias por tu candidatura. ¿Podemos hablar el jueves?\n\n> Hello, Daniel is applying...\nOn Thu, Oct 22, 2026 at 10:00 Landeo wrote:\n> older text";
  assert.equal(previewFromText(text), "Hola Daniel, Gracias por tu candidatura. ¿Podemos hablar el jueves?");
  const long = previewFromText("palabra ".repeat(100), 50);
  assert.ok(long.length <= 50 && long.endsWith("…"));
  assert.equal(previewFromText(null), "");
});

test("a human reply outranks the delivery state; a failed send does not", () => {
  const base = { deliveryStatus: "delivered", appliedAt: "2026-10-20T12:00:00Z" };
  const reply = { id: "r1", kind: "reply" };
  assert.equal(deliveryState({ ...base, status: "sent", replies: [reply] }, "es").key, "replied");
  assert.equal(deliveryState({ ...base, status: "sent", replies: [{ id: "r2", kind: "auto_reply" }] }, "es").key, "sent");
  assert.equal(deliveryState({ ...base, status: "failed", replies: [reply] }, "es").key, "failed");
  const guide = applicationGuide({ ...base, status: "sent", actionUrl: null, requiredFields: [], replies: [reply],
    tracking: { stage: "applied", notes: "", nextAction: "", nextActionAt: null, updatedAt: null } }, "es");
  assert.equal(guide.title, "La empresa ha respondido");
});

test("reply tracking is opt-in, private and does not break the current flow", async () => {
  const submit = await readFile(new URL("supabase/functions/submit-application/index.ts", root), "utf8");
  // Without REPLY_DOMAIN (or for the internal intake) the candidate keeps getting replies directly.
  assert.match(submit, /let replyTo = candidateEmail;/);
  assert.match(submit, /if \(replyDomain && !internalIntake\)/);
  assert.match(submit, /reply_to: replyTo,/);
  const migration = await readFile(new URL("supabase/migrations/20261023180000_add_application_replies.sql", root), "utf8");
  assert.match(migration, /alter table public\.application_replies enable row level security/);
  assert.match(migration, /using \(user_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /create policy[^;]*for (insert|update|delete)/i);
  assert.match(migration, /on delete cascade/);
  const inbound = await readFile(new URL("supabase/functions/resend-inbound/index.ts", root), "utf8");
  assert.match(inbound, /verifySignature/);
  assert.match(inbound, /RESEND_INBOUND_API_KEY/);
  // The forward is sent from the reply domain, which RESEND_API_KEY is not allowed to use.
  assert.match(inbound, /Authorization: `Bearer \${inboundApiKey\(\)}`, "Content-Type"/);
  assert.match(inbound, /if \(!token\) return json\(\{ ok: true, ignored: true \}\)/);
  assert.match(inbound, /sender\.domain === replyDomain/);
  const config = await readFile(new URL("supabase/config.toml", root), "utf8");
  assert.match(config, /\[functions\.resend-inbound\]\s*verify_jwt = false/);
});

test("job sources can be refreshed by category, expire old ads and feed LatAm remote roles", async () => {
  const importer = await readFile(new URL("supabase/functions/import-jobs/index.ts", root), "utf8");
  assert.match(importer, /adzunaCategories/);
  assert.match(importer, /adzunaMarkets/);
  assert.match(importer, /category", category/);
  // Expired Adzuna ads (their links answer 410) are closed on every Adzuna run.
  assert.match(importer, /closeExpiredAdzuna\(supabase\)/);
  assert.match(importer, /async function jobicyJobs/);
  assert.match(importer, /name: "Jobicy", load: jobicyJobs/);
  const schedule = await readFile(new URL("supabase/migrations/20261024120000_schedule_job_source_syncs.sql", root), "utf8");
  assert.match(schedule, /revoke all on function public\.sync_job_sources/);
  assert.match(schedule, /sync-jobicy-daily/);
  assert.match(schedule, /sync-adzuna-mx-daily/);
});


test("matches Latin American roles in both Spanish and English across every onboarding category", () => {
  const job = (title, extra = {}) => ({ title, summary: "", description: "", location: "Bogotá, Colombia", work_mode: "Presencial", salary_min: null, salary_max: null, seniority: null, metadata: {}, ...extra });
  const profile = (role) => ({ role, location: "Bogotá, Colombia", skills: [], workModes: [], minSalary: null, maxSalary: null, yearsExperience: 4, country: "Colombia" });
  const relevant = (role, title) => isJobProfessionallyRelevant(job(title), profile(role));
  // Operations (the most chosen category) used to match almost nothing.
  for (const title of ["Analista de Operaciones", "Operations Manager", "Coordinador de Logística", "Supply Chain Analyst", "Jefe de Compras", "Customer Success Manager", "Project Manager"]) {
    assert.equal(relevant("Operaciones", title), true, title);
  }
  assert.equal(relevant("Project Management, Cadena de suministro", "Supply Chain Coordinator"), true);
  // Finance, HR, sales and legal in Spanish.
  assert.equal(relevant("Finanzas", "Contador Senior"), true);
  assert.equal(relevant("Contabilidad, Auditoría", "Analista de Auditoría Interna"), true);
  assert.equal(relevant("Recursos humanos", "Reclutador IT"), true);
  assert.equal(relevant("Marketing y ventas", "Ejecutivo Comercial"), true);
  assert.equal(relevant("Marketing y ventas", "Community Manager"), true);
  assert.equal(relevant("Legal", "Abogado Corporativo"), true);
  assert.equal(relevant("Salud", "Enfermero/a"), true);
  // And it must not let unrelated families through.
  assert.equal(relevant("Operaciones", "Senior Backend Engineer"), false);
  assert.equal(relevant("Finanzas", "Diseñador UX"), false);
  assert.equal(relevant("Recursos humanos", "Account Executive"), false);
});

test("remote-first employers only bring roles open to Spain, Latin America or anywhere", async () => {
  const importer = await readFile(new URL("supabase/functions/import-jobs/index.ts", root), "utf8");
  assert.match(importer, /function isOpenRemote/);
  // A country restriction is not an open role.
  assert.match(importer, /anywhere in \(\?!the world\|europe\|emea\|latam\|latin\)/);
  assert.match(importer, /const REGIONAL_MARKETS = new Set<TargetMarket>/);
  assert.match(importer, /function ashbyMarket/);
  // Ranking boost for the flagged employers.
  assert.match(importer, /top_company: true/);
  for (const token of ["alan", "supabase", "cohere", "snowflake", "customerio", "jetbrains"]) {
    assert.match(importer, new RegExp(`token: "${token}"[^}]*remote: true, regional: true`), token);
  }
  // Existing boards keep every market: they are remote-first but not regional-only.
  assert.match(importer, /token: "gitlab"[^}]*remote: true \}/);
});

test("Lever and Ashby offers that leave a company's board are closed, and run daily", async () => {
  const importer = await readFile(new URL("supabase/functions/import-jobs/index.ts", root), "utf8");
  assert.match(importer, /async function closeMissingBoardJobs/);
  assert.match(importer, /closeMissingBoardJobs\(supabase, "lever"/);
  assert.match(importer, /closeMissingBoardJobs\(supabase, "ashby"/);
  // Only boards that answered in this run may close offers, so an outage cannot close a company.
  assert.match(importer, /loadedBoards\.has\(board\)/);
  const schedule = await readFile(new URL("supabase/migrations/20261024180000_schedule_ashby_lever_syncs.sql", root), "utf8");
  assert.match(schedule, /sync-ashby-daily/);
  assert.match(schedule, /sync-lever-daily/);
  const cleaner = await readFile(new URL("scripts/close-dead-job-links.mjs", root), "utf8");
  // Dry run unless --write, and only a definite 404/410 closes an offer by link.
  assert.match(cleaner, /process\.argv\.includes\("--write"\)/);
  assert.match(cleaner, /code === 404 \|\| code === 410/);
});


test("the privacy policy discloses how employer replies are processed, in both languages", async () => {
  const legal = await readFile(new URL("lib/legal-documents.ts", root), "utf8");
  // Spanish
  assert.match(legal, /Respuestas de empresas a tus candidaturas enviadas por correo/);
  assert.match(legal, /apply\+código@reply\.getlandeo\.com/);
  assert.match(legal, /extracto de hasta 280 caracteres/);
  assert.match(legal, /la recepción y reenvío de las respuestas de las empresas/);
  assert.match(legal, /se eliminan al borrar la cuenta/);
  // English
  assert.match(legal, /Employer replies to applications sent by email/);
  assert.match(legal, /apply\+code@reply\.getlandeo\.com/);
  assert.match(legal, /preview of up to 280 characters/);
  assert.match(legal, /receiving and forwarding employer replies/);
  assert.match(legal, /are deleted when you delete your account/);
  assert.match(legal, /last updated: 24 October 2026/);
  assert.match(legal, /actualizada por última vez: 24 de octubre de 2026/);
  // The preview limit stated to users must match what the function really stores.
  const helper = await readFile(new URL("supabase/functions/_shared/inbound-reply.ts", root), "utf8");
  assert.match(helper, /previewFromText\(text: unknown, max = 280\)/);
});


test("the access code screen survives a refresh and never blocks the person with a dead button", async () => {
  const now = Date.parse("2026-10-26T12:00:00Z");
  const pending = (extra = {}) => JSON.stringify({ email: "ana@gmail.com", mode: "signup", at: now - 20_000, ...extra });
  // A refresh 20 s after asking for the code keeps the screen and the remaining cooldown.
  assert.deepEqual(parsePendingCode(pending(), "signup", now), { email: "ana@gmail.com", resendIn: AUTH_RESEND_SECONDS - 20 });
  assert.equal(parsePendingCode(pending({ at: now - 120_000 }), "signup", now)?.resendIn, 0);
  // It does not leak across modes, expire late, or accept broken data.
  assert.equal(parsePendingCode(pending(), "login", now), null);
  assert.equal(parsePendingCode(pending({ at: now - 16 * 60_000 }), "signup", now), null);
  assert.equal(parsePendingCode(pending({ at: now + 60_000 }), "signup", now), null);
  assert.equal(parsePendingCode(pending({ email: "no-es-un-email" }), "signup", now), null);
  assert.equal(parsePendingCode("{not json", "signup", now), null);
  assert.equal(parsePendingCode(null, "signup", now), null);

  const card = await readFile(new URL("components/AuthCard.tsx", root), "utf8");
  // The verify button is only disabled while loading: a short code gets an explanation, not a dead click.
  assert.doesNotMatch(card, /disabled=\{loading\|\|code\.length!==AUTH_EMAIL_CODE_LENGTH\}/);
  assert.match(card, /Introduce el código completo del último correo/);
  // Pasting or typing the last digit submits by itself.
  assert.match(card, /requestSubmit\(\)/);
  // Someone who already has a code can enter it, and changing email clears the countdown.
  assert.match(card, /Ya tengo un código/);
  assert.match(card, /setResendIn\(0\);forgetPending\(\)/);
  assert.match(card, /parsePendingCode\(window\.sessionStorage/);
});


test("access codes of 6 digits (new) and 8 digits (issued before the switch) both work", async () => {
  assert.equal(isValidAuthCode("123456"), true);
  assert.equal(isValidAuthCode("12345678"), true);
  for (const bad of ["", "12345", "1234567", "123456789", "12 456", "abcdef", "12345a"]) assert.equal(isValidAuthCode(bad), false, bad);
  const card = await readFile(new URL("components/AuthCard.tsx", root), "utf8");
  // 8 digits submit at once; 6 wait a moment in case the person is still typing an older 8-digit code.
  assert.match(card, /AUTH_LEGACY_CODE_LENGTH\)autoSubmit\.current=setTimeout\(submitCode,0\)/);
  assert.match(card, /AUTH_EMAIL_CODE_LENGTH\)autoSubmit\.current=setTimeout\(submitCode,900\)/);
  // The page never states the length, so it is right before and after Supabase switches.
  assert.doesNotMatch(card, /código de \{AUTH_EMAIL_CODE_LENGTH\} dígitos/);
  // Google first, on top, when it is available.
  assert.ok(card.indexOf("social-button-primary") < card.indexOf("Recibir código por email"));
  const template = await readFile(new URL("supabase/templates/email-code.html", root), "utf8");
  assert.doesNotMatch(template.replace(/<[^>]*>/g, " "), /\b(ocho|seis|eight|six)\b/i);
  assert.match(template, /\{\{ \.Token \}\}/);
  assert.match(template, /Entrar con un clic/);
  const script = await readFile(new URL("scripts/configure-email-otp.mjs", root), "utf8");
  assert.match(script, /--length=6/);
});


test("a request that never answers cannot freeze the access form", async () => {
  // Resolves normally and keeps the original rejection.
  assert.equal(await withTimeout(Promise.resolve(7), 50, "x"), 7);
  await assert.rejects(withTimeout(Promise.reject(new Error("boom")), 50, "x"), /boom/);
  // A promise that never settles is rejected with a recognisable timeout.
  const never = new Promise(() => {});
  await assert.rejects(withTimeout(never, 20, "verify"), /timeout:verify/);
  let category = "";
  try { await withTimeout(never, 10, "verify"); } catch (error) { category = authErrorCategory(error); }
  assert.equal(category, "timeout");
  assert.match(readableAuthError(new Error("timeout:verify")), /tardando más de lo normal/);
  const card = await readFile(new URL("components/AuthCard.tsx", root), "utf8");
  for (const label of ["verify", "send", "profile"]) assert.match(card, new RegExp(`"${label}"\\)`), label);
  // Browsers without requestSubmit (older Safari, some in-app browsers) still submit.
  assert.match(card, /typeof form\.requestSubmit==="function"/);
  assert.match(card, /dispatchEvent\(new Event\("submit"/);
});


test("a background refresh of the profile never wipes what is being typed", async () => {
  const saved = { firstName: "Ana", lastName: "Gil", email: "ana@x.com", phone: "", city: "Madrid", country: "España", role: "Ventas", authorization: "España", privacy: false, automatic: false };
  // First load fills the form from the saved profile.
  let step = nextProfileForm(saved, { ...saved, firstName: "", lastName: "" }, null);
  assert.equal(step.apply, true);
  const baseline = step.baseline;
  // Untouched form: a changed saved profile is applied.
  assert.equal(nextProfileForm({ ...saved, city: "Sevilla" }, saved, baseline).apply, true);
  // The person typed a phone and ticked both consents, then the tab regained focus and the
  // profile was refreshed with the old saved values: keep what they typed.
  const typed = { ...saved, phone: "600123123", privacy: true, automatic: true };
  step = nextProfileForm(saved, typed, baseline);
  assert.equal(step.apply, false);
  // ...and again on the next refresh.
  assert.equal(nextProfileForm(saved, typed, step.baseline).apply, false);
  // Once it is saved, the refresh brings the same values and the form follows the new baseline.
  step = nextProfileForm(typed, typed, step.baseline);
  assert.equal(step.apply, true);
  assert.deepEqual(step.baseline, typed);
  assert.equal(nextProfileForm({ ...typed, city: "Bilbao" }, typed, step.baseline).apply, true);
  const app = await readFile(new URL("components/ProductApp.tsx", root), "utf8");
  assert.match(app, /nextProfileForm\(saved,/);
});
