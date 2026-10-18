"use client";
/* eslint-disable react-hooks/set-state-in-effect -- These effects hydrate authenticated Supabase state and subscribe to external auth/application updates. */

import Link from "./SafeLink";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
} from "motion/react";
import { statusCopy, type Job } from "../lib/fixtures";
import { createSupabaseBrowserClient, getResilientSession } from "../lib/supabase/client";
import {
  coverLetterReadiness,
  deleteCurrentAccount,
  hasWebPro,
  loadAutoApplyDashboard,
  loadApplications,
  loadJobs,
  loadProfile,
  loadSavedJobs,
  prepareCoverLetter,
  profileReadiness,
  recordSwipe,
  runAutoApplyNow,
  saveAutoApplySettings,
  saveProfile,
  startStripe,
  submitApplication,
  updateApplicationTracking,
  type ApplyOutcome,
  type AutoApplyDashboard,
  type AutoApplySettings,
  type CandidateProfile,
  type LiveApplication,
  type TrackingStage,
} from "../lib/landeo";
import { Brand } from "./Brand";
import { GuidedCoverLetter } from "./GuidedCoverLetter";
import { SupportChat } from "./SupportChat";
import { DashboardTour } from "./DashboardTour";
import { dashboardCopy, type DashboardLocale } from "../lib/dashboard-i18n";
import { marketingDemoJobs } from "../lib/marketing-demo";
import { applicationGuide } from "../lib/application-guidance";
import { trackProductEvent } from "../lib/analytics";

export type ProductView =
  | "jobs"
  | "auto-apply"
  | "applications"
  | "saved"
  | "notifications"
  | "profile"
  | "universal"
  | "cover-letter";
type ApplicationFlowState = {
  job: Job;
  phase: "preparing" | "review" | "no_letter" | "submitting" | "result" | "error";
  letter: string;
  outcome?: ApplyOutcome;
  usageStatus?: string | null;
  error?: string;
};
type IdentitySnapshot = {
  user: User | null;
  profile: CandidateProfile | null;
  pro: boolean;
  confirmed: boolean;
};
type PaywallContext = {
  source: "apply" | "application_error";
  capability?: Job["applyCapability"];
};
const viewFromPath = (pathname: string): ProductView | null => {
  if (pathname === "/app/jobs") return "jobs";
  if (pathname === "/app/auto-apply") return "auto-apply";
  if (pathname === "/app/applications") return "applications";
  if (pathname === "/app/cover-letter") return "cover-letter";
  if (pathname === "/app/saved") return "saved";
  if (pathname === "/app/notifications") return "notifications";
  if (pathname === "/app/profile/universal") return "universal";
  if (pathname === "/app/profile") return "profile";
  return null;
};
const nav = [
  { id: "jobs", href: "/app/jobs", icon: "⌁", labelKey: "jobs" },
  { id: "auto-apply", href: "/app/auto-apply", icon: "⚡", labelKey: "autoApply" },
  {
    id: "applications",
    href: "/app/applications",
    icon: "↗",
    labelKey: "applications",
  },
  {
    id: "cover-letter",
    href: "/app/cover-letter",
    icon: "✦",
    labelKey: "coverLetter",
  },
  { id: "saved", href: "/app/saved", icon: "♡", labelKey: "saved" },
  {
    id: "notifications",
    href: "/app/notifications",
    icon: "◌",
    labelKey: "notifications",
  },
  { id: "profile", href: "/app/profile", icon: "◎", labelKey: "profile" },
] as const;
const mobileNavItems = nav.filter((item) => ["jobs", "auto-apply", "applications", "saved", "profile"].includes(item.id));
const capabilityIcon = { automatic: "✓", assisted: "↗", external: "↗" };
const matchReasonCopy: Record<DashboardLocale, Record<string, string>> = {
  es: {
    role: "El puesto encaja con el rol que buscas",
    skills: "Coincide con habilidades de tu perfil",
    remote: "Modalidad remota compatible",
    location: "Ubicación compatible con tu búsqueda",
    salary: "Dentro de tu rango salarial",
    experience: "Nivel de experiencia compatible",
    profile: "Estimación inicial; completa tu perfil para afinarla",
  },
  en: {
    role: "The role matches what you are looking for",
    skills: "Matches skills in your profile",
    remote: "Compatible remote setup",
    location: "Location matches your search",
    salary: "Within your salary range",
    experience: "Compatible experience level",
    profile: "Initial estimate; complete your profile to refine it",
  },
};
const dashboardViewMotion = {
  hidden: { opacity: 0, y: 6, scale: 0.997 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.998 },
};
const jobCardMotion = {
  enter: { opacity: 0, y: 18, scale: 0.985 },
  center: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction < 0 ? -150 : 150,
    scale: 0.96,
    rotate: direction < 0 ? -2.5 : 2.5,
  }),
};
const actionButtonMotion = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -2,
    scale: 1.006,
    transition: { type: "spring", stiffness: 520, damping: 32 },
  },
  tap: { y: 0, scale: 0.975, transition: { duration: 0.08 } },
} as const;
const actionLabelMotion = {
  rest: { x: 0 },
  hover: { x: 2, transition: { type: "spring", stiffness: 500, damping: 28 } },
} as const;
const passIconMotion = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 90, scale: 1.1 },
  tap: { rotate: 70, scale: 0.88 },
} as const;
const saveIconMotion = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: -7, scale: 1.16 },
  tap: { rotate: 0, scale: 0.82 },
} as const;
const applyIconMotion = {
  rest: { x: 0, scale: 1 },
  hover: { x: 4, scale: 1.08 },
  tap: { x: 7, scale: 0.9 },
} as const;
const localized = (locale: DashboardLocale, es: string, en: string) =>
  locale === "es" ? es : en;
const queryAliases: Array<{ match: RegExp; terms: RegExp }> = [
  { match: /marketing|mercadotecnia|comunicacion/i, terms: /marketing|growth|brand|content|communications?|demand generation|acquisition|lifecycle|seo/i },
  { match: /software|ingenier|developer|programador/i, terms: /software|engineer|engineering|developer|frontend|backend|fullstack|platform|devops/i },
  { match: /product|producto/i, terms: /product|product owner|product operations/i },
  { match: /design|disen|ux|ui/i, terms: /design|designer|ux|ui|research/i },
  { match: /sales|ventas|comercial/i, terms: /sales|account executive|business development|partnerships|revenue/i },
];
function matchesJobQuery(job: Job, query: string) {
  const value = query.trim();
  if (!value) return true;
  const haystack = `${job.title} ${job.company} ${job.industry} ${job.skills.join(" ")}`;
  if (haystack.toLowerCase().includes(value.toLowerCase())) return true;
  return queryAliases.some((group) => group.match.test(value) && group.terms.test(haystack));
}
type EarlyCareerFilter = "all" | "internship" | "junior";
type IndustryFilter = "all" | "pharmaceuticals";
function jobCareerLevel(job: Job): Exclude<EarlyCareerFilter, "all"> | "experienced" {
  const value = `${job.title} ${job.seniority} ${job.contractType}`.toLowerCase();
  if (/internship|\bintern\b|práctic|practicante|beca|trainee|apprentice|working student|co-op|placement|stage\b/.test(value)) return "internship";
  if (/junior|jr\.?\b|entry.?level|graduate|new grad|associate|emerging talent/.test(value)) return "junior";
  return "experienced";
}
function matchesIndustry(job: Job, industry: IndustryFilter) {
  if (industry === "all") return true;
  const value = `${job.industry} ${job.title} ${String(job.metadata?.industry ?? "")}`;
  return /pharma|farmac|droguer|medicamento|biotech|life science/i.test(value);
}
const trackingStages: TrackingStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "closed",
];
const trackingLabel = (stage: TrackingStage, locale: DashboardLocale) =>
  ({
    applied: localized(locale, "Aplicada", "Applied"),
    screening: localized(locale, "En revisión", "Screening"),
    interview: localized(locale, "Entrevista", "Interview"),
    offer: localized(locale, "Oferta", "Offer"),
    closed: localized(locale, "Cerrada", "Closed"),
  })[stage];
const adzunaDomains: Record<string, string> = {
  AT: "https://www.adzuna.at",
  AU: "https://www.adzuna.com.au",
  BR: "https://www.adzuna.com.br",
  CA: "https://www.adzuna.ca",
  DE: "https://www.adzuna.de",
  ES: "https://www.adzuna.es",
  FR: "https://www.adzuna.fr",
  GB: "https://www.adzuna.co.uk",
  IN: "https://www.adzuna.in",
  IT: "https://www.adzuna.it",
  MX: "https://www.adzuna.com.mx",
  NL: "https://www.adzuna.nl",
  NZ: "https://www.adzuna.co.nz",
  PL: "https://www.adzuna.pl",
  SG: "https://www.adzuna.sg",
  US: "https://www.adzuna.com",
  ZA: "https://www.adzuna.co.za",
};

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function money(job: Job, locale: DashboardLocale) {
  if (!job.salaryMin || !job.salaryMax)
    return dashboardCopy[locale].salaryUnavailable;
  const format = (value: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: job.salaryCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  return `${format(job.salaryMin)}–${format(job.salaryMax)}`;
}
function displayName(
  user: User | null,
  profile: CandidateProfile | null,
  locale: DashboardLocale = "es",
) {
  return (
    profile?.fullName ||
    String(
      user?.user_metadata?.full_name ??
        user?.email?.split("@")[0] ??
        localized(locale, "Tu perfil", "Your profile"),
    )
  );
}

function adzunaUrl(job: Job) {
  const market = String(
    job.market || job.metadata?.market_country || "",
  ).toUpperCase();
  return adzunaDomains[market] ?? "https://www.adzuna.com";
}

function sourceAttribution(job: Job, locale: DashboardLocale) {
  if (job.source?.toLowerCase() === "adzuna")
    return { label: "Jobs by Adzuna", href: adzunaUrl(job) };
  if (job.source?.toLowerCase() === "remotive")
    return {
      label: "Remotive",
      href:
        typeof job.metadata?.source_url === "string"
          ? job.metadata.source_url
          : "https://remotive.com/remote-jobs",
    };
  if (job.metadata?.top_company === true) {
    const href =
      typeof job.metadata?.canonical_apply_url === "string"
        ? job.metadata.canonical_apply_url
        : typeof job.metadata?.source_url === "string"
          ? job.metadata.source_url
          : "";
    if (href)
      return {
        label: localized(
          locale,
          `Oferta oficial · ${job.company}`,
          `Official listing · ${job.company}`,
        ),
        href,
      };
  }
  return null;
}

const confettiPieces = Array.from({ length: 34 }, (_, index) => {
  const x = -46 + ((index * 29) % 93);
  const spin = 240 + ((index * 83) % 520);
  return {
    x: `${x}vw`,
    midX: `${Math.round(x * 0.42)}vw`,
    lift: `-${15 + ((index * 17) % 22)}vh`,
    spin: `${spin}deg`,
    midSpin: `${Math.round(spin * 0.45)}deg`,
    delay: `${(index % 7) * 0.018}s`,
    duration: `${1.05 + (index % 6) * 0.08}s`,
  };
});

function ConfettiBurst() {
  return (
    <div className="confetti-burst" aria-hidden="true">
      {confettiPieces.map((piece, index) => (
        <i
          key={index}
          style={
            {
              "--confetti-x": piece.x,
              "--confetti-mid-x": piece.midX,
              "--confetti-lift": piece.lift,
              "--confetti-spin": piece.spin,
              "--confetti-mid-spin": piece.midSpin,
              "--confetti-delay": piece.delay,
              "--confetti-duration": piece.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function ProductApp({
  view,
  demo = false,
}: {
  view: ProductView;
  demo?: boolean;
}) {
  const [locale, setLocale] = useState<DashboardLocale>("es");
  const [activeView, setActiveView] = useState<ProductView>(view);
  const [mobileNav, setMobileNav] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [pro, setPro] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(true);
  const identityPromise = useRef<Promise<IdentitySnapshot> | null>(null);
  const refreshIdentity = useCallback((source = "dashboard") => {
    if (demo) {
      setIdentityLoading(false);
      return Promise.resolve({ user: null, profile: null, pro: true, confirmed: true });
    }
    if (identityPromise.current) return identityPromise.current;
    setIdentityLoading(true);
    const run = async (): Promise<IdentitySnapshot> => {
      const load = async () => {
        const session = await getResilientSession();
        if (!session?.user) return { user: null, profile: null, pro: false, confirmed: true } satisfies IdentitySnapshot;
        const [nextProfile, nextPro] = await Promise.all([loadProfile(session.user), hasWebPro(session.user)]);
        return { user: session.user, profile: nextProfile, pro: nextPro, confirmed: true } satisfies IdentitySnapshot;
      };
      try {
        let snapshot: IdentitySnapshot;
        try {
          snapshot = await load();
        } catch {
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          snapshot = await load();
        }
        setUser(snapshot.user);
        setProfile(snapshot.profile);
        setPro(snapshot.pro);
        if (source === "after_stripe" && snapshot.user) {
          trackProductEvent("auth_session_recovered", { source });
        } else if (source === "after_stripe" && !snapshot.user) {
          trackProductEvent("auth_session_missing_after_stripe", { source });
        }
        return snapshot;
      } catch {
        trackProductEvent("auth_session_check_failed", { source });
        // Keep the last known identity. A temporary Supabase failure is not a
        // confirmed logout and must never send the user back to /login.
        return { user: null, profile: null, pro: false, confirmed: false };
      }
    };
    const pending = run().finally(() => {
      identityPromise.current = null;
      setIdentityLoading(false);
    });
    identityPromise.current = pending;
    return pending;
  }, [demo]);
  useEffect(() => {
    let stripeReturn = false;
    try {
      const raw = window.sessionStorage.getItem("landeo-stripe-return-pending") ?? window.localStorage.getItem("landeo-stripe-return-pending");
      const marker = raw ? JSON.parse(raw) as { at?: number } : null;
      stripeReturn = Boolean(marker?.at && Date.now() - marker.at < 2 * 60 * 60 * 1000);
    } catch { /* Optional recovery marker. */ }
    void refreshIdentity(stripeReturn ? "after_stripe" : "initial").then(snapshot=>{
      if(!stripeReturn||!snapshot.user)return;
      window.sessionStorage.removeItem("landeo-stripe-return-pending");
      window.localStorage.removeItem("landeo-stripe-return-pending");
    });
    if (demo) return;
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange(
      (event) => {
        if (event !== "INITIAL_SESSION") void refreshIdentity(`auth_${event.toLowerCase()}`);
      },
    );
    const refreshAfterExternalPage = (event: PageTransitionEvent) => {
      if (event.persisted) void refreshIdentity("page_restore");
    };
    window.addEventListener("pageshow", refreshAfterExternalPage);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("pageshow", refreshAfterExternalPage);
    };
  }, [refreshIdentity]);
  useEffect(() => {
    const stored = window.localStorage.getItem("landeo-locale");
    const nextLocale: DashboardLocale =
      stored === "en" || stored === "es"
        ? stored
        : navigator.language.toLowerCase().startsWith("es")
          ? "es"
          : "en";
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);
  useEffect(() => setActiveView(view), [view]);
  useEffect(() => {
    if (demo) return;
    trackProductEvent("dashboard_viewed", { view: activeView });
  }, [activeView, demo]);
  useEffect(() => {
    if (demo) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    trackProductEvent("stripe_checkout_returned", {
      plan: window.localStorage.getItem("landeo-selected-plan") || "unknown",
    });
    url.searchParams.delete("checkout");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [demo]);
  const [applicationTargetId, setApplicationTargetId] = useState<string | null>(null);
  useEffect(() => {
    setApplicationTargetId(new URLSearchParams(window.location.search).get("application"));
  }, []);
  useEffect(() => {
    const syncFromHistory = () => {
      const nextView = viewFromPath(window.location.pathname);
      if (nextView) setActiveView(nextView);
      setApplicationTargetId(new URLSearchParams(window.location.search).get("application"));
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  const navigateDashboard = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    nextView: ProductView,
    href: string,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;
    event.preventDefault();
    setMobileNav(false);
    if (nextView === activeView) return;
    window.history.pushState({ landeoDashboard: true }, "", href);
    setApplicationTargetId(null);
    setActiveView(nextView);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openApplication = (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    if (
      event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey
    ) return;
    event.preventDefault();
    const href = `/app/applications?application=${encodeURIComponent(id)}`;
    window.history.pushState({ landeoDashboard: true }, "", href);
    setApplicationTargetId(id);
    setActiveView("applications");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const clearApplicationTarget = () => {
    if (!applicationTargetId) return;
    window.history.replaceState({ landeoDashboard: true }, "", "/app/applications");
    setApplicationTargetId(null);
  };
  const changeLocale = (nextLocale: DashboardLocale) => {
    setLocale(nextLocale);
    window.localStorage.setItem("landeo-locale", nextLocale);
    document.documentElement.lang = nextLocale;
  };
  const t = dashboardCopy[locale];
  const readiness = demo
    ? { ready: true, percentage: 100, missing: [] }
    : profileReadiness(profile);
  const name = demo
    ? localized(locale, "Demo de marketing", "Marketing demo")
    : displayName(user, profile, locale);
  const initialsValue = initials(name) || "L";
  const currentView =
    activeView === "jobs" ? (
      <JobsView
        user={user}
        profile={profile}
        pro={pro || demo}
        locale={locale}
        demo={demo}
        tourReady={!identityLoading}
        identityLoading={identityLoading}
        ensureIdentity={refreshIdentity}
      />
    ) : activeView === "auto-apply" ? (
      <AutoApplyView user={user} profile={profile} pro={pro} locale={locale} />
    ) : activeView === "applications" ? (
      <ApplicationsView user={user} locale={locale} targetId={applicationTargetId} onSelectApplication={clearApplicationTarget} />
    ) : activeView === "cover-letter" ? (
      <CoverLetterView
        user={user}
        profile={profile}
        locale={locale}
        onSaved={refreshIdentity}
      />
    ) : activeView === "saved" ? (
      <SavedView user={user} locale={locale} />
    ) : activeView === "notifications" ? (
      <NotificationsView user={user} locale={locale} onOpenApplication={openApplication} />
    ) : activeView === "universal" ? (
      <UniversalProfile
        user={user}
        profile={profile}
        locale={locale}
        onSaved={refreshIdentity}
      />
    ) : (
      <ProfileView user={user} profile={profile} pro={pro} locale={locale} />
    );
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className={`app-frame ${demo ? "marketing-demo" : ""}`}>
          <m.aside
            className={`app-sidebar ${mobileNav ? "open" : ""}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sidebar-brand">
              <Brand />
              <button
                aria-label={t.chrome.closeMenu}
                onClick={() => setMobileNav(false)}
              >
                ×
              </button>
            </div>
            <m.div
              className="profile-mini"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <m.span whileHover={{ scale: 1.06 }}>{initialsValue}</m.span>
              <div>
                <strong>{identityLoading ? t.chrome.connecting : name}</strong>
                <small>
                  {user || demo
                    ? `${t.chrome.profileAt} ${readiness.percentage}%`
                    : t.chrome.profileRequired}
                </small>
              </div>
              {(pro || demo) && <b>Pro</b>}
            </m.div>
            <nav aria-label={t.chrome.navigation}>
              {nav.map((item, position) => (
                <Link
                  key={item.id}
                  href={demo ? "/demo/marketing" : item.href}
                  data-no-transition="true"
                  onClick={(event) => {
                    if (!demo) navigateDashboard(event, item.id, item.href);
                  }}
                  className={activeView === item.id ? "active" : ""}
                  data-tour={item.id === "applications" ? "applications-nav" : undefined}
                >
                  {activeView === item.id && (
                    <m.span
                      className="sidebar-active-glow"
                      initial={{ opacity: 0, scaleX: 0.7 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: position * 0.015 }}
                    />
                  )}
                  <i>{item.icon}</i>
                  <span>{t.nav[item.labelKey]}</span>
                </Link>
              ))}
            </nav>
            <m.div
              className="profile-progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
            >
              <div>
                <strong>{t.chrome.universalProfile}</strong>
                <span>{readiness.percentage}%</span>
              </div>
              <div
                className="dashboard-profile-progress"
                role="progressbar"
                aria-label={t.chrome.universalProfile}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readiness.percentage}
              >
                <m.i
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: readiness.percentage / 100 }}
                  transition={{ type: "spring", stiffness: 150, damping: 24 }}
                />
              </div>
              <p>
                {readiness.ready
                  ? t.chrome.ready
                  : `${readiness.missing.length} ${t.chrome.completeRequirements}`}
              </p>
              <Link
                href={demo ? "/demo/marketing" : "/app/profile/universal"}
                data-no-transition="true"
                onClick={(event) => {
                  if (!demo)
                    navigateDashboard(event, "universal", "/app/profile/universal");
                }}
              >
                {readiness.ready
                  ? t.chrome.reviewProfile
                  : t.chrome.completeProfile}{" "}
                →
              </Link>
            </m.div>
            <div className="sidebar-foot">
              <div
                className="lang-toggle"
                role="group"
                aria-label={t.chrome.language}
              >
                <button
                  type="button"
                  className={locale === "es" ? "active" : ""}
                  onClick={() => changeLocale("es")}
                  aria-pressed={locale === "es"}
                >
                  ES
                </button>
                <button
                  type="button"
                  className={locale === "en" ? "active" : ""}
                  onClick={() => changeLocale("en")}
                  aria-pressed={locale === "en"}
                >
                  EN
                </button>
              </div>
              <span className="secure-note">{t.chrome.secure}</span>
            </div>
          </m.aside>
          <div className="app-main">
            <header className="app-mobile-header">
              <m.button
                aria-label={t.chrome.openMenu}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileNav(true)}
              >
                ☰
              </m.button>
              <Brand compact />
              <m.span
                className="avatar"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {initialsValue}
              </m.span>
            </header>
            <AnimatePresence mode="sync" initial={false}>
              <m.div
                key={activeView}
                className="dashboard-view-motion"
                variants={dashboardViewMotion}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {currentView}
              </m.div>
            </AnimatePresence>
          </div>
          <nav
            className="mobile-bottom-nav"
            aria-label={t.chrome.mobileNavigation}
          >
            {mobileNavItems.map((item) => (
              <Link
                key={item.id}
                href={demo ? "/demo/marketing" : item.href}
                data-no-transition="true"
                onClick={(event) => {
                  if (!demo) navigateDashboard(event, item.id, item.href);
                }}
                data-tour={item.id === "applications" ? "applications-nav" : undefined}
                className={
                  activeView === item.id ||
                  (activeView === "universal" && item.id === "profile")
                    ? "active"
                    : ""
                }
              >
                <m.i
                  animate={
                    activeView === item.id ||
                    (activeView === "universal" && item.id === "profile")
                      ? { y: -2, scale: 1.1 }
                      : { y: 0, scale: 1 }
                  }
                >
                  {item.icon}
                </m.i>
                <span>
                  {item.id === "applications"
                    ? t.nav.processes
                    : item.id === "cover-letter"
                      ? t.nav.coverLetter
                      : t.nav[item.labelKey]}
                </span>
              </Link>
            ))}
          </nav>
          {user && !demo && <SupportChat key={user.id} locale={locale} />}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

function JobsView({
  user,
  profile,
  pro,
  locale,
  demo,
  tourReady,
  identityLoading,
  ensureIdentity,
}: {
  user: User | null;
  profile: CandidateProfile | null;
  pro: boolean;
  locale: DashboardLocale;
  demo: boolean;
  tourReady: boolean;
  identityLoading: boolean;
  ensureIdentity: (source?: string) => Promise<IdentitySnapshot>;
}) {
  const t = dashboardCopy[locale];
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [workMode, setWorkMode] = useState("all");
  const [market, setMarket] = useState("all");
  const [careerLevel, setCareerLevel] = useState<EarlyCareerFilter>("all");
  const [industry, setIndustry] = useState<IndustryFilter>("all");
  const [showAutomaticArchive, setShowAutomaticArchive] = useState(false);
  const [notice, setNotice] = useState("");
  const [paywall, setPaywall] = useState<PaywallContext | null>(null);
  const [applicationFlow, setApplicationFlow] = useState<ApplicationFlowState | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => new Set());
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [cardDirection, setCardDirection] = useState(1);
  const dragStart = useRef<number | null>(null);
  const pendingApplications = useRef(new Set<string>());
  const didSwipe = useRef(false);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4_500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [query]);
  const refresh = useCallback(async () => {
    setLoading(true);
    if (demo) {
      setJobs([...marketingDemoJobs]);
      setIndex(0);
      setLoading(false);
      return;
    }
    try {
      setJobs(
        await loadJobs(120, {
          includeDismissed: showAutomaticArchive,
          includeWorldwide: true,
          search: debouncedQuery,
          careerLevel: careerLevel === "all" ? undefined : careerLevel,
        }),
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.loadError);
    } finally {
      setLoading(false);
    }
  }, [careerLevel, debouncedQuery, demo, showAutomaticArchive, t.notices.loadError]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const filtered = useMemo(
    () =>
      jobs.filter(
        (job) =>
          (mode === "all" || job.applyCapability === mode) &&
          (workMode === "all" || job.workMode === workMode) &&
          (market === "all" ||
            String(
              job.market || job.metadata?.market_country || "",
            ).toUpperCase() === market) &&
          (careerLevel === "all" || jobCareerLevel(job) === careerLevel) &&
          matchesIndustry(job, industry) &&
          matchesJobQuery(job, query),
      ),
    [jobs, mode, workMode, market, careerLevel, industry, query],
  );
  const markets = useMemo(
    () =>
      Array.from(
        new Set(
          jobs
            .map((item) =>
              String(
                item.market || item.metadata?.market_country || "",
              ).toUpperCase(),
            )
            .filter(Boolean),
        ),
      ).sort(),
    [jobs],
  );
  const job = filtered[index % Math.max(filtered.length, 1)];
  const matchReasons = job && Array.isArray(job.metadata?.match_reason_keys)
    ? job.metadata.match_reason_keys.filter((key): key is string => typeof key === "string").slice(0, 3)
    : ["profile"];
  const attribution = job ? sourceAttribution(job, locale) : null;
  const removeCurrent = useCallback(
    (direction: -1 | 1) => {
      if (!job) return;
      setCardDirection(direction);
      setJobs((current) => {
        const remaining=current.filter((item) => item.id !== job.id);
        // Refill shortly before the current page runs out. Already handled
        // jobs are excluded in Supabase, so this reveals the next catalogue
        // page without downloading the complete database up front.
        if(!demo&&remaining.length<=5)window.setTimeout(refresh,0);
        return remaining;
      });
      setIndex(0);
    },
    [job,demo,refresh],
  );
  const triggerConfetti = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setConfettiBurst((value) => value + 1);
  }, []);
  const verifiedIdentity = useCallback(async (source: string) => {
    if (user) return { user, profile, pro, confirmed: true } satisfies IdentitySnapshot;
    if (identityLoading) setNotice(localized(locale, "Comprobando tu sesión…", "Checking your session…"));
    const snapshot = await ensureIdentity(source);
    if (!snapshot.confirmed) {
      setNotice(localized(locale, "No pudimos comprobar tu sesión todavía. Espera un momento y vuelve a intentarlo.", "We couldn’t verify your session yet. Wait a moment and try again."));
      return null;
    }
    if (!snapshot.user) {
      trackProductEvent("application_login_required", { source });
      router.push(`/login?next=/app/jobs`);
      return null;
    }
    return snapshot;
  }, [ensureIdentity, identityLoading, locale, pro, profile, router, user]);
  const pass = useCallback(async () => {
    if (!job) return;
    if (demo) {
      removeCurrent(-1);
      return;
    }
    if (!await verifiedIdentity("job_pass")) return;
    try {
      await recordSwipe(job.id, "left");
      removeCurrent(-1);
      setNotice(t.notices.discarded);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.swipeError);
    }
  }, [job, demo, removeCurrent, t.notices, verifiedIdentity]);
  const save = useCallback(async () => {
    if (!job) return;
    if (demo) {
      setSavedJobIds((current) => new Set(current).add(job.id));
      return;
    }
    if (!await verifiedIdentity("job_save")) return;
    try {
      await recordSwipe(job.id, "save");
      setSavedJobIds((current) => new Set(current).add(job.id));
      setNotice(t.notices.saved);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.saveError);
    }
  }, [job, demo, t.notices, verifiedIdentity]);
  const finishApplication = useCallback(async (targetJob: Job, letter = "") => {
    const jobId = targetJob.id;
    if (pendingApplications.current.has(jobId)) return;
    pendingApplications.current.add(jobId);
    setApplicationFlow((current) => current ? { ...current, phase: "submitting", error: undefined } : {
      job: targetJob,
      phase: "submitting",
      letter,
    });
    setNotice("");
    trackProductEvent("application_submission_started",{capability:targetJob.applyCapability,with_letter:Boolean(letter)});
    try {
      const result = await submitApplication(jobId, letter ? {
        generatedCoverLetter: letter,
        coverLetterReviewed: true,
      } : {});
      const application = (await loadApplications()).find((item) => item.jobId === jobId);
      triggerConfetti();
      removeCurrent(1);
      setApplicationFlow((current) => ({
        job: targetJob,
        phase: "result",
        letter: application?.coverLetter || current?.letter || letter,
        outcome: result,
        usageStatus: application?.coverLetterUsageStatus ?? null,
      }));
      trackProductEvent("application_submission_finished",{status:result.status,capability:targetJob.applyCapability});
    } catch (error) {
      const message = error instanceof Error ? error.message : t.notices.applyError;
      if (/Pro|suscripci|pago/i.test(message)) {
        setApplicationFlow(null);
        setPaywall({source:"application_error",capability:targetJob.applyCapability});
      } else {
        setApplicationFlow((current) => current ? { ...current, phase: "error", error: message } : {
          job: targetJob,
          phase: "error",
          letter,
          error: message,
        });
      }
      trackProductEvent("application_submission_failed",{reason:/Pro|suscripci|pago/i.test(message)?"subscription":"submission",capability:targetJob.applyCapability});
      refresh();
    } finally {
      pendingApplications.current.delete(jobId);
    }
  }, [refresh, removeCurrent, t.notices.applyError, triggerConfetti]);
  const apply = useCallback(async () => {
    if (!job) return;
    if (demo) {
      triggerConfetti();
      removeCurrent(1);
      return;
    }
    const identity = await verifiedIdentity("job_apply");
    if (!identity) return;
    if (!identity.pro) {
      setPaywall({source:"apply",capability:job.applyCapability});
      return;
    }
    const activeProfile = identity.profile;
    const readiness = profileReadiness(activeProfile);
    if (!readiness.ready) {
      trackProductEvent("application_profile_incomplete",{missing_count:readiness.missing.length});
      setNotice(
        `${t.notices.completeProfile}: ${readiness.missing.join(", ")}.`,
      );
      router.push("/app/profile/universal");
      return;
    }
    const letterReady = coverLetterReadiness(activeProfile).ready;
    if (!letterReady) {
      setApplicationFlow({ job, phase: "no_letter", letter: "" });
      return;
    }
    if (activeProfile?.universal?.coverLetter?.reviewBeforeSending === false) {
      await finishApplication(job);
      return;
    }
    setApplicationFlow({ job, phase: "preparing", letter: "" });
    try {
      const preview = await prepareCoverLetter(job.id);
      setApplicationFlow({ job, phase: "review", letter: preview.coverLetter });
    } catch (error) {
      setApplicationFlow({
        job,
        phase: "error",
        letter: "",
        error: error instanceof Error ? error.message : localized(locale, "No pudimos generar la carta.", "We couldn’t generate the cover letter."),
      });
    }
  }, [
    job,
    demo,
    locale,
    router,
    removeCurrent,
    triggerConfetti,
    finishApplication,
    t.notices.completeProfile,
    verifiedIdentity,
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector(".dashboard-tour-layer")) return;
      if (
        (event.target as HTMLElement).matches("input,select,textarea,button,a")
      )
        return;
      if (event.key === "ArrowLeft") pass();
      if (event.key === "ArrowRight" || event.key === "Enter") apply();
      if (event.key.toLowerCase() === "s") save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pass, apply, save]);
  return (
    <>
      {demo && (
        <div className="marketing-demo-banner" role="status">
          <b>DEMO</b>
          <span>
            {localized(
              locale,
              "Datos ficticios · ninguna candidatura se enviará",
              "Fictional data · no applications will be sent",
            )}
          </span>
        </div>
      )}
      <header className="view-header">
        <div>
          <span className="overline">{t.jobs.eyebrow}</span>
          <h1>{t.jobs.title}</h1>
          <p>{t.jobs.subtitle}</p>
        </div>
        <div className="header-actions">
          <m.button
            className="saas-icon-button"
            aria-label={t.jobs.refresh}
            aria-busy={loading}
            disabled={loading}
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { duration: 0.75, repeat: Infinity, ease: "linear" } : { duration: 0.16 }}
            whileHover={loading ? undefined : { y: -1, scale: 1.03 }}
            whileTap={loading ? undefined : { scale: 0.94 }}
            onClick={refresh}
          >
            ↻
          </m.button>
          <span className="avatar">
            {demo ? "LD" : initials(displayName(user, profile, locale))}
          </span>
        </div>
      </header>
      <div className="jobs-layout">
        <m.aside
          className="filters-panel"
          data-tour="filters"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="filter-title">
            <strong>{t.jobs.filters}</strong>
            <button
              onClick={() => {
                setMode("all");
                setWorkMode("all");
                setMarket("all");
                setCareerLevel("all");
                setIndustry("all");
                setQuery("");
                setShowAutomaticArchive(false);
              }}
            >
              {t.jobs.clear}
            </button>
          </div>
          <label className="search-field">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.jobs.search}
            />
          </label>
          <label>
            {t.jobs.market}
            <select
              value={market}
              onChange={(event) => {
                setMarket(event.target.value);
                setIndex(0);
              }}
            >
              <option value="all">
                {localized(locale, "Todos los mercados", "All markets")}
              </option>
              {markets.map((value) => (
                <option key={value} value={value}>
                  {value === "ES"
                    ? t.jobs.spain
                    : value === "US"
                      ? t.jobs.us
                      : value === "GB"
                        ? t.jobs.uk
                        : value}
                </option>
              ))}
            </select>
          </label>
          <label>
            {localized(locale, "Sector", "Industry")}
            <select
              value={industry}
              onChange={(event) => {
                setIndustry(event.target.value as IndustryFilter);
                setIndex(0);
              }}
            >
              <option value="all">
                {localized(locale, "Todos los sectores", "All industries")}
              </option>
              <option value="pharmaceuticals">
                {localized(locale, "Farmacéutica y farmacia", "Pharmaceuticals & pharmacy")}
              </option>
            </select>
          </label>
          <fieldset className="career-level-filter">
            <legend>{localized(locale, "Nivel de experiencia", "Experience level")}</legend>
            {[
              ["all", localized(locale, "Todos los niveles", "All levels")],
              ["internship", localized(locale, "Prácticas", "Internships")],
              ["junior", localized(locale, "Junior / Primer empleo", "Junior / Entry-level")],
            ].map(([value, label]) => (
              <m.label key={value} className="radio-row" whileHover={{ x: 2 }} whileTap={{ scale: 0.985 }}>
                <input
                  type="radio"
                  checked={careerLevel === value}
                  onChange={() => {
                    setCareerLevel(value as EarlyCareerFilter);
                    setIndex(0);
                  }}
                />
                <span>{label}</span>
              </m.label>
            ))}
          </fieldset>
          <fieldset className="work-mode-filter">
            <legend>{t.jobs.workMode}</legend>
            {[
              ["all", t.jobs.all],
              ["remote", t.jobs.remote],
              ["hybrid", t.jobs.hybrid],
              ["onsite", t.jobs.onsite],
            ].map(([value, label]) => (
              <m.label
                key={value}
                className="radio-row"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.985 }}
              >
                <input
                  type="radio"
                  checked={workMode === value}
                  onChange={() => setWorkMode(value)}
                />
                <span>{label}</span>
              </m.label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t.jobs.applicationType}</legend>
            {[
              ["all", t.jobs.all],
              ["automatic", t.jobs.automatic],
              ["assisted", t.jobs.assisted],
              ["external", t.jobs.external],
            ].map(([value, label]) => (
              <m.label
                key={value}
                className="radio-row"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.985 }}
              >
                <input
                  type="radio"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>{label}</span>
              </m.label>
            ))}
          </fieldset>
          <div className="filter-note">
            <b>i</b>
            <p>
              <strong>{t.jobs.responsible}</strong>
              {t.jobs.responsibleDetail}
            </p>
          </div>
        </m.aside>
        <section className="deck-panel">
          <div className="deck-count">
            <span>
              {loading
                ? t.jobs.loading
                : filtered.length
                  ? `${index + 1} / ${filtered.length}`
                  : `0 ${t.jobs.offers}`}
            </span>
            <div>
              {filtered.slice(0, 8).map((_, itemIndex) => (
                <m.i
                  key={itemIndex}
                  className={itemIndex === index ? "active" : ""}
                  animate={{
                    scale: itemIndex === index ? 1.35 : 1,
                    opacity: itemIndex === index ? 1 : 0.48,
                  }}
                />
              ))}
            </div>
          </div>
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={cardDirection}
          >
            {loading ? (
              <m.div
                key="loading"
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span>↻</span>
                <h2>{t.jobs.loadingTitle}</h2>
                <p>{t.jobs.loadingDetail}</p>
              </m.div>
            ) : job ? (
              <m.div
                key={job.id}
                className="feed-card"
                data-tour="job-card"
                custom={cardDirection}
                variants={jobCardMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, scale: 1.003 }}
                role="link"
                tabIndex={0}
                aria-label={`${localized(locale, "Ver detalles de", "View details for")} ${job.title} · ${job.company}`}
                onClick={() => {
                  if (didSwipe.current) {
                    didSwipe.current = false;
                    return;
                  }
                  router.push(`/app/jobs/${job.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") pass();
                  if (event.key === "ArrowRight") apply();
                  if (event.key === "Enter") router.push(`/app/jobs/${job.id}`);
                }}
                onPointerDown={(event) => {
                  didSwipe.current = false;
                  dragStart.current = event.clientX;
                }}
                onPointerUp={(event) => {
                  if (dragStart.current === null) return;
                  const distance = event.clientX - dragStart.current;
                  if (Math.abs(distance) > 80) didSwipe.current = true;
                  if (distance > 80) apply();
                  if (distance < -80) pass();
                  dragStart.current = null;
                }}
              >
                <div className="feed-top">
                  <span
                    className={`company-initials ${typeof job.metadata?.company_logo === "string" ? "has-logo" : ""}`}
                  >
                    {typeof job.metadata?.company_logo === "string" ? (
                      <img src={job.metadata.company_logo} alt="" />
                    ) : (
                      initials(job.company)
                    )}
                  </span>
                  <div>
                    <strong>{job.company}</strong>
                    <small>{job.industry}</small>
                  </div>
                  <button
                    aria-label={t.jobs.saveOffer}
                    className={savedJobIds.has(job.id) ? "is-saved" : ""}
                    aria-pressed={savedJobIds.has(job.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      save();
                    }}
                  >
                    {savedJobIds.has(job.id) ? "♥" : "♡"}
                  </button>
                </div>
                <div className="feed-badges">
                  <span className="fresh-badge">
                    {job.source ?? t.jobs.offer}
                  </span>
                  <span className={`mode-badge ${job.workMode}`}>
                    {job.workMode === "remote"
                      ? t.jobs.remote
                      : job.workMode === "hybrid"
                        ? t.jobs.hybrid
                        : t.jobs.onsite}
                  </span>
                  <span className="personal-match-badge">
                    <strong>{job.match}%</strong> {t.jobs.match}
                  </span>
                </div>
                <h2>{job.title}</h2>
                <p>{job.summary}</p>
                <div className="job-meta">
                  <span>⌖ {job.location}</span>
                  <span>
                    ◫{" "}
                    {job.workMode === "remote"
                      ? t.jobs.remote
                      : job.workMode === "hybrid"
                        ? t.jobs.hybrid
                        : t.jobs.onsite}
                  </span>
                  <span>
                    ◷{" "}
                    {new Intl.DateTimeFormat(locale, {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(job.publishedAt))}
                  </span>
                </div>
                <div className="salary-block">
                  <span>€</span>
                  <div>
                    <small>{t.jobs.salary}</small>
                    <strong>{money(job, locale)}</strong>
                  </div>
                </div>
                <div className="skill-row">
                  {job.skills.length ? (
                    job.skills.map((skill) => <span key={skill}>{skill}</span>)
                  ) : (
                    <span>{job.seniority}</span>
                  )}
                </div>
                <div
                  className={`capability ${job.applyCapability}`}
                  data-tour="application-channel"
                >
                  <b>{capabilityIcon[job.applyCapability]}</b>
                  <div>
                    <strong>{t.capability[job.applyCapability].label}</strong>
                    <small>{t.capability[job.applyCapability].detail}</small>
                  </div>
                </div>
                <span className="job-details-cta">
                  {localized(locale, "Ver oferta completa", "View full job")} <b>→</b>
                </span>
              </m.div>
            ) : (
              <m.div
                key="empty"
                className="empty-state"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <m.span
                  initial={{ scale: 0.4, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 15 }}
                >
                  ✓
                </m.span>
                <h2>
                  {mode === "automatic"
                    ? showAutomaticArchive
                      ? t.jobs.automaticArchiveEmpty
                      : t.jobs.automaticEmpty
                    : t.jobs.upToDate}
                </h2>
                <p>
                  {mode === "automatic"
                    ? showAutomaticArchive
                      ? t.jobs.automaticArchiveEmptyDetail
                      : t.jobs.automaticEmptyDetail
                    : t.jobs.upToDateDetail}
                </p>
                {mode === "automatic" && (
                  <div className="automatic-empty-actions">
                    {!showAutomaticArchive && (
                      <m.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setQuery("");
                          setWorkMode("all");
                          setMarket("all");
                          setIndex(0);
                          setShowAutomaticArchive(true);
                        }}
                      >
                        {t.jobs.automaticEverywhere} →
                      </m.button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("all");
                        setIndex(0);
                      }}
                    >
                      {t.jobs.viewAllJobs}
                    </button>
                  </div>
                )}
                {mode !== "automatic" && (
                  <div className="automatic-empty-actions">
                    {!showAutomaticArchive && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAutomaticArchive(true);
                          setIndex(0);
                        }}
                      >
                        {localized(locale, "Mostrar ofertas descartadas", "Show dismissed jobs")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setWorkMode("all");
                        setMarket("all");
                        setCareerLevel("all");
                        setIndustry("all");
                        setIndex(0);
                        refresh();
                      }}
                    >
                      {localized(locale, "Ampliar y actualizar búsqueda", "Broaden and refresh search")} →
                    </button>
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {notice && (
              <m.div
                className="toast"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
              >
                {notice}
                <button onClick={() => setNotice("")}>×</button>
              </m.div>
            )}
          </AnimatePresence>
          <div className="deck-actions">
            <m.button
              className="action-pass"
              data-tour="pass-action"
              variants={actionButtonMotion}
              initial="rest"
              animate="rest"
              whileHover={job ? "hover" : "rest"}
              whileTap={job ? "tap" : "rest"}
              whileFocus={job ? "hover" : "rest"}
              onClick={pass}
              disabled={!job}
            >
              <m.b variants={passIconMotion}>×</m.b>
              <m.span variants={actionLabelMotion}>
                {t.jobs.pass}
                <small>←</small>
              </m.span>
            </m.button>
            <m.button
              className={`action-save ${job && savedJobIds.has(job.id) ? "is-saved" : ""}`}
              data-tour="save-action"
              variants={actionButtonMotion}
              initial="rest"
              animate="rest"
              whileHover={job ? "hover" : "rest"}
              whileTap={job ? "tap" : "rest"}
              whileFocus={job ? "hover" : "rest"}
              onClick={save}
              disabled={!job}
              aria-pressed={Boolean(job && savedJobIds.has(job.id))}
            >
              <m.b variants={saveIconMotion}>{job && savedJobIds.has(job.id) ? "♥" : "♡"}</m.b>
              <m.span variants={actionLabelMotion}>
                {t.jobs.save}
                <small>S</small>
              </m.span>
            </m.button>
            <m.button
              className="action-apply"
              data-tour="apply-action"
              variants={actionButtonMotion}
              initial="rest"
              animate="rest"
              whileHover={job ? "hover" : "rest"}
              whileTap={job ? "tap" : "rest"}
              whileFocus={job ? "hover" : "rest"}
              onClick={apply}
              disabled={!job}
            >
              <m.b variants={applyIconMotion}>→</m.b>
              <m.span variants={actionLabelMotion}>
                {t.jobs.apply}
                <small>ENTER</small>
              </m.span>
            </m.button>
          </div>
        </section>
        <AnimatePresence mode="popLayout" initial={false}>
          {job && (
            <m.aside
              key={job.id}
              className="detail-panel"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.23 }}
            >
              <div className="detail-match">
                <div>
                  <strong>{job.match}%</strong>
                  <span>{t.jobs.match}</span>
                </div>
                <small>{t.jobs.relevance}</small>
              </div>
              <div className="match-reasons">
                <strong>{t.jobs.relevance}</strong>
                {matchReasons.map((reason) => (
                  <p key={reason}>
                    <i>✓</i>
                    {matchReasonCopy[locale][reason] ?? matchReasonCopy[locale].profile}
                  </p>
                ))}
              </div>
              <hr />
              <h3>{t.jobs.about}</h3>
              <p>{job.description}</p>
              <h3>{t.jobs.information}</h3>
              <ul>
                <li>{job.contractType}</li>
                <li>{job.seniority}</li>
                <li>{job.applyProvider}</li>
              </ul>
              <div className="detail-bottom">
                <Link href={`/app/jobs/${job.id}`}>{t.jobs.fullDetails} →</Link>
                <small>
                  {t.jobs.source}:{" "}
                  {attribution ? (
                    <a href={attribution.href} target="_blank" rel="noreferrer">
                      {attribution.label}
                    </a>
                  ) : (
                    job.source
                  )}
                </small>
              </div>
            </m.aside>
          )}
        </AnimatePresence>
      </div>
      <DashboardTour
        locale={locale}
        enabled={!demo && Boolean(user?.id) && tourReady && !loading && Boolean(job)}
        identityKey={user?.id ?? "guest"}
      />
      {confettiBurst > 0 && <ConfettiBurst key={confettiBurst} />}{" "}
      <AnimatePresence>
        {paywall && (
          <Paywall locale={locale} context={paywall} onClose={() => setPaywall(null)} />
        )}
      </AnimatePresence>{" "}
      <AnimatePresence>
        {applicationFlow && (
          <ApplicationFlowModal
            locale={locale}
            flow={applicationFlow}
            onClose={() => setApplicationFlow(null)}
            onLetterChange={(letter) => setApplicationFlow((current) => current ? { ...current, letter } : current)}
            onSubmit={() => finishApplication(applicationFlow.job, applicationFlow.letter)}
            onContinueWithoutLetter={() => finishApplication(applicationFlow.job)}
            onRegenerate={async () => {
              const targetJob = applicationFlow.job;
              setApplicationFlow({ job: targetJob, phase: "preparing", letter: "" });
              try {
                const preview = await prepareCoverLetter(targetJob.id);
                setApplicationFlow({ job: targetJob, phase: "review", letter: preview.coverLetter });
              } catch (error) {
                setApplicationFlow({
                  job: targetJob,
                  phase: "error",
                  letter: "",
                  error: error instanceof Error ? error.message : localized(locale, "No pudimos generar la carta.", "We couldn’t generate the cover letter."),
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function coverLetterUsageCopy(locale: DashboardLocale, value?: string | null) {
  const copies: Record<string, [string, string]> = {
    included_in_email: ["Incluida en el email enviado", "Included in the sent email"],
    included_in_form: ["Incluida en el formulario enviado", "Included in the submitted form"],
    queued_for_automation: ["Preparada para el envío automático", "Ready for automatic submission"],
    generated_not_required: ["Generada; el portal no solicitó carta", "Generated; the portal did not request it"],
    generated_not_sent: ["Generada, pendiente de envío", "Generated, awaiting submission"],
  };
  const pair = copies[value ?? ""] ?? copies.generated_not_sent;
  return locale === "es" ? pair[0] : pair[1];
}

function ApplicationFlowModal({
  locale,
  flow,
  onClose,
  onLetterChange,
  onSubmit,
  onContinueWithoutLetter,
  onRegenerate,
}: {
  locale: DashboardLocale;
  flow: ApplicationFlowState;
  onClose: () => void;
  onLetterChange: (letter: string) => void;
  onSubmit: () => void;
  onContinueWithoutLetter: () => void;
  onRegenerate: () => void;
}) {
  const busy = flow.phase === "preparing" || flow.phase === "submitting";
  return (
    <m.div className="modal-backdrop application-flow-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="modal-scrim" aria-label={localized(locale, "Cerrar", "Close")} onClick={() => !busy && onClose()} />
      <m.section className="application-flow-modal" role="dialog" aria-modal="true" aria-labelledby="application-flow-title" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        {!busy && <button className="modal-close" onClick={onClose} aria-label={localized(locale, "Cerrar", "Close")}>×</button>}
        <div className="application-flow-job">
          <span>{flow.job.company.slice(0, 1)}</span>
          <div><small>{flow.job.company}</small><strong>{flow.job.title}</strong></div>
        </div>
        {(flow.phase === "preparing" || flow.phase === "submitting") && <div className="application-flow-progress">
          <m.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>✦</m.span>
          <p className="overline">{localized(locale, "PREPARANDO TU CANDIDATURA", "PREPARING YOUR APPLICATION")}</p>
          <h2 id="application-flow-title">{flow.phase === "preparing" ? localized(locale, "Generando una carta para esta oferta…", "Generating a letter for this role…") : localized(locale, "Enviando tu candidatura de forma segura…", "Submitting your application securely…")}</h2>
          <ol>
            <li className="done">✓ {localized(locale, "Oferta y perfil analizados", "Job and profile analyzed")}</li>
            <li className={flow.phase === "submitting" ? "done" : "active"}>{flow.phase === "submitting" ? "✓" : "●"} {localized(locale, "Carta personalizada", "Personalized cover letter")}</li>
            <li className={flow.phase === "submitting" ? "active" : ""}>● {localized(locale, "Comprobación del canal y envío", "Channel check and submission")}</li>
          </ol>
        </div>}
        {flow.phase === "review" && <div className="application-flow-review">
          <p className="overline">{localized(locale, "CARTA PERSONALIZADA LISTA", "PERSONALIZED LETTER READY")}</p>
          <h2 id="application-flow-title">{localized(locale, "Revísala antes de enviarla.", "Review it before sending.")}</h2>
          <p>{localized(locale, "Puedes corregir cualquier frase. Solo se enviará el texto que ves aquí.", "You can edit any sentence. Only the text shown here will be submitted.")}</p>
          <textarea value={flow.letter} onChange={(event) => onLetterChange(event.target.value)} maxLength={5000} rows={13} aria-label={localized(locale, "Carta de presentación", "Cover letter")} />
          <div className="application-flow-meta"><span>✦ {localized(locale, "Generada para esta oferta", "Generated for this role")}</span><span>{flow.letter.length} / 5000</span></div>
          <div className="application-flow-actions"><button className="button button-ghost" type="button" onClick={onRegenerate}>{localized(locale, "Regenerar", "Regenerate")}</button><button className="button button-primary" type="button" disabled={!flow.letter.trim()} onClick={onSubmit}>{localized(locale, "Aplicar con esta carta →", "Apply with this letter →")}</button></div>
        </div>}
        {flow.phase === "no_letter" && <div className="application-flow-empty">
          <span className="application-flow-symbol">✦</span>
          <p className="overline">{localized(locale, "CARTA CON IA NO CONFIGURADA", "AI COVER LETTER NOT SET UP")}</p>
          <h2 id="application-flow-title">{localized(locale, "Esta candidatura se enviará sin carta.", "This application will be submitted without a letter.")}</h2>
          <p>{localized(locale, "Completa cuatro respuestas una sola vez para que Landeo adapte una carta a cada empleo.", "Answer four questions once and Landeo will tailor a letter to each job.")}</p>
          <div className="application-flow-actions"><Link className="button button-ghost" href="/app/cover-letter" onClick={onClose}>{localized(locale, "Configurar carta", "Set up cover letter")}</Link><button className="button button-primary" type="button" onClick={onContinueWithoutLetter}>{localized(locale, "Continuar sin carta", "Continue without a letter")}</button></div>
        </div>}
        {flow.phase === "result" && flow.outcome && <div className="application-flow-result">
          <span className={`application-flow-symbol ${flow.outcome.status}`}>{flow.outcome.status === "sent" ? "✓" : "↗"}</span>
          <p className="overline">{localized(locale, "RESULTADO VERIFICADO", "VERIFIED RESULT")}</p>
          <h2 id="application-flow-title">{flow.outcome.status === "sent" ? localized(locale, "Candidatura enviada.", "Application submitted.") : flow.outcome.status === "queued" ? localized(locale, "Candidatura en proceso.", "Application in progress.") : localized(locale, "Falta un último paso.", "One final step is required.")}</h2>
          <p>{flow.outcome.message}</p>
          <div className="application-flow-statuses">
            <span className={flow.letter ? "done" : "muted"}><b>{flow.letter ? "✓" : "—"}</b><small>{localized(locale, "Carta", "Letter")}</small><strong>{flow.letter ? localized(locale, "Generada", "Generated") : localized(locale, "No utilizada", "Not used")}</strong></span>
            <span className={flow.usageStatus?.startsWith("included") ? "done" : "pending"}><b>{flow.usageStatus?.startsWith("included") ? "✓" : "↗"}</b><small>{localized(locale, "Uso", "Usage")}</small><strong>{flow.letter ? coverLetterUsageCopy(locale, flow.usageStatus) : localized(locale, "Sin carta", "No letter")}</strong></span>
            <span className={flow.outcome.status === "sent" ? "done" : "pending"}><b>{flow.outcome.status === "sent" ? "✓" : "●"}</b><small>{localized(locale, "Entrega", "Delivery")}</small><strong>{flow.outcome.status === "sent" ? localized(locale, "Confirmada", "Confirmed") : localized(locale, "Pendiente", "Pending")}</strong></span>
          </div>
          {flow.letter && <details className="application-flow-letter"><summary>{localized(locale, "Leer la carta generada", "Read generated letter")} <span>⌄</span></summary><p>{flow.letter}</p></details>}
          <div className="application-flow-actions">{flow.outcome.actionUrl && <a className="button button-primary" href={flow.outcome.actionUrl} target="_blank" rel="noreferrer">{localized(locale, "Completar en la web oficial →", "Complete on official site →")}</a>}<Link className="button button-ghost" href="/app/applications" onClick={onClose}>{localized(locale, "Ver candidaturas", "View applications")}</Link><button className="button button-primary" type="button" onClick={onClose}>{localized(locale, "Seguir viendo empleos", "Keep browsing jobs")}</button></div>
        </div>}
        {flow.phase === "error" && <div className="application-flow-empty error">
          <span className="application-flow-symbol">!</span><p className="overline">{localized(locale, "NO SE HA ENVIADO NADA", "NOTHING WAS SUBMITTED")}</p><h2 id="application-flow-title">{localized(locale, "No pudimos completar la candidatura.", "We couldn’t complete the application.")}</h2><p>{flow.error}</p><div className="application-flow-actions"><button className="button button-ghost" type="button" onClick={onClose}>{localized(locale, "Cerrar", "Close")}</button><button className="button button-primary" type="button" onClick={flow.letter ? onSubmit : onRegenerate}>{localized(locale, "Reintentar", "Try again")}</button></div>
        </div>}
      </m.section>
    </m.div>
  );
}

function Paywall({
  locale,
  context,
  onClose,
}: {
  locale: DashboardLocale;
  context: PaywallContext;
  onClose: () => void;
}) {
  const t = dashboardCopy[locale].paywall;
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "sprint">("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(()=>{
    trackProductEvent("paywall_opened",{source:context.source,capability:context.capability??"unknown"});
  },[context.capability,context.source]);
  const plans: Array<{id:"starter"|"pro"|"sprint";name:string;price:string;period:string;detail:string;popular?:string;extra?:string}> = locale === "es" ? [
    { id: "starter" as const, name: "Starter", price: "14,99 €", period: "/ mes", detail: "50 candidaturas al mes" },
    { id: "pro" as const, name: "Pro", price: "34,99 €", period: "/ mes", detail: "200 candidaturas al mes", popular: "Más elegido" },
    { id: "sprint" as const, name: "Sprint", price: "89,99 €", period: "/ 3 meses", detail: "600 candidaturas disponibles", extra: "Equivale a 29,99 €/mes" },
  ] : [
    { id: "starter" as const, name: "Starter", price: "€14.99", period: "/ month", detail: "50 applications per month" },
    { id: "pro" as const, name: "Pro", price: "€34.99", period: "/ month", detail: "200 applications per month", popular: "Most popular" },
    { id: "sprint" as const, name: "Sprint", price: "€89.99", period: "/ 3 months", detail: "600 applications available", extra: "Equivalent to €29.99/month" },
  ];
  const chosen = plans.find((plan) => plan.id === selectedPlan) ?? plans[1];
  async function checkout() {
    setLoading(true);
    setError("");
    try {
      window.localStorage.setItem("landeo-selected-plan", selectedPlan);
      trackProductEvent("paywall_checkout_clicked",{plan:selectedPlan,source:context.source});
      trackProductEvent("stripe_checkout_started",{plan:selectedPlan,source:"paywall"});
      await startStripe("checkout", selectedPlan);
    } catch (value) {
      trackProductEvent("stripe_checkout_failed",{plan:selectedPlan,source:"paywall"});
      setError(value instanceof Error ? value.message : t.error);
      setLoading(false);
    }
  }
  function closePaywall(reason:"close_button"|"backdrop"){
    trackProductEvent("paywall_closed",{plan:selectedPlan,source:context.source,reason});
    onClose();
  }
  return (
    <m.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="modal-scrim" aria-label={t.close} onClick={()=>closePaywall("backdrop")} />
      <m.section
        className="paywall-modal plan-picker-modal"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 230, damping: 24 }}
      >
        <button className="modal-close plan-picker-close" onClick={()=>closePaywall("close_button")} aria-label={t.close}>
          ×
        </button>
        <div className="plan-picker-main">
          <div className="plan-picker-brand"><Brand /></div>
          <p className="overline">LANDEO MEMBERSHIP</p>
          <h2>{locale === "es" ? "Convierte tu búsqueda en entrevistas." : "Turn your job search into interviews."}</h2>
          <p className="plan-picker-lead">{locale === "es" ? "Elige el ritmo que mejor encaja contigo. Todas las funciones están incluidas." : "Choose the pace that fits you. Every feature is included."}</p>
          <div className="plan-picker-assurance"><span>✓</span>{locale === "es" ? "Sin permanencia. Cancela cuando quieras." : "No commitment. Cancel any time."}</div>
          <fieldset className="plan-picker-options" aria-label={locale === "es" ? "Selecciona un plan" : "Choose a plan"}>
            {plans.map((plan) => {
              const active = plan.id === selectedPlan;
              return <m.label key={plan.id} className={active ? "selected" : ""} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
                <input type="radio" name="landeo-plan" value={plan.id} checked={active} onChange={() => {setSelectedPlan(plan.id);trackProductEvent("paywall_plan_selected",{plan:plan.id,source:context.source})}} />
                <span className="plan-picker-radio">{active ? "✓" : ""}</span>
                <span className="plan-picker-name"><strong>{plan.name}</strong><small>{plan.detail}{plan.extra ? ` · ${plan.extra}` : ""}</small></span>
                <span className="plan-picker-price"><strong>{plan.price}</strong><small>{plan.period}</small></span>
                {plan.popular && <b>{plan.popular}</b>}
              </m.label>;
            })}
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary plan-picker-cta" onClick={checkout} disabled={loading}>
            {loading ? t.opening : locale === "es" ? `Empezar con ${chosen.name}` : `Start with ${chosen.name}`}
          </button>
          <div className="plan-picker-footer">
            <span>◆ {locale === "es" ? "Pago seguro con Stripe" : "Secure payment with Stripe"}</span>
            <span><Link href="/terms">{locale === "es" ? "Términos" : "Terms"}</Link><Link href="/privacy">{locale === "es" ? "Privacidad" : "Privacy"}</Link></span>
          </div>
        </div>
        <div className="plan-picker-visual" aria-hidden="true">
          <p>{locale === "es" ? "Tu candidatura, preparada para cada puesto" : "Your application, tailored to every role"}</p>
          <div className="plan-demo-window">
            <div className="plan-demo-bar"><i/><i/><i/><span>LANDEO · APPLICATION</span></div>
            <div className="plan-demo-job"><span className="plan-demo-logo">L</span><div><strong>Product Designer</strong><small>Remote · Technology</small></div><b>92% MATCH</b></div>
            <div className="plan-demo-progress"><span><i style={{ width: "92%" }} /></span><small>{locale === "es" ? "Perfil adaptado al puesto" : "Profile tailored to the role"}</small></div>
            <div className="plan-demo-document"><span/><span/><span/><span/><div><i/><i/><i/></div></div>
            <div className="plan-demo-ready"><span>✓</span><div><strong>{locale === "es" ? "Lista para postularte" : "Ready to apply"}</strong><small>{locale === "es" ? "CV y carta personalizados" : "Tailored résumé and cover letter"}</small></div></div>
          </div>
          <div className="plan-visual-pills"><span>✓ {locale === "es" ? "CV adaptado" : "Tailored résumé"}</span><span>✦ {locale === "es" ? "Carta con IA" : "AI cover letter"}</span><span>↗ {locale === "es" ? "Seguimiento" : "Tracking"}</span></div>
        </div>
      </m.section>
    </m.div>
  );
}
function OutcomeModal({
  locale,
  outcome,
  onClose,
}: {
  locale: DashboardLocale;
  outcome: ApplyOutcome;
  onClose: () => void;
}) {
  const t = dashboardCopy[locale];
  const copy =
    locale === "es"
      ? (statusCopy[outcome.status] ?? {
          label:
            t.status[outcome.status as keyof typeof t.status] ?? outcome.status,
          description: outcome.message,
        })
      : {
          label:
            t.status[outcome.status as keyof typeof t.status] ?? outcome.status,
          description: outcome.message,
        };
  return (
    <m.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="modal-scrim"
        aria-label={t.paywall.close}
        onClick={onClose}
      />
      <m.section
        className="paywall-modal outcome-modal"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 230, damping: 24 }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label={t.paywall.close}
        >
          ×
        </button>
        <span className={`outcome-icon ${outcome.status}`}>
          {outcome.status === "sent"
            ? "✓"
            : outcome.status === "failed"
              ? "!"
              : "↗"}
        </span>
        <p className="overline">{t.paywall.realStatus}</p>
        <h2>{copy.label}</h2>
        <p>{outcome.message || copy.description}</p>
        {outcome.actionUrl && (
          <a
            className="button button-primary"
            href={outcome.actionUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t.paywall.official}
          </a>
        )}
        <Link className="text-button" href="/app/applications">
          {t.paywall.applications}
        </Link>
      </m.section>
    </m.div>
  );
}

function AutoApplyView({
  user,
  profile,
  pro,
  locale,
}: {
  user: User | null;
  profile: CandidateProfile | null;
  pro: boolean;
  locale: DashboardLocale;
}) {
  const [dashboard, setDashboard] = useState<AutoApplyDashboard | null>(null);
  const [form, setForm] = useState<AutoApplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const next = await loadAutoApplyDashboard(profile);
      setDashboard(next);
      setForm((current) => current ?? next.settings);
      setConfirmed(next.settings.enabled);
      setError("");
    } catch (value) {
      setError(value instanceof Error ? value.message : localized(locale, "No pudimos cargar Auto Apply.", "We couldn't load Auto Apply."));
    } finally { setLoading(false); }
  }, [user, profile, locale]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!dashboard?.settings.enabled) return;
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [dashboard?.settings.enabled, refresh]);
  const list = (value: string) => Array.from(new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)));
  const update = <Key extends keyof AutoApplySettings>(key: Key, value: AutoApplySettings[Key]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const save = async (enabled = form?.enabled ?? false) => {
    if (!form || saving) return;
    if (enabled && !confirmed) {
      setError(localized(locale, "Confirma la autorización antes de activar Auto Apply.", "Confirm the authorization before enabling Auto Apply."));
      return;
    }
    setSaving(true);setError("");setNotice("");
    try {
      await saveAutoApplySettings({ ...form, enabled });
      trackProductEvent(enabled ? "auto_apply_enabled" : "auto_apply_paused", { daily_limit: form.dailyLimit, minimum_match: form.minimumMatch });
      setForm({ ...form, enabled });
      setNotice(enabled
        ? localized(locale, "Auto Apply está activo. La primera búsqueda ya está en marcha.", "Auto Apply is active. The first search is already running.")
        : localized(locale, "Configuración guardada. Auto Apply está pausado.", "Settings saved. Auto Apply is paused."));
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : localized(locale, "No pudimos guardar la configuración.", "We couldn't save your settings."));
    } finally { setSaving(false); }
  };
  const runNow = async () => {
    if (saving) return;setSaving(true);setError("");setNotice("");
    try { await runAutoApplyNow();trackProductEvent("auto_apply_run_requested");setNotice(localized(locale, "Búsqueda completada. Hemos actualizado los contadores.", "Search completed. Your counters are now up to date."));await refresh(); }
    catch (value) { setError(value instanceof Error ? value.message : localized(locale, "No pudimos ejecutar Auto Apply.", "We couldn't run Auto Apply.")); }
    finally { setSaving(false); }
  };
  if (!user) return <SignInState locale={locale} title={localized(locale, "Inicia sesión para configurar Auto Apply", "Sign in to configure Auto Apply")} />;
  const readiness = profileReadiness(profile);
  const stats = dashboard?.stats ?? { matched: 0, queued: 0, sent: 0, delivered: 0, actionRequired: 0, failed: 0 };
  const statItems = [
    [localized(locale, "Compatibles", "Matched"), stats.matched],
    [localized(locale, "En cola", "Queued"), stats.queued],
    [localized(locale, "Enviadas", "Sent"), stats.sent],
    [localized(locale, "Entregadas", "Delivered"), stats.delivered],
    [localized(locale, "Acción necesaria", "Action needed"), stats.actionRequired],
    [localized(locale, "Fallidas", "Failed"), stats.failed],
  ];
  return (
    <div className="auto-apply-view">
      <header className="view-header">
        <div><span className="overline">AUTO APPLY · BETA</span><h1>{localized(locale, "Tu búsqueda trabaja por ti", "Let your job search work for you")}</h1><p>{localized(locale, "Landeo encuentra ofertas compatibles y envía tu CV únicamente a correos de candidatura verificados.", "Landeo finds compatible roles and sends your résumé only to verified application emails.")}</p></div>
        <span className={`auto-apply-state ${form?.enabled ? "active" : "paused"}`}><i />{form?.enabled ? localized(locale, "Activo", "Active") : localized(locale, "Pausado", "Paused")}</span>
      </header>
      <section className="auto-apply-summary" aria-live="polite">
        {statItems.map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
      </section>
      <div className="auto-apply-grid">
        <section className="auto-apply-form-card">
          <div className="section-heading"><div><span className="overline">1 · PREFERENCIAS</span><h2>{localized(locale, "Define dónde debe postularte Landeo", "Tell Landeo where to apply")}</h2></div></div>
          {loading || !form ? <p className="inline-loading">{localized(locale, "Cargando configuración…", "Loading settings…")}</p> : <div className="auto-apply-fields">
            <label className="wide"><span>{localized(locale, "Puestos objetivo", "Target roles")}</span><small>{localized(locale, "Sepáralos con comas", "Separate with commas")}</small><input value={form.roles.join(", ")} onChange={(event) => update("roles", list(event.target.value))} placeholder={localized(locale, "Full Stack Developer, Frontend Engineer", "Full Stack Developer, Frontend Engineer")} /></label>
            <label><span>{localized(locale, "Ubicaciones", "Locations")}</span><input value={form.locations.join(", ")} onChange={(event) => update("locations", list(event.target.value))} placeholder={localized(locale, "Barcelona, Madrid, Remoto", "Barcelona, Madrid, Remote")} /></label>
            <label><span>{localized(locale, "Sectores", "Industries")}</span><input value={form.industries.join(", ")} onChange={(event) => update("industries", list(event.target.value))} placeholder={localized(locale, "SaaS, Tecnología, Farmacéutica", "SaaS, Technology, Pharma")} /></label>
            <fieldset><legend>{localized(locale, "Modalidad", "Work setup")}</legend>{["Remoto", "Híbrido", "Presencial"].map((mode) => <label key={mode}><input type="checkbox" checked={form.workModes.includes(mode)} onChange={(event) => update("workModes", event.target.checked ? [...form.workModes, mode] : form.workModes.filter((item) => item !== mode))} /><span>{mode}</span></label>)}</fieldset>
            <fieldset><legend>{localized(locale, "Nivel", "Seniority")}</legend>{["Prácticas", "Junior", "Mid", "Senior"].map((level) => <label key={level}><input type="checkbox" checked={form.seniorityLevels.includes(level)} onChange={(event) => update("seniorityLevels", event.target.checked ? [...form.seniorityLevels, level] : form.seniorityLevels.filter((item) => item !== level))} /><span>{level}</span></label>)}</fieldset>
            <label><span>{localized(locale, "Coincidencia mínima", "Minimum match")} · {form.minimumMatch}%</span><input type="range" min="50" max="95" step="5" value={form.minimumMatch} onChange={(event) => update("minimumMatch", Number(event.target.value))} /></label>
            <label><span>{localized(locale, "Máximo diario", "Daily maximum")}</span><select value={form.dailyLimit} onChange={(event) => update("dailyLimit", Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value} {localized(locale, "candidaturas", "applications")}</option>)}</select></label>
            <label className="wide"><span>{localized(locale, "Empresas excluidas", "Excluded companies")}</span><input value={form.excludedCompanies.join(", ")} onChange={(event) => update("excludedCompanies", list(event.target.value))} placeholder={localized(locale, "Empresa A, Empresa B", "Company A, Company B")} /></label>
          </div>}
        </section>
        <aside className="auto-apply-control-card">
          <span className="overline">2 · CONTROL</span><h2>{localized(locale, "Tú decides cuándo funciona", "You're always in control")}</h2>
          <ul><li>✓ {localized(locale, "Solo canales de email oficiales y verificados", "Verified official email channels only")}</li><li>✓ {localized(locale, "Sin duplicados y con límite diario", "No duplicates and a daily limit")}</li><li>✓ {localized(locale, "Carta personalizada en el idioma de la oferta", "A personalized letter in the job's language")}</li><li>✓ {localized(locale, "Puedes pausarlo en cualquier momento", "Pause it at any time")}</li></ul>
          {!pro && <p className="auto-apply-warning">{localized(locale, "Necesitas una suscripción activa para enviar candidaturas.", "You need an active subscription to send applications.")}</p>}
          {!readiness.ready && <p className="auto-apply-warning">{localized(locale, `Completa tu perfil antes de activarlo: ${readiness.missing.join(", ")}.`, `Complete your profile before enabling it: ${readiness.missing.join(", ")}.`)}</p>}
          <label className="auto-apply-consent"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{localized(locale, "Autorizo a Landeo a enviar mi CV y carta personalizada a las ofertas que cumplan estas preferencias.", "I authorize Landeo to send my résumé and personalized letter to jobs matching these preferences.")}</span></label>
          {error && <p className="form-error">{error}</p>}{notice && <p className="form-success">{notice}</p>}
          <div className="auto-apply-actions"><button className="button button-ghost" type="button" disabled={saving || !form} onClick={() => void save(false)}>{form?.enabled ? localized(locale, "Pausar", "Pause") : localized(locale, "Guardar", "Save")}</button><button className="button button-primary" type="button" disabled={saving || !form || !pro || !readiness.ready || !confirmed} onClick={() => void save(true)}>{saving ? localized(locale, "Procesando…", "Working…") : form?.enabled ? localized(locale, "Guardar y buscar", "Save and search") : localized(locale, "Activar Auto Apply", "Enable Auto Apply")}</button></div>
          {form?.enabled && <button className="text-button auto-apply-run-now" type="button" disabled={saving} onClick={() => void runNow()}>↻ {localized(locale, "Buscar ahora", "Search now")}</button>}
          {dashboard?.lastRun && <small className="auto-apply-last-run">{localized(locale, "Última ejecución", "Last run")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(dashboard.lastRun.startedAt))}{dashboard.lastRun.errorMessage ? ` · ${dashboard.lastRun.errorMessage}` : ""}</small>}
        </aside>
      </div>
    </div>
  );
}

function ApplicationsView({
  user,
  locale,
  targetId,
  onSelectApplication,
}: {
  user: User | null;
  locale: DashboardLocale;
  targetId: string | null;
  onSelectApplication: () => void;
}) {
  const t = dashboardCopy[locale];
  const [items, setItems] = useState<LiveApplication[]>([]);
  const [selected, setSelected] = useState<LiveApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TrackingStage>(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [trackingNotes, setTrackingNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingSaved, setTrackingSaved] = useState(false);
  const detailRef = useRef<HTMLElement | null>(null);
  const scrolledTargetRef = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const next = await loadApplications();
      setItems(next);
      setSelected(
        (current) =>
          next.find((item) => item.id === targetId) ??
          next.find((item) => item.id === current?.id) ?? next[0] ?? null,
      );
      setError("");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : localized(
              locale,
              "No pudimos cargar las candidaturas.",
              "We couldn’t load your applications.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [user, locale, targetId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter === "all") return true;
        return item.tracking.stage === statusFilter;
      }),
    [items, statusFilter],
  );
  useEffect(() => {
    if (!filteredItems.some((item) => item.id === selected?.id)) {
      setSelected(filteredItems[0] ?? null);
    }
  }, [filteredItems, selected?.id]);
  useEffect(() => {
    if (
      !loading && targetId && selected?.id === targetId &&
      scrolledTargetRef.current !== targetId &&
      window.matchMedia("(max-width: 760px)").matches
    ) {
      scrolledTargetRef.current = targetId;
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "start" }));
    }
  }, [loading, selected?.id, targetId]);
  useEffect(() => {
    setTrackingNotes(selected?.tracking.notes ?? "");
    setNextAction(selected?.tracking.nextAction ?? "");
    setNextActionAt(selected?.tracking.nextActionAt?.slice(0, 10) ?? "");
    setTrackingSaved(false);
  }, [selected?.id, selected?.tracking.updatedAt]);
  const saveTracking = async (stage = selected?.tracking.stage) => {
    if (!selected || !stage || savingTracking) return;
    const previous = selected;
    const updatedAt = new Date().toISOString();
    const nextTracking = {
      stage,
      notes: trackingNotes,
      nextAction,
      nextActionAt: nextActionAt || null,
      updatedAt,
    };
    setSavingTracking(true);
    setTrackingSaved(false);
    setItems((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, tracking: nextTracking } : item,
      ),
    );
    setSelected({ ...selected, tracking: nextTracking });
    try {
      await updateApplicationTracking(selected.id, {
        stage,
        notes: trackingNotes,
        nextAction,
        nextActionAt: nextActionAt || null,
      });
      setTrackingSaved(true);
      setError("");
    } catch (value) {
      setItems((current) =>
        current.map((item) => (item.id === previous.id ? previous : item)),
      );
      setSelected(previous);
      setError(
        value instanceof Error
          ? value.message
          : localized(
              locale,
              "No pudimos guardar el seguimiento.",
              "We couldn’t save your tracking update.",
            ),
      );
    } finally {
      setSavingTracking(false);
    }
  };
  const guide = selected ? applicationGuide(selected, locale) : null;
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para ver tus candidaturas",
          "Sign in to view your applications",
        )}
      />
    );
  return (
    <>
      <header className="view-header">
        <div>
          <span className="overline">
            {localized(locale, "TU PIPELINE", "YOUR PIPELINE")}
          </span>
          <h1>{localized(locale, "Mis candidaturas", "My applications")}</h1>
          <p>
            {localized(
              locale,
              "Organiza cada proceso, apunta el próximo paso y no pierdas ninguna oportunidad.",
              "Organize every process, plan the next step, and never lose track of an opportunity.",
            )}
          </p>
        </div>
        <m.button
          className="text-button saas-text-button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={refresh}
          disabled={loading}
          aria-busy={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading
            ? localized(locale, "Actualizando…", "Refreshing…")
            : localized(locale, "Actualizar ahora", "Refresh now")}
        </m.button>
      </header>
      {user.email?.trim().toLowerCase() === "alberto.menendez89@gmail.com" && (
        <MarketingPipelineDemo locale={locale} />
      )}
      <div className="applications-layout">
        <section className="applications-list">
          <div className="status-tabs">
            <button
              type="button"
              className={statusFilter === "all" ? "active" : ""}
              aria-pressed={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              {localized(locale, "Todas", "All")} <b>{items.length}</b>
            </button>
            {trackingStages.map((stage) => (
              <button
                type="button"
                key={stage}
                className={statusFilter === stage ? "active" : ""}
                aria-pressed={statusFilter === stage}
                onClick={() => setStatusFilter(stage)}
              >
                {trackingLabel(stage, locale)}{" "}
                <b>
                  {items.filter((item) => item.tracking.stage === stage).length}
                </b>
              </button>
            ))}
          </div>
          {loading && (
            <p className="inline-loading">
              {localized(
                locale,
                "Cargando candidaturas…",
                "Loading applications…",
              )}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          {!loading && !filteredItems.length && (
            <div className="empty-state compact">
              <span>↗</span>
              <h2>
                {items.length
                  ? localized(
                      locale,
                      "No hay candidaturas con este estado",
                      "No applications match this status",
                    )
                  : localized(
                      locale,
                      "Aún no hay candidaturas",
                      "No applications yet",
                    )}
              </h2>
              <p>
                {localized(
                  locale,
                  "Desliza una oferta a la derecha para empezar.",
                  "Swipe a job to the right to get started.",
                )}
              </p>
            </div>
          )}
          {filteredItems.map((application, position) => (
            <m.button
              key={application.id}
              className={`application-row ${selected?.id === application.id ? "selected" : ""}`}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(position, 8) * 0.035 }}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                onSelectApplication();
                setSelected(application);
                setCopied(false);
              }}
            >
              <span className="company-initials">
                {initials(application.job.company)}
              </span>
              <div className="application-title">
                <strong>{application.job.title}</strong>
                <span>
                  {application.job.company} · {application.job.location}
                </span>
                <small>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(application.updatedAt))}
                </small>
              </div>
              <span className={`tracking-badge ${application.tracking.stage}`}>
                {trackingLabel(application.tracking.stage, locale)}
              </span>
            </m.button>
          ))}
        </section>
        <aside className="application-detail" ref={detailRef}>
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <m.div
                key={selected.id}
                className="application-detail-content"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <span className={`tracking-badge ${selected.tracking.stage}`}>
                  {trackingLabel(selected.tracking.stage, locale)}
                </span>
                <h2>{selected.job.title}</h2>
                <p>
                  {selected.job.company} · {selected.job.location}
                </p>
                {guide && (
                  <section className={`application-guide ${guide.tone}`} aria-label={localized(locale, "Guía de la candidatura", "Application guide")}>
                    <div className="application-guide-intro">
                      <span className="overline">{localized(locale, "SITUACIÓN ACTUAL", "CURRENT SITUATION")}</span>
                      <h3>{guide.title}</h3>
                      <p>{guide.description}</p>
                    </div>
                    <div className="application-guide-facts">
                      <div>
                        <span>{localized(locale, "¿De quién depende ahora?", "Who is it waiting on?")}</span>
                        <strong>{guide.waitingOn}</strong>
                      </div>
                      <div>
                        <span>{selected.tracking.nextAction
                          ? localized(locale, "Tu próximo paso guardado", "Your saved next step")
                          : localized(locale, "Qué hacer ahora", "What to do now")}</span>
                        <strong>{selected.tracking.nextAction || guide.nextStep}</strong>
                        {selected.tracking.nextActionAt && (
                          <small>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${selected.tracking.nextActionAt.slice(0, 10)}T12:00:00`))}</small>
                        )}
                      </div>
                    </div>
                    {selected.status === "action_required" && selected.actionUrl && (
                      <a className="application-guide-action" href={selected.actionUrl} target="_blank" rel="noreferrer">
                        {t.paywall.official}
                      </a>
                    )}
                    <div className="application-guide-meta">
                      <span>{localized(locale, "Envío", "Delivery")}: {t.status[selected.status as keyof typeof t.status] ?? selected.status}</span>
                      <span>{guide.source === "personal"
                        ? localized(locale, "Etapa indicada por ti", "Stage set by you")
                        : localized(locale, "Según el estado registrado", "Based on recorded status")}</span>
                    </div>
                  </section>
                )}
                <section className="tracking-panel">
                  <div className="tracking-panel-heading">
                    <div>
                      <span className="overline">
                        {localized(locale, "SEGUIMIENTO", "TRACKING")}
                      </span>
                      <h3>
                        {localized(
                          locale,
                          "¿En qué punto está?",
                          "Where does it stand?",
                        )}
                      </h3>
                    </div>
                    {trackingSaved && (
                      <small>{localized(locale, "✓ Guardado", "✓ Saved")}</small>
                    )}
                  </div>
                  <div
                    className="tracking-stages"
                    role="group"
                    aria-label={localized(
                      locale,
                      "Etapa de la candidatura",
                      "Application stage",
                    )}
                  >
                    {trackingStages.map((stage, index) => (
                      <button
                        type="button"
                        key={stage}
                        className={
                          selected.tracking.stage === stage ? "active" : ""
                        }
                        aria-pressed={selected.tracking.stage === stage}
                        disabled={savingTracking}
                        onClick={() => saveTracking(stage)}
                      >
                        <i>{index + 1}</i>
                        <span>{trackingLabel(stage, locale)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="tracking-fields">
                    <label>
                      <span>
                        {localized(locale, "Próxima acción", "Next action")}
                      </span>
                      <input
                        value={nextAction}
                        maxLength={240}
                        onChange={(event) => {
                          setNextAction(event.target.value);
                          setTrackingSaved(false);
                        }}
                        placeholder={localized(
                          locale,
                          "Ej. Preparar entrevista técnica",
                          "E.g. Prepare technical interview",
                        )}
                      />
                    </label>
                    <label>
                      <span>{localized(locale, "Fecha", "Date")}</span>
                      <input
                        type="date"
                        value={nextActionAt}
                        onChange={(event) => {
                          setNextActionAt(event.target.value);
                          setTrackingSaved(false);
                        }}
                      />
                    </label>
                  </div>
                  <label className="tracking-notes">
                    <span>
                      {localized(locale, "Notas privadas", "Private notes")}
                    </span>
                    <textarea
                      value={trackingNotes}
                      maxLength={4000}
                      rows={4}
                      onChange={(event) => {
                        setTrackingNotes(event.target.value);
                        setTrackingSaved(false);
                      }}
                      placeholder={localized(
                        locale,
                        "Contacto, preguntas, feedback o detalles que quieras recordar…",
                        "Contacts, questions, feedback, or anything you want to remember…",
                      )}
                    />
                  </label>
                  <button
                    type="button"
                    className="button button-primary tracking-save"
                    disabled={savingTracking}
                    onClick={() => saveTracking()}
                  >
                    {savingTracking
                      ? localized(locale, "Guardando…", "Saving…")
                      : localized(
                          locale,
                          "Guardar seguimiento",
                          "Save tracking",
                        )}
                  </button>
                </section>
                <div className="status-explain">
                  <strong>
                    {localized(
                      locale,
                      "Estado del envío",
                      "Delivery status",
                    )}
                    :{" "}
                    {t.status[selected.status as keyof typeof t.status] ??
                      selected.status}
                  </strong>
                  <span>
                    {selected.errorMessage
                      ? selected.errorMessage
                      : selected.requiredFields.length
                        ? `${localized(locale, "Necesitamos", "Required")}: ${selected.requiredFields.join(", ")}`
                      : selected.deliveryStatus
                        ? `${localized(locale, "Entrega", "Delivery")}: ${selected.deliveryStatus}`
                        : localized(
                            locale,
                            "Consulta la cronología para ver el último cambio.",
                            "Check the timeline for the latest update.",
                          )}
                  </span>
                </div>
                {selected.coverLetter ? (
                  <section className="application-cover-letter is-visible">
                    <header>
                      <span>
                        <b>
                          ✦{" "}
                          {localized(
                            locale,
                            "Carta personalizada",
                            "Personalized cover letter",
                          )}
                        </b>
                        <small>
                          {selected.coverLetterGeneratedAt
                            ? `${localized(locale, "Generada", "Generated")} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.coverLetterGeneratedAt))}`
                            : localized(
                                locale,
                                "Lista para esta oferta",
                                "Ready for this job",
                              )}
                        </small>
                      </span>
                      <em>{coverLetterUsageCopy(locale, selected.coverLetterUsageStatus)}</em>
                    </header>
                    <div>
                      <p>{selected.coverLetter}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            selected.coverLetter ?? "",
                          );
                          setCopied(true);
                        }}
                      >
                        {copied
                          ? localized(locale, "✓ Copiada", "✓ Copied")
                          : localized(locale, "Copiar carta", "Copy letter")}
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="application-cover-letter is-empty">
                    <header>
                      <span><b>✦ {localized(locale, "Carta personalizada", "Personalized cover letter")}</b><small>{localized(locale, "No se generó una carta para esta candidatura.", "No letter was generated for this application.")}</small></span>
                    </header>
                    <Link href="/app/cover-letter">{localized(locale, "Configurar carta con IA →", "Set up AI cover letters →")}</Link>
                  </section>
                )}
                <h3>{localized(locale, "Cronología", "Timeline")}</h3>
                <ol className="timeline">
                  {selected.events.length ? (
                    selected.events.map((event, eventIndex) => (
                      <li
                        key={event.id}
                        className={
                          eventIndex === selected.events.length - 1
                            ? "current"
                            : "done"
                        }
                      >
                        <i />
                        <div>
                          <strong>{event.message}</strong>
                          <small>
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(event.createdAt))}
                          </small>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="current">
                      <i />
                      <div>
                        <strong>
                          {localized(
                            locale,
                            "Candidatura registrada",
                            "Application recorded",
                          )}
                        </strong>
                        <small>
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(new Date(selected.appliedAt))}
                        </small>
                      </div>
                    </li>
                  )}
                </ol>
                <div className="application-trust">
                  <b>i</b>
                  <p>
                    {localized(
                      locale,
                      "Landeo solo muestra “Enviada” cuando el backend ha confirmado el canal.",
                      "Landeo only shows “Sent” after the backend has confirmed the channel.",
                    )}
                  </p>
                </div>
              </m.div>
            ) : (
              <m.div
                key="empty"
                className="empty-state compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p>
                  {localized(
                    locale,
                    "Selecciona una candidatura para ver su estado.",
                    "Select an application to view its status.",
                  )}
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </>
  );
}

function MarketingPipelineDemo({ locale }: { locale: DashboardLocale }) {
  const [applied, setApplied] = useState(100);
  const [running, setRunning] = useState(false);
  const [pulseId, setPulseId] = useState<number | null>(null);
  const pulseSequence = useRef(0);
  const tick = useCallback(() => {
    setApplied((count) => count + 1);
    pulseSequence.current += 1;
    setPulseId(pulseSequence.current);
  }, []);
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [running, tick]);
  useEffect(() => {
    if (pulseId === null) return;
    const timer = window.setTimeout(() => setPulseId(null), 950);
    return () => window.clearTimeout(timer);
  }, [pulseId]);
  const triggerDemo = () => {
    if (!running) tick();
    setRunning(!running);
  };
  const stats = [
    { key: "applied", label: localized(locale, "Solicitudes", "Applied"), value: applied },
    { key: "screening", label: localized(locale, "En revisión", "Screening"), value: 25 },
    { key: "interview", label: localized(locale, "Entrevistas", "Interviews"), value: 6 },
    { key: "offer", label: localized(locale, "Ofertas", "Offers"), value: 1 },
  ];
  return (
    <section className="marketing-pipeline-demo" aria-label={localized(locale, "Candidaturas automáticas", "Automatic applications")}>
      <div className="marketing-pipeline-head">
        <div>
          <h2>{localized(locale, "Así avanza tu búsqueda", "See your search in motion")}</h2>
        </div>
        <button type="button" onClick={triggerDemo} aria-pressed={running} aria-label={running
          ? localized(locale, "Pausar candidaturas automáticas", "Pause automatic applications")
          : localized(locale, "Iniciar candidaturas automáticas", "Start automatic applications")}>
          <span aria-hidden="true">{running ? "Ⅱ" : "↗"}</span>
          {running
            ? "Pause autoapplying"
            : "Autoapplying"}
        </button>
      </div>
      <div className="marketing-pipeline-stats">
        {stats.map((stat, index) => (
          <div key={stat.key} className={`marketing-pipeline-stat ${stat.key}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.key === "applied" && (
              <AnimatePresence>
                {pulseId !== null && (
                  <m.em
                    key={pulseId}
                    initial={{ opacity: 0, y: 12, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [12, 0, -9, -25], scale: [0.8, 1.1, 1, 1] }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    aria-hidden="true"
                  >+1</m.em>
                )}
              </AnimatePresence>
            )}
            {index < stats.length - 1 && <i aria-hidden="true">→</i>}
          </div>
        ))}
      </div>
    </section>
  );
}

function SavedView({
  user,
  locale,
}: {
  user: User | null;
  locale: DashboardLocale;
}) {
  const t = dashboardCopy[locale];
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadSavedJobs()
      .then(setItems)
      .catch((value) =>
        setError(
          value instanceof Error
            ? value.message
            : localized(
                locale,
                "No pudimos cargar los guardados.",
                "We couldn’t load your saved jobs.",
              ),
        ),
      )
      .finally(() => setLoading(false));
  }, [user, locale]);
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para ver tus empleos guardados",
          "Sign in to view your saved jobs",
        )}
      />
    );
  return (
    <>
      <header className="view-header">
        <div>
          <span className="overline">
            {localized(locale, "TU LISTA · SUPABASE", "YOUR LIST · SUPABASE")}
          </span>
          <h1>{localized(locale, "Empleos guardados", "Saved jobs")}</h1>
          <p>
            {localized(
              locale,
              "Disponibles en todos tus dispositivos.",
              "Available across all your devices.",
            )}
          </p>
        </div>
      </header>
      <div className="content-narrow">
        {loading && (
          <p className="inline-loading">
            {localized(locale, "Cargando guardados…", "Loading saved jobs…")}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="saved-grid">
          <AnimatePresence>
            {items.map((job, position) => (
              <m.article
                className="saved-card"
                key={job.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ delay: Math.min(position, 8) * 0.035 }}
                whileHover={{ y: -4 }}
              >
                <div>
                  <span className="company-initials">
                    {initials(job.company)}
                  </span>
                  <button
                    onClick={async () => {
                      await recordSwipe(job.id, "left");
                      setItems((current) =>
                        current.filter((item) => item.id !== job.id),
                      );
                    }}
                    aria-label={localized(
                      locale,
                      "Quitar de guardados",
                      "Remove from saved",
                    )}
                  >
                    ♥
                  </button>
                </div>
                <small>{job.company}</small>
                <h2>{job.title}</h2>
                <p>
                  ⌖ {job.location} ·{" "}
                  {job.workMode === "remote"
                    ? t.jobs.remote
                    : job.workMode === "hybrid"
                      ? t.jobs.hybrid
                      : t.jobs.onsite}
                </p>
                <div>
                  <span className={`mini-cap ${job.applyCapability}`}>
                    {t.capability[job.applyCapability].label}
                  </span>
                  <strong>{job.match}%</strong>
                </div>
                <Link href={`/app/jobs/${job.id}`}>
                  {localized(locale, "Ver oferta", "View job")} →
                </Link>
              </m.article>
            ))}
          </AnimatePresence>
        </div>
        {!loading && !items.length && (
          <m.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <m.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 15 }}
            >
              ♡
            </m.span>
            <h2>{localized(locale, "No tienes guardados", "No saved jobs")}</h2>
            <p>
              {localized(
                locale,
                "Pulsa Guardar en el feed para añadir una oferta.",
                "Tap Save in the feed to add a job.",
              )}
            </p>
          </m.div>
        )}
      </div>
    </>
  );
}

function NotificationsView({
  user,
  locale,
  onOpenApplication,
}: {
  user: User | null;
  locale: DashboardLocale;
  onOpenApplication: (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const [applications, setApplications] = useState<LiveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadApplications()
      .then(setApplications)
      .finally(() => setLoading(false));
  }, [user]);
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para ver tus notificaciones",
          "Sign in to view your notifications",
        )}
      />
    );
  const events = applications
    .flatMap((application) =>
      application.events.map((event) => ({
        ...event,
        job: application.job,
        stage: application.tracking.stage,
      })),
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  return (
    <>
      <header className="view-header">
        <div>
          <span className="overline">
            {localized(locale, "ACTUALIZACIONES REALES", "LIVE UPDATES")}
          </span>
          <h1>{localized(locale, "Notificaciones", "Notifications")}</h1>
          <p>
            {localized(
              locale,
              "Eventos registrados por tus candidaturas.",
              "Updates recorded for your applications.",
            )}
          </p>
        </div>
      </header>
      <div className="content-narrow">
        <section className="notification-list">
          {loading && (
            <p className="inline-loading">
              {localized(locale, "Cargando eventos…", "Loading updates…")}
            </p>
          )}
          {events.map((event, position) => (
            <m.a
              key={event.id}
              href={`/app/applications?application=${encodeURIComponent(event.applicationId)}`}
              onClick={(clickEvent) => onOpenApplication(clickEvent, event.applicationId)}
              aria-label={localized(
                locale,
                `Ver candidatura de ${event.job.title} en ${event.job.company}: ${trackingLabel(event.stage, locale)}`,
                `View ${event.job.title} application at ${event.job.company}: ${trackingLabel(event.stage, locale)}`,
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(position, 10) * 0.035 }}
              whileHover={{ x: 3 }}
            >
              <span
                className={
                  event.type.includes("failed")
                    ? "warning"
                    : event.type.includes("sent") ||
                        event.type.includes("accepted")
                      ? "success"
                      : "info"
                }
              >
                {event.type.includes("failed")
                  ? "!"
                  : event.type.includes("sent") ||
                      event.type.includes("accepted")
                    ? "✓"
                    : "i"}
              </span>
              <div>
                <strong>
                  {event.job.title} · {event.job.company}
                </strong>
                <p>{event.message}</p>
                <span className={`tracking-badge ${event.stage}`}>
                  {trackingLabel(event.stage, locale)}
                </span>
                <small>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </small>
              </div>
              {!event.readAt && <i />}
              <span className="notification-open" aria-hidden="true">↗</span>
            </m.a>
          ))}
          {!loading && !events.length && (
            <div className="empty-state compact">
              <span>◌</span>
              <h2>{localized(locale, "Sin novedades", "No new updates")}</h2>
              <p>
                {localized(
                  locale,
                  "Los eventos de candidatura aparecerán aquí.",
                  "Application updates will appear here.",
                )}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ProfileView({
  user,
  profile,
  pro,
  locale,
}: {
  user: User | null;
  profile: CandidateProfile | null;
  pro: boolean;
  locale: DashboardLocale;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para gestionar tu perfil",
          "Sign in to manage your profile",
        )}
      />
    );
  const readiness = profileReadiness(profile);
  const name = displayName(user, profile, locale);
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  async function removeAccount() {
    const expected = locale === "es" ? "ELIMINAR" : "DELETE";
    if (deleteConfirmation.trim() !== expected) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteCurrentAccount();
      window.location.assign("/?account=deleted");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : localized(locale, "No se pudo eliminar la cuenta.", "The account could not be deleted."),
      );
      setDeleting(false);
    }
  }
  const letterReadiness = coverLetterReadiness(profile);
  return (
    <>
      <header className="view-header">
        <div>
          <span className="overline">
            {localized(locale, "TU CUENTA REAL", "YOUR ACCOUNT")}
          </span>
          <h1>{localized(locale, "Perfil", "Profile")}</h1>
          <p>
            {localized(
              locale,
              "Gestiona tus datos, preferencias y acceso.",
              "Manage your information, preferences and access.",
            )}
          </p>
        </div>
      </header>
      <div className="profile-content">
        <section className="profile-hero">
          <span className="large-avatar">{initials(name)}</span>
          <div>
            <h2>{name}</h2>
            <p>
              {profile?.role ||
                localized(
                  locale,
                  "Completa tu profesión",
                  "Add your profession",
                )}{" "}
              · {profile?.location || user.email}
            </p>
            {pro ? (
              <span className="pro-pill">✦ Landeo Pro</span>
            ) : (
              <span className="pro-pill muted">
                {localized(locale, "Plan gratuito", "Free plan")}
              </span>
            )}
          </div>
          <Link className="profile-edit" href="/app/profile/universal">
            {localized(locale, "Editar perfil", "Edit profile")}
          </Link>
        </section>
        <div className="profile-dashboard">
          <Link href="/app/profile/universal" className="completion-card">
            <div
              className="ring"
              style={{
                background: `conic-gradient(var(--green) 0 ${readiness.percentage}%,#e4eae1 ${readiness.percentage}%)`,
              }}
            >
              <strong>{readiness.percentage}%</strong>
            </div>
            <div>
              <span className="overline">
                {localized(locale, "PERFIL UNIVERSAL", "UNIVERSAL PROFILE")}
              </span>
              <h2>
                {readiness.ready
                  ? localized(locale, "Listo para postularte", "Ready to apply")
                  : localized(
                      locale,
                      "Completa tu base de candidatura",
                      "Complete your application profile",
                    )}
              </h2>
              <p>
                {readiness.ready
                  ? localized(
                      locale,
                      "CV y consentimientos preparados.",
                      "Résumé and consents are ready.",
                    )
                  : `${localized(locale, "Falta", "Missing")}: ${readiness.missing.join(", ")}.`}
              </p>
              <b>{localized(locale, "Revisar perfil", "Review profile")} →</b>
            </div>
          </Link>
          <Link href="/app/cover-letter" className="cover-letter-shortcut">
            <span>✦</span>
            <div>
              <small>
                {localized(locale, "CARTA CON IA", "AI COVER LETTER")} ·{" "}
                {letterReadiness.percentage}%
              </small>
              <strong>
                {letterReadiness.ready
                  ? localized(
                      locale,
                      "Tu base personal está lista",
                      "Your personal profile is ready",
                    )
                  : localized(
                      locale,
                      "Prepara tu historia una sola vez",
                      "Tell your story once",
                    )}
              </strong>
              <p>
                {localized(
                  locale,
                  "Landeo la adapta a cada oferta sin inventar datos.",
                  "Landeo adapts it to every role without inventing details.",
                )}
              </p>
            </div>
            <b>→</b>
          </Link>
          <section className="settings-card">
            <h3>
              {localized(
                locale,
                "Cuenta y suscripción",
                "Account and subscription",
              )}
            </h3>
            <button
              onClick={() =>
                pro ? startStripe("portal") : startStripe("checkout")
              }
            >
              <span>
                {pro
                  ? localized(
                      locale,
                      "Gestionar suscripción en Stripe",
                      "Manage subscription in Stripe",
                    )
                  : localized(
                      locale,
                      "Activar Landeo Pro",
                      "Activate Landeo Pro",
                    )}
              </span>
              <b>›</b>
            </button>
            <Link href="/support">
              <span>
                {localized(locale, "Ayuda y soporte", "Help and support")}
              </span>
              <b>›</b>
            </Link>
            <button onClick={signOut}>
              <span>{localized(locale, "Cerrar sesión", "Sign out")}</span>
              <b>›</b>
            </button>
          </section>
          <section className="settings-card">
            <h3>{localized(locale, "Privacidad", "Privacy")}</h3>
            <Link href="/app/profile/universal#consents">
              <span>
                {localized(
                  locale,
                  "Consentimiento de candidatura",
                  "Application consent",
                )}
              </span>
              <b>{profile?.automaticConsentAt ? "✓" : "›"}</b>
            </Link>
            <Link href="/app/profile/universal#resume">
              <span>{localized(locale, "CV privado", "Private résumé")}</span>
              <b>{profile?.cvPath ? "✓" : "›"}</b>
            </Link>
            <button className="danger" type="button" onClick={() => {
              setDeleteConfirmation("");
              setDeleteError("");
              setDeleteOpen(true);
            }}>
              <span>{localized(locale, "Eliminar cuenta", "Delete account")}</span>
              <b>›</b>
            </button>
          </section>
        </div>
      </div>
      <AnimatePresence>
        {deleteOpen && (
          <m.div className="modal-backdrop account-delete-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="modal-scrim" aria-label={localized(locale, "Cerrar", "Close")} onClick={() => !deleting && setDeleteOpen(false)} />
            <m.section className="account-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}>
              <span className="account-delete-icon" aria-hidden="true">!</span>
              <span className="overline">{localized(locale, "ACCIÓN IRREVERSIBLE", "IRREVERSIBLE ACTION")}</span>
              <h2 id="delete-account-title">{localized(locale, "Eliminar tu cuenta definitivamente", "Permanently delete your account")}</h2>
              <p>{localized(locale, "Cancelaremos tu suscripción y eliminaremos tu perfil, CV, preferencias, candidaturas, mensajes e integraciones. No podrás recuperar estos datos.", "We will cancel your subscription and delete your profile, résumé, preferences, applications, messages and integrations. This data cannot be recovered.")}</p>
              <label>
                {localized(locale, "Escribe ELIMINAR para confirmar", "Type DELETE to confirm")}
                <input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={deleting} placeholder={locale === "es" ? "ELIMINAR" : "DELETE"} />
              </label>
              {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
              <div className="account-delete-actions">
                <button className="button button-ghost" type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>{localized(locale, "Conservar mi cuenta", "Keep my account")}</button>
                <button className="button account-delete-confirm" type="button" onClick={removeAccount} disabled={deleting || deleteConfirmation.trim() !== (locale === "es" ? "ELIMINAR" : "DELETE")}>{deleting ? localized(locale, "Eliminando…", "Deleting…") : localized(locale, "Eliminar definitivamente", "Delete permanently")}</button>
              </div>
            </m.section>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CoverLetterView({ user, profile, locale, onSaved }: {
  user: User | null;
  profile: CandidateProfile | null;
  locale: DashboardLocale;
  onSaved: () => Promise<void>;
}) {
  if (!user) return <SignInState locale={locale} title={localized(locale, "Inicia sesión para preparar tu carta", "Sign in to prepare your cover letter")} />;
  return <GuidedCoverLetter key={user.id} profile={profile} locale={locale} onSaved={onSaved} />;
}

function UniversalProfile({
  user,
  profile,
  locale,
  onSaved,
}: {
  user: User | null;
  profile: CandidateProfile | null;
  locale: DashboardLocale;
  onSaved: () => Promise<void>;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("España");
  const [role, setRole] = useState("");
  const [authorization, setAuthorization] = useState("España");
  const [privacy, setPrivacy] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [cv, setCv] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profileStep, setProfileStep] = useState(0);
  useEffect(() => {
    if (!user) return;
    const universal = profile?.universal;
    const names = (
      profile?.fullName || String(user.user_metadata?.full_name ?? "")
    ).split(/\s+/);
    setFirstName(universal?.firstName || names[0] || "");
    setLastName(universal?.lastName || names.slice(1).join(" "));
    setEmail(profile?.email || user.email || "");
    setPhone(profile?.phone || "");
    setCity(universal?.city || profile?.location || "");
    setCountry(universal?.country || "España");
    setRole(profile?.role || "");
    setAuthorization(universal?.workAuthorizationCountries?.[0] || "España");
    setPrivacy(Boolean(universal?.privacyConsent));
    setAutomatic(Boolean(universal?.automaticApplicationConsent));
  }, [user, profile]);
  useEffect(() => {
    const stepByHash: Record<string, number> = {
      "#identity": 0,
      "#resume": 1,
      "#authorization": 2,
      "#consents": 3,
    };
    const syncHash = () => {
      const nextStep = stepByHash[window.location.hash];
      if (typeof nextStep === "number") setProfileStep(nextStep);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para crear tu perfil universal",
          "Sign in to create your universal profile",
        )}
      />
    );
  const preview: CandidateProfile = {
    id: user.id,
    fullName: `${firstName} ${lastName}`,
    email,
    phone,
    role,
    location: city,
    skills: profile?.skills ?? [],
    workModes: profile?.workModes ?? [],
    minSalary: profile?.minSalary ?? null,
    maxSalary: profile?.maxSalary ?? null,
    cvPath: cv?.name || profile?.cvPath || null,
    universal: {
      ...(profile?.universal ?? {
        version: 1,
        addressLine: "",
        postalCode: "",
        githubUrl: "",
        websiteUrl: "",
        salaryCurrency: "EUR",
        availability: "",
        noticePeriod: "",
        visaRequirement: "No necesito visado",
        willingToRelocate: false,
        languages: [],
        lastCompany: "",
        lastTitle: "",
        yearsExperience: 0,
        generalMotivation: "",
        openToInternship: false,
        universityAgreement: "No aplica",
        firstName: "",
        lastName: "",
        city: "",
        country: "España",
        workAuthorizationCountries: [],
        privacyConsent: false,
        automaticApplicationConsent: false,
      }),
      firstName,
      lastName,
      city,
      country,
      workAuthorizationCountries: [authorization],
      privacyConsent: privacy,
      automaticApplicationConsent: automatic,
    },
    privacyConsentAt: privacy ? "now" : null,
    automaticConsentAt: automatic ? "now" : null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
  };
  const readiness = profileReadiness(preview);
  const profileSteps = locale === "es"
    ? ["Identidad y contacto", "CV privado", "Autorización laboral", "Consentimientos"]
    : ["Identity and contact", "Private résumé", "Work authorization", "Consents"];
  const stepComplete = [
    Boolean(firstName && lastName && email && phone && city && country),
    Boolean(cv || profile?.cvPath),
    Boolean(authorization),
    privacy && automatic,
  ];
  const stepContent = [
    {
      eyebrow: localized(locale, "01 · IDENTIDAD", "01 · IDENTITY"),
      title: localized(locale, "Tus datos esenciales", "Your essential details"),
      detail: localized(locale, "Esta información se reutiliza de forma segura en tus candidaturas.", "This information is securely reused across your applications."),
    },
    {
      eyebrow: localized(locale, "02 · DOCUMENTO PRIVADO", "02 · PRIVATE DOCUMENT"),
      title: localized(locale, "Añade tu CV una sola vez", "Add your résumé once"),
      detail: localized(locale, "Se guarda de forma privada y solo se utiliza cuando decides postularte.", "It stays private and is only used when you choose to apply."),
    },
    {
      eyebrow: localized(locale, "03 · ELEGIBILIDAD", "03 · ELIGIBILITY"),
      title: localized(locale, "Confirma dónde puedes trabajar", "Confirm where you can work"),
      detail: localized(locale, "Esto evita recomendarte candidaturas para las que necesitarías una autorización diferente.", "This helps avoid roles that require a different work authorization."),
    },
    {
      eyebrow: localized(locale, "04 · CONTROL Y PRIVACIDAD", "04 · CONTROL & PRIVACY"),
      title: localized(locale, "Tú decides cuándo utilizarlo", "You decide when it is used"),
      detail: localized(locale, "Revisa los permisos necesarios antes de activar tu perfil universal.", "Review the required permissions before activating your universal profile."),
    },
  ][profileStep];
  const changeProfileStep = (nextStep: number) => {
    const safeStep = Math.max(0, Math.min(3, nextStep));
    setProfileStep(safeStep);
    const hashes = ["identity", "resume", "authorization", "consents"];
    window.history.replaceState(null, "", `#${hashes[safeStep]}`);
    document.querySelector(".profile-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName || !lastName || !email || !phone || !city || !country) {
      changeProfileStep(0);
      setMessage(localized(locale, "Completa primero tus datos de identidad y contacto.", "Complete your identity and contact details first."));
      return;
    }
    if (!cv && !profile?.cvPath) {
      changeProfileStep(1);
      setMessage(localized(locale, "Añade tu CV antes de guardar el perfil.", "Add your résumé before saving the profile."));
      return;
    }
    if (!authorization) {
      changeProfileStep(2);
      setMessage(localized(locale, "Indica tu autorización laboral.", "Add your work authorization."));
      return;
    }
    if (!privacy || !automatic) {
      changeProfileStep(3);
      setMessage(localized(locale, "Revisa y acepta los consentimientos necesarios.", "Review and accept the required consents."));
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await saveProfile({
        firstName,
        lastName,
        email,
        phone,
        city,
        country,
        role,
        authorizationCountry: authorization,
        privacyConsent: privacy,
        automaticConsent: automatic,
        cv,
      });
      await onSaved();
      setMessage(
        localized(
          locale,
          "Perfil guardado de forma segura.",
          "Profile saved securely.",
        ),
      );
      if (readiness.ready) router.push("/app/jobs");
    } catch (value) {
      setMessage(
        value instanceof Error
          ? value.message
          : localized(
              locale,
              "No pudimos guardar el perfil.",
              "We couldn’t save your profile.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <header className="view-header universal-head">
        <div>
          <Link href="/app/profile">
            ← {localized(locale, "Volver al perfil", "Back to profile")}
          </Link>
          <span className="overline">
            {localized(
              locale,
              "PERFIL UNIVERSAL · SUPABASE",
              "UNIVERSAL PROFILE · SUPABASE",
            )}
          </span>
          <h1>
            {localized(
              locale,
              "Una vez. Para cada oportunidad.",
              "Once. For every opportunity.",
            )}
          </h1>
          <p>
            {localized(
              locale,
              "El CV se guarda de forma privada y solo se comparte tras tu swipe derecho.",
              "Your résumé is stored privately and only shared after your right swipe.",
            )}
          </p>
        </div>
        <div className="universal-progress">
          <strong>{readiness.percentage}%</strong>
          <span>{localized(locale, "listo", "ready")}</span>
          <progress value={readiness.percentage} max="100" />
        </div>
      </header>
      <div className="universal-layout">
        <nav className="block-nav" role="tablist" aria-label={localized(locale, "Secciones del perfil", "Profile sections")}>
          {profileSteps.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={profileStep === index}
              aria-controls={`profile-step-${index}`}
              className={`${profileStep === index ? "active" : ""} ${stepComplete[index] ? "done" : ""}`}
              onClick={() => changeProfileStep(index)}
            >
              <i>{stepComplete[index] ? "✓" : index + 1}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <form className="profile-form" onSubmit={submit}>
          <span className="overline">{stepContent.eyebrow}</span>
          <h2>{stepContent.title}</h2>
          <p>{stepContent.detail}</p>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={profileStep}
              id={`profile-step-${profileStep}`}
              className="profile-step-panel"
              role="tabpanel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.16 }}
            >
              {profileStep === 0 && (
                <div className="form-grid" id="identity">
                  <label>{localized(locale, "Nombre", "First name")}<input required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
                  <label>{localized(locale, "Apellidos", "Last name")}<input required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
                  <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                  <label>{localized(locale, "Teléfono", "Phone")}<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                  <label>{localized(locale, "Ciudad", "City")}<input required value={city} onChange={(event) => setCity(event.target.value)} /></label>
                  <label>{localized(locale, "País", "Country")}<input required value={country} onChange={(event) => setCountry(event.target.value)} /></label>
                  <label className="full">{localized(locale, "Puesto actual", "Current role")}<input value={role} onChange={(event) => setRole(event.target.value)} /></label>
                </div>
              )}
              {profileStep === 1 && (
                <div className="profile-document-step" id="resume">
                  <label className="profile-file-drop">
                    <span aria-hidden="true">⇧</span>
                    <strong>{localized(locale, "Selecciona tu CV", "Choose your résumé")}</strong>
                    <small>{localized(locale, "PDF, DOC o DOCX · máximo 8 MB", "PDF, DOC or DOCX · 8 MB maximum")}</small>
                    <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setCv(event.target.files?.[0] ?? null)} />
                  </label>
                  <p className={cv || profile?.cvPath ? "profile-file-current ready" : "profile-file-current"}>
                    <b>{cv || profile?.cvPath ? "✓" : "i"}</b>
                    <span><strong>{cv?.name || profile?.cvPath?.split("/").pop() || localized(locale, "Aún no has subido un CV", "No résumé uploaded yet")}</strong><small>{localized(locale, "Cifrado y privado en Supabase Storage", "Encrypted and private in Supabase Storage")}</small></span>
                  </p>
                </div>
              )}
              {profileStep === 2 && (
                <div className="profile-authorization-step" id="authorization">
                  <span aria-hidden="true">◎</span>
                  <label>{localized(locale, "País o región donde puedes trabajar", "Country or region where you can work")}<input required value={authorization} onChange={(event) => setAuthorization(event.target.value)} /></label>
                  <p>{localized(locale, "Añade el mercado principal en el que tienes permiso de trabajo. Podrás ampliarlo más adelante.", "Add the primary market where you are authorized to work. You can expand it later.")}</p>
                </div>
              )}
              {profileStep === 3 && (
                <div className="consent-box profile-consent-step" id="consents">
                  <label aria-label={localized(locale, "Consentimiento de privacidad", "Privacy consent")}><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span><strong>{localized(locale, "Consentimiento de privacidad", "Privacy consent")}</strong><small>{localized(locale, "Autorizo el tratamiento de mis datos para gestionar candidaturas.", "I authorize the processing of my information to manage applications.")}</small></span></label>
                  <label aria-label={localized(locale, "Autorización de candidatura automática", "Automatic application authorization")}><input type="checkbox" checked={automatic} onChange={(event) => setAutomatic(event.target.checked)} /><span><strong>{localized(locale, "Autorización de candidatura automática", "Automatic application authorization")}</strong><small>{localized(locale, "Solo se utiliza cuando expreso intención con un swipe derecho.", "Used only when I express intent with a right swipe.")}</small></span></label>
                </div>
              )}
            </m.div>
          </AnimatePresence>
          {message && (
            <p
              className={
                /guardado|saved/i.test(message) ? "form-success" : "form-error"
              }
              role="status"
            >
              {message}
            </p>
          )}
          <div className="form-actions">
            <span>
              {readiness.ready
                ? localized(
                    locale,
                    "Perfil listo para postularte.",
                    "Profile ready to apply.",
                  )
                : `${localized(locale, "Falta", "Missing")}: ${readiness.missing.join(", ")}.`}
            </span>
            <div className="form-actions-buttons">
              {profileStep > 0 && <button className="button button-ghost" type="button" onClick={() => changeProfileStep(profileStep - 1)}>← {localized(locale, "Anterior", "Previous")}</button>}
              {profileStep < 3 ? (
                <button className="button button-primary" type="button" onClick={() => changeProfileStep(profileStep + 1)}>{localized(locale, "Continuar", "Continue")} →</button>
              ) : (
                <button className="button button-primary" type="submit" disabled={saving}>{saving ? localized(locale, "Guardando…", "Saving…") : localized(locale, "Guardar perfil →", "Save profile →")}</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function SignInState({
  title,
  locale,
}: {
  title: string;
  locale: DashboardLocale;
}) {
  return (
    <>
      <header className="view-header">
        <div>
          <span className="overline">
            {localized(locale, "CUENTA LANDEO", "LANDEO ACCOUNT")}
          </span>
          <h1>{title}</h1>
          <p>
            {localized(
              locale,
              "Tus datos y decisiones se guardan de forma privada.",
              "Your information and decisions are stored privately.",
            )}
          </p>
        </div>
      </header>
      <div className="content-narrow">
        <div className="empty-state">
          <span>◎</span>
          <h2>
            {localized(locale, "Necesitas una sesión", "You need to sign in")}
          </h2>
          <p>
            {localized(
              locale,
              "Accede con email, Google o Apple.",
              "Continue with email, Google or Apple.",
            )}
          </p>
          <Link className="button button-primary" href="/login">
            {localized(locale, "Entrar", "Sign in")} →
          </Link>
        </div>
      </div>
    </>
  );
}
