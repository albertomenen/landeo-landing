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
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { statusCopy, type Job } from "../lib/fixtures";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  coverLetterReadiness,
  currentUser,
  hasWebPro,
  loadApplications,
  loadJobs,
  loadProfile,
  loadSavedJobs,
  profileReadiness,
  recordSwipe,
  saveCoverLetterProfile,
  saveProfile,
  startStripe,
  submitApplication,
  type ApplyOutcome,
  type CandidateProfile,
  type CoverLetterProfile,
  type LiveApplication,
} from "../lib/landeo";
import { Brand } from "./Brand";
import { dashboardCopy, type DashboardLocale } from "../lib/dashboard-i18n";

export type ProductView =
  | "jobs"
  | "applications"
  | "saved"
  | "notifications"
  | "profile"
  | "universal"
  | "cover-letter";
const nav = [
  { id: "jobs", href: "/app/jobs", icon: "⌁", labelKey: "jobs" },
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
const mobileNavItems = nav.filter((item) => item.id !== "notifications");
const capabilityIcon = { automatic: "✓", assisted: "↗", external: "↗" };
const localized = (locale: DashboardLocale, es: string, en: string) =>
  locale === "es" ? es : en;
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

function sourceAttribution(job: Job) {
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

export default function ProductApp({ view }: { view: ProductView }) {
  const [locale, setLocale] = useState<DashboardLocale>("es");
  const [mobileNav, setMobileNav] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [pro, setPro] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(true);
  const refreshIdentity = useCallback(async () => {
    const nextUser = await currentUser();
    setUser(nextUser);
    if (nextUser) {
      const [nextProfile, nextPro] = await Promise.all([
        loadProfile(),
        hasWebPro(),
      ]);
      setProfile(nextProfile);
      setPro(nextPro);
    } else {
      setProfile(null);
      setPro(false);
    }
    setIdentityLoading(false);
  }, []);
  useEffect(() => {
    refreshIdentity();
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange(() =>
      refreshIdentity(),
    );
    return () => data.subscription.unsubscribe();
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
  const changeLocale = (nextLocale: DashboardLocale) => {
    setLocale(nextLocale);
    window.localStorage.setItem("landeo-locale", nextLocale);
    document.documentElement.lang = nextLocale;
  };
  const t = dashboardCopy[locale];
  const readiness = profileReadiness(profile);
  const name = displayName(user, profile, locale);
  const initialsValue = initials(name) || "L";
  return (
    <div className="app-frame">
      <aside className={`app-sidebar ${mobileNav ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            aria-label={t.chrome.closeMenu}
            onClick={() => setMobileNav(false)}
          >
            ×
          </button>
        </div>
        <div className="profile-mini">
          <span>{initialsValue}</span>
          <div>
            <strong>{identityLoading ? t.chrome.connecting : name}</strong>
            <small>
              {user
                ? `${t.chrome.profileAt} ${readiness.percentage}%`
                : t.chrome.profileRequired}
            </small>
          </div>
          {pro && <b>Pro</b>}
        </div>
        <nav aria-label={t.chrome.navigation}>
          {nav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={view === item.id ? "active" : ""}
            >
              <i>{item.icon}</i>
              {t.nav[item.labelKey]}
            </Link>
          ))}
        </nav>
        <div className="profile-progress">
          <div>
            <strong>{t.chrome.universalProfile}</strong>
            <span>{readiness.percentage}%</span>
          </div>
          <progress value={readiness.percentage} max="100">
            {readiness.percentage}%
          </progress>
          <p>
            {readiness.ready
              ? t.chrome.ready
              : `${readiness.missing.length} ${t.chrome.completeRequirements}`}
          </p>
          <Link href="/app/profile/universal">
            {readiness.ready
              ? t.chrome.reviewProfile
              : t.chrome.completeProfile}{" "}
            →
          </Link>
        </div>
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
      </aside>
      <div className="app-main">
        <header className="app-mobile-header">
          <button
            aria-label={t.chrome.openMenu}
            onClick={() => setMobileNav(true)}
          >
            ☰
          </button>
          <Brand compact />
          <span className="avatar">{initialsValue}</span>
        </header>
        {view === "jobs" ? (
          <JobsView user={user} profile={profile} pro={pro} locale={locale} />
        ) : view === "applications" ? (
          <ApplicationsView user={user} locale={locale} />
        ) : view === "cover-letter" ? (
          <CoverLetterView
            user={user}
            profile={profile}
            locale={locale}
            onSaved={refreshIdentity}
          />
        ) : view === "saved" ? (
          <SavedView user={user} locale={locale} />
        ) : view === "notifications" ? (
          <NotificationsView user={user} locale={locale} />
        ) : view === "universal" ? (
          <UniversalProfile
            user={user}
            profile={profile}
            locale={locale}
            onSaved={refreshIdentity}
          />
        ) : (
          <ProfileView
            user={user}
            profile={profile}
            pro={pro}
            locale={locale}
          />
        )}
      </div>
      <nav className="mobile-bottom-nav" aria-label={t.chrome.mobileNavigation}>
        {mobileNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={
              view === item.id ||
              (view === "universal" && item.id === "profile")
                ? "active"
                : ""
            }
          >
            <i>{item.icon}</i>
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
    </div>
  );
}

function JobsView({
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
  const t = dashboardCopy[locale];
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [workMode, setWorkMode] = useState("all");
  const [notice, setNotice] = useState("");
  const [paywall, setPaywall] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => new Set());
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const dragStart = useRef<number | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await loadJobs());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.notices.loadError]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const filtered = useMemo(
    () =>
      jobs.filter(
        (job) =>
          (mode === "all" || job.applyCapability === mode) &&
          (workMode === "all" || job.workMode === workMode) &&
          `${job.title} ${job.company}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [jobs, mode, workMode, query],
  );
  const job = filtered[index % Math.max(filtered.length, 1)];
  const attribution = job ? sourceAttribution(job) : null;
  const removeCurrent = useCallback(() => {
    if (!job) return;
    setJobs((current) => current.filter((item) => item.id !== job.id));
    setIndex(0);
  }, [job]);
  const triggerConfetti = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setConfettiBurst((value) => value + 1);
  }, []);
  const pass = useCallback(async () => {
    if (!job) return;
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      await recordSwipe(job.id, "left");
      removeCurrent();
      setNotice(t.notices.discarded);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.swipeError);
    }
  }, [job, user, router, removeCurrent, t.notices]);
  const save = useCallback(async () => {
    if (!job) return;
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      await recordSwipe(job.id, "save");
      setSavedJobIds((current) => new Set(current).add(job.id));
      setNotice(t.notices.saved);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.saveError);
    }
  }, [job, user, router, t.notices]);
  const apply = useCallback(async () => {
    if (!job) return;
    if (!user) {
      router.push(`/login?next=/app/jobs`);
      return;
    }
    if (!pro) {
      setPaywall(true);
      return;
    }
    const readiness = profileReadiness(profile);
    if (!readiness.ready) {
      setNotice(
        `${t.notices.completeProfile}: ${readiness.missing.join(", ")}.`,
      );
      router.push("/app/profile/universal");
      return;
    }
    setApplying(true);
    setNotice("");
    try {
      const result = await submitApplication(job.id);
      setOutcome(result);
      if (result.status !== "failed") {
        triggerConfetti();
        removeCurrent();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.notices.applyError;
      if (/Pro|suscripci|pago/i.test(message)) setPaywall(true);
      else setOutcome({ status: "failed", message });
    } finally {
      setApplying(false);
    }
  }, [
    job,
    user,
    pro,
    profile,
    router,
    removeCurrent,
    triggerConfetti,
    t.notices,
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
      <header className="view-header">
        <div>
          <span className="overline">{t.jobs.eyebrow}</span>
          <h1>{t.jobs.title}</h1>
          <p>{t.jobs.subtitle}</p>
        </div>
        <div className="header-actions">
          <button aria-label={t.jobs.refresh} onClick={refresh}>
            ↻
          </button>
          <span className="avatar">
            {initials(displayName(user, profile, locale))}
          </span>
        </div>
      </header>
      <div className="jobs-layout">
        <aside className="filters-panel">
          <div className="filter-title">
            <strong>{t.jobs.filters}</strong>
            <button
              onClick={() => {
                setMode("all");
                setWorkMode("all");
                setQuery("");
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
            <select defaultValue="ES">
              <option>{t.jobs.spain}</option>
              <option>{t.jobs.us}</option>
              <option>{t.jobs.uk}</option>
            </select>
          </label>
          <fieldset className="work-mode-filter">
            <legend>{t.jobs.workMode}</legend>
            {[
              ["all", t.jobs.all],
              ["remote", t.jobs.remote],
              ["hybrid", t.jobs.hybrid],
              ["onsite", t.jobs.onsite],
            ].map(([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  checked={workMode === value}
                  onChange={() => setWorkMode(value)}
                />
                <span>{label}</span>
              </label>
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
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="filter-note">
            <b>i</b>
            <p>
              <strong>{t.jobs.responsible}</strong>
              {t.jobs.responsibleDetail}
            </p>
          </div>
        </aside>
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
                <i
                  key={itemIndex}
                  className={itemIndex === index ? "active" : ""}
                />
              ))}
            </div>
          </div>
          {loading ? (
            <div className="empty-state">
              <span>↻</span>
              <h2>{t.jobs.loadingTitle}</h2>
              <p>{t.jobs.loadingDetail}</p>
            </div>
          ) : job ? (
            <div
              className="feed-card"
              role="button"
              tabIndex={0}
              aria-label={`${job.title} · ${job.company}`}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") pass();
                if (event.key === "ArrowRight" || event.key === "Enter")
                  apply();
              }}
              onPointerDown={(event) => (dragStart.current = event.clientX)}
              onPointerUp={(event) => {
                if (dragStart.current === null) return;
                const distance = event.clientX - dragStart.current;
                if (distance > 80) apply();
                if (distance < -80) pass();
                dragStart.current = null;
              }}
            >
              <div className="feed-top">
                <span className="company-initials">
                  {initials(job.company)}
                </span>
                <div>
                  <strong>{job.company}</strong>
                  <small>{job.industry}</small>
                </div>
                <button
                  aria-label={t.jobs.saveOffer}
                  onClick={(event) => {
                    event.stopPropagation();
                    save();
                  }}
                >
                  ♡
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
              <div className={`capability ${job.applyCapability}`}>
                <b>{capabilityIcon[job.applyCapability]}</b>
                <div>
                  <strong>{t.capability[job.applyCapability].label}</strong>
                  <small>{t.capability[job.applyCapability].detail}</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span>✓</span>
              <h2>{t.jobs.upToDate}</h2>
              <p>{t.jobs.upToDateDetail}</p>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          <div className="deck-actions">
            <button
              className="action-pass"
              onClick={pass}
              disabled={!job || applying}
            >
              <b>×</b>
              <span>
                {t.jobs.pass}
                <small>←</small>
              </span>
            </button>
            <button
              className={`action-save ${job && savedJobIds.has(job.id) ? "is-saved" : ""}`}
              onClick={save}
              disabled={!job || applying}
              aria-pressed={Boolean(job && savedJobIds.has(job.id))}
            >
              <b>{job && savedJobIds.has(job.id) ? "♥" : "♡"}</b>
              <span>
                {t.jobs.save}
                <small>S</small>
              </span>
            </button>
            <button
              className="action-apply"
              onClick={apply}
              disabled={!job || applying}
            >
              <b>{applying ? "…" : "→"}</b>
              <span>
                {applying ? t.jobs.applying : t.jobs.apply}
                <small>ENTER</small>
              </span>
            </button>
          </div>
        </section>
        {job && (
          <aside className="detail-panel">
            <div className="detail-match">
              <div>
                <strong>{job.match}%</strong>
                <span>{t.jobs.match}</span>
              </div>
              <small>{t.jobs.relevance}</small>
            </div>
            <div className="match-reasons">
              <strong>{t.jobs.channel}</strong>
              <p>
                <i>✓</i>
                {t.capability[job.applyCapability].label}
              </p>
              <p>
                <i>✓</i>
                {t.jobs.updated}
              </p>
              <p>
                <i>✓</i>
                {t.jobs.privateDestination}
              </p>
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
          </aside>
        )}
      </div>
      {confettiBurst > 0 && <ConfettiBurst key={confettiBurst} />}{" "}
      {paywall && <Paywall locale={locale} onClose={() => setPaywall(false)} />}{" "}
      {outcome && (
        <OutcomeModal
          locale={locale}
          outcome={outcome}
          onClose={() => setOutcome(null)}
        />
      )}
    </>
  );
}

function Paywall({
  locale,
  onClose,
}: {
  locale: DashboardLocale;
  onClose: () => void;
}) {
  const t = dashboardCopy[locale].paywall;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setLoading(true);
    setError("");
    try {
      await startStripe("checkout");
    } catch (value) {
      setError(value instanceof Error ? value.message : t.error);
      setLoading(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <button className="modal-scrim" aria-label={t.close} onClick={onClose} />
      <section className="paywall-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label={t.close}>
          ×
        </button>
        <span className="pro-gem">✦</span>
        <p className="overline">LANDEO PRO · STRIPE</p>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
        <ul>
          {t.benefits.map((benefit) => (
            <li key={benefit}>✓ {benefit}</li>
          ))}
        </ul>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button-primary"
          onClick={checkout}
          disabled={loading}
        >
          {loading ? t.opening : t.continue}
        </button>
        <button className="text-button" onClick={onClose}>
          {t.free}
        </button>
      </section>
    </div>
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
    <div className="modal-backdrop">
      <button
        className="modal-scrim"
        aria-label={t.paywall.close}
        onClick={onClose}
      />
      <section
        className="paywall-modal outcome-modal"
        role="dialog"
        aria-modal="true"
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
      </section>
    </div>
  );
}

function ApplicationsView({
  user,
  locale,
}: {
  user: User | null;
  locale: DashboardLocale;
}) {
  const t = dashboardCopy[locale];
  const [items, setItems] = useState<LiveApplication[]>([]);
  const [selected, setSelected] = useState<LiveApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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
  }, [user, locale]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
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
            {localized(locale, "SEGUIMIENTO REAL", "LIVE TRACKING")}
          </span>
          <h1>{localized(locale, "Mis candidaturas", "My applications")}</h1>
          <p>
            {localized(
              locale,
              "Se actualizan automáticamente cada 15 segundos.",
              "Automatically refreshed every 15 seconds.",
            )}
          </p>
        </div>
        <button className="text-button" onClick={refresh}>
          {localized(locale, "Actualizar ahora", "Refresh now")}
        </button>
      </header>
      <div className="applications-layout">
        <section className="applications-list">
          <div className="status-tabs">
            <button className="active">
              {localized(locale, "Todas", "All")} <b>{items.length}</b>
            </button>
            <button>
              {localized(locale, "En curso", "In progress")}{" "}
              <b>
                {
                  items.filter((item) =>
                    ["queued", "processing"].includes(item.status),
                  ).length
                }
              </b>
            </button>
            <button>
              {localized(locale, "Enviadas", "Sent")}{" "}
              <b>{items.filter((item) => item.status === "sent").length}</b>
            </button>
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
          {!loading && !items.length && (
            <div className="empty-state compact">
              <span>↗</span>
              <h2>
                {localized(
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
          {items.map((application) => (
            <button
              key={application.id}
              className={`application-row ${selected?.id === application.id ? "selected" : ""}`}
              onClick={() => {
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
              <span className={`status-badge ${application.status}`}>
                {t.status[application.status as keyof typeof t.status] ??
                  application.status}
              </span>
            </button>
          ))}
        </section>
        <aside className="application-detail">
          {selected ? (
            <>
              <span className={`status-badge ${selected.status}`}>
                {t.status[selected.status as keyof typeof t.status] ??
                  selected.status}
              </span>
              <h2>{selected.job.title}</h2>
              <p>
                {selected.job.company} · {selected.job.location}
              </p>
              <div className="status-explain">
                <strong>
                  {t.status[selected.status as keyof typeof t.status] ??
                    selected.status}
                </strong>
                <span>
                  {selected.errorMessage || selected.requiredFields.length
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
              {selected.coverLetter && (
                <details className="application-cover-letter">
                  <summary>
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
                    <i>⌄</i>
                  </summary>
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
                </details>
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
              {selected.status === "action_required" && selected.actionUrl && (
                <a
                  className="button button-primary"
                  href={selected.actionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.paywall.official}
                </a>
              )}
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
            </>
          ) : (
            <div className="empty-state compact">
              <p>
                {localized(
                  locale,
                  "Selecciona una candidatura para ver su estado.",
                  "Select an application to view its status.",
                )}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
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
          {items.map((job) => (
            <article className="saved-card" key={job.id}>
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
            </article>
          ))}
        </div>
        {!loading && !items.length && (
          <div className="empty-state">
            <span>♡</span>
            <h2>{localized(locale, "No tienes guardados", "No saved jobs")}</h2>
            <p>
              {localized(
                locale,
                "Pulsa Guardar en el feed para añadir una oferta.",
                "Tap Save in the feed to add a job.",
              )}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationsView({
  user,
  locale,
}: {
  user: User | null;
  locale: DashboardLocale;
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
      application.events.map((event) => ({ ...event, job: application.job })),
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
          {events.map((event) => (
            <article key={event.id}>
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
                <small>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </small>
              </div>
              {!event.readAt && <i />}
            </article>
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
            <button>
              <span>
                {localized(
                  locale,
                  "Consentimiento de candidatura",
                  "Application consent",
                )}
              </span>
              <b>{profile?.automaticConsentAt ? "✓" : "›"}</b>
            </button>
            <button>
              <span>{localized(locale, "CV privado", "Private résumé")}</span>
              <b>{profile?.cvPath ? "✓" : "›"}</b>
            </button>
          </section>
        </div>
      </div>
    </>
  );
}

function CoverLetterView({
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
  const [motivation, setMotivation] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [achievement, setAchievement] = useState("");
  const [companyPreferences, setCompanyPreferences] = useState("");
  const [doNotMention, setDoNotMention] = useState("");
  const [tone, setTone] = useState<CoverLetterProfile["tone"]>("professional");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const cover = profile?.universal?.coverLetter;
    if (!cover) return;
    setMotivation(cover.motivation);
    setValueProposition(cover.valueProposition);
    setAchievement(cover.achievement);
    setCompanyPreferences(cover.companyPreferences);
    setDoNotMention(cover.doNotMention);
    setTone(cover.tone);
    setEnabled(cover.enabled);
  }, [profile]);
  if (!user)
    return (
      <SignInState
        locale={locale}
        title={localized(
          locale,
          "Inicia sesión para preparar tu carta con IA",
          "Sign in to prepare your AI cover letter",
        )}
      />
    );
  const fields = [
    motivation,
    valueProposition,
    achievement,
    companyPreferences,
  ];
  const percentage = Math.round(
    ((fields.filter((value) => value.trim()).length + (enabled ? 1 : 0)) / 5) *
      100,
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveCoverLetterProfile({
        enabled,
        motivation,
        valueProposition,
        achievement,
        companyPreferences,
        doNotMention,
        tone,
      });
      await onSaved();
      setMessage(
        localized(
          locale,
          "Base guardada. Se adaptará automáticamente a la próxima oferta.",
          "Profile saved. It will be adapted automatically to your next application.",
        ),
      );
    } catch (value) {
      setMessage(
        value instanceof Error
          ? value.message
          : localized(
              locale,
              "No pudimos guardar tus respuestas.",
              "We couldn’t save your answers.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <header className="view-header cover-letter-head">
        <div>
          <span className="overline">
            {localized(locale, "CARTA DE PRESENTACIÓN · IA", "AI COVER LETTER")}
          </span>
          <h1>
            {localized(
              locale,
              "Tu historia, adaptada a cada empresa.",
              "Your story, tailored to every company.",
            )}
          </h1>
          <p>
            {localized(
              locale,
              "Responde una vez. Landeo redacta una carta distinta al postularte.",
              "Answer once. Landeo writes a tailored letter for every application.",
            )}
          </p>
        </div>
        <div className="cover-letter-score">
          <strong>{percentage}%</strong>
          <span>{localized(locale, "preparada", "ready")}</span>
          <progress value={percentage} max="100" />
        </div>
      </header>
      <div className="cover-letter-layout">
        <form className="cover-letter-form" onSubmit={submit}>
          <div className="cover-letter-intro">
            <span>✦</span>
            <div>
              <strong>
                {localized(
                  locale,
                  "No necesitas escribir una carta completa",
                  "You don’t need to write a full cover letter",
                )}
              </strong>
              <p>
                {localized(
                  locale,
                  "Cuéntanos hechos reales. La IA decidirá qué información encaja con cada puesto.",
                  "Share real facts. AI will choose the information that fits each role.",
                )}
              </p>
            </div>
          </div>
          <label>
            <span>
              {localized(
                locale,
                "1. ¿Por qué estás buscando un nuevo trabajo?",
                "1. Why are you looking for a new job?",
              )}
            </span>
            <small>
              {localized(
                locale,
                "Tu motivación real: crecer, cambiar de sector, asumir más responsabilidad…",
                "Your real motivation: growth, a career change, more responsibility…",
              )}
            </small>
            <textarea
              required
              maxLength={1500}
              rows={4}
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              placeholder={localized(
                locale,
                "Ejemplo: Quiero un puesto donde pueda asumir más responsabilidad y trabajar en productos con impacto…",
                "Example: I want a role where I can take on more responsibility and work on meaningful products…",
              )}
            />
          </label>
          <label>
            <span>
              {localized(
                locale,
                "2. ¿Qué valor puedes aportar a un equipo?",
                "2. What value can you bring to a team?",
              )}
            </span>
            <small>
              {localized(
                locale,
                "Fortalezas, forma de trabajar y conocimientos que sí puedes demostrar.",
                "Strengths, ways of working and knowledge you can demonstrate.",
              )}
            </small>
            <textarea
              required
              maxLength={1500}
              rows={4}
              value={valueProposition}
              onChange={(event) => setValueProposition(event.target.value)}
              placeholder={localized(
                locale,
                "Ejemplo: Destaco convirtiendo problemas ambiguos en planes claros y colaborando con equipos distintos…",
                "Example: I’m good at turning ambiguous problems into clear plans and working across teams…",
              )}
            />
          </label>
          <label>
            <span>
              {localized(
                locale,
                "3. Cuéntanos un logro profesional real",
                "3. Tell us about a real professional achievement",
              )}
            </span>
            <small>
              {localized(
                locale,
                "Incluye contexto, lo que hiciste y el resultado. No inventaremos métricas.",
                "Include the context, what you did and the result. We won’t invent metrics.",
              )}
            </small>
            <textarea
              required
              maxLength={1500}
              rows={4}
              value={achievement}
              onChange={(event) => setAchievement(event.target.value)}
              placeholder={localized(
                locale,
                "Ejemplo: Organicé el lanzamiento de… y conseguí…",
                "Example: I organized the launch of… and achieved…",
              )}
            />
          </label>
          <label>
            <span>
              {localized(
                locale,
                "4. ¿Qué buscas en una empresa o equipo?",
                "4. What are you looking for in a company or team?",
              )}
            </span>
            <small>
              {localized(
                locale,
                "Cultura, misión, producto, sector o manera de trabajar.",
                "Culture, mission, product, industry or ways of working.",
              )}
            </small>
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={companyPreferences}
              onChange={(event) => setCompanyPreferences(event.target.value)}
              placeholder={localized(
                locale,
                "Ejemplo: Equipos pequeños, autonomía, feedback frecuente y una misión clara…",
                "Example: Small teams, autonomy, frequent feedback and a clear mission…",
              )}
            />
          </label>
          <label>
            <span>
              {localized(
                locale,
                "5. ¿Hay algo que no debamos mencionar?",
                "5. Is there anything we should not mention?",
              )}
            </span>
            <small>
              {localized(
                locale,
                "Opcional. Por ejemplo, un cambio de sector o una situación personal.",
                "Optional. For example, a career change or personal circumstance.",
              )}
            </small>
            <textarea
              maxLength={700}
              rows={3}
              value={doNotMention}
              onChange={(event) => setDoNotMention(event.target.value)}
              placeholder={localized(locale, "Opcional", "Optional")}
            />
          </label>
          <fieldset className="tone-picker">
            <legend>
              {localized(locale, "Tono de la carta", "Cover letter tone")}
            </legend>
            {(locale === "es"
              ? [
                  ["professional", "Profesional", "Formal y seguro"],
                  ["warm", "Cercano", "Humano y entusiasta"],
                  ["direct", "Directo", "Breve y orientado a resultados"],
                ]
              : [
                  ["professional", "Professional", "Formal and confident"],
                  ["warm", "Warm", "Human and enthusiastic"],
                  ["direct", "Direct", "Brief and results-focused"],
                ]
            ).map(([value, label, detail]) => (
              <button
                type="button"
                key={value}
                className={tone === value ? "active" : ""}
                onClick={() => setTone(value as CoverLetterProfile["tone"])}
              >
                <b>{label}</b>
                <small>{detail}</small>
              </button>
            ))}
          </fieldset>
          <label
            className="ai-consent"
            aria-label={localized(
              locale,
              "Generar una carta automáticamente al postularme",
              "Generate a cover letter automatically when I apply",
            )}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>
              <strong>
                {localized(
                  locale,
                  "Generar una carta automáticamente al postularme",
                  "Generate a cover letter automatically when I apply",
                )}
              </strong>
              <small>
                {localized(
                  locale,
                  "Se enviarán a la IA solo estas respuestas y los datos relevantes de la oferta. Puedes desactivarlo cuando quieras.",
                  "Only these answers and relevant job details will be sent to AI. You can turn this off at any time.",
                )}
              </small>
            </span>
          </label>
          {message && (
            <p
              className={
                /guardada|saved/i.test(message) ? "form-success" : "form-error"
              }
              role="status"
            >
              {message}
            </p>
          )}
          <div className="cover-letter-actions">
            <span>
              {percentage === 100
                ? localized(
                    locale,
                    "Todo listo para personalizar.",
                    "Everything is ready for personalization.",
                  )
                : localized(
                    locale,
                    "Completa las cuatro respuestas y activa la generación.",
                    "Complete the four answers and enable generation.",
                  )}
            </span>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? localized(locale, "Guardando…", "Saving…")
                : localized(locale, "Guardar mi base →", "Save my profile →")}
            </button>
          </div>
        </form>
        <aside className="cover-letter-explainer">
          <div className="ai-orbit">
            <span>✦</span>
            <i />
            <i />
            <i />
          </div>
          <span className="overline">
            {localized(locale, "CÓMO FUNCIONA", "HOW IT WORKS")}
          </span>
          <h2>
            {localized(
              locale,
              "No guardamos una carta genérica.",
              "We don’t store a generic cover letter.",
            )}
          </h2>
          <p>
            {localized(
              locale,
              "Cuando eliges una oferta, el servidor combina tu historia con el puesto y la empresa. La carta se crea en ese momento y queda asociada a esa candidatura.",
              "When you choose a job, the server combines your story with the role and company. The letter is created then and attached to that application.",
            )}
          </p>
          <ol>
            <li>
              <b>01</b>
              <span>
                <strong>
                  {localized(locale, "Lee la oferta", "Reads the job")}
                </strong>
                {localized(
                  locale,
                  "Identifica responsabilidades y requisitos reales.",
                  "Identifies real responsibilities and requirements.",
                )}
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>
                  {localized(
                    locale,
                    "Selecciona tu evidencia",
                    "Selects your evidence",
                  )}
                </strong>
                {localized(
                  locale,
                  "Usa únicamente lo que has escrito aquí y en tu perfil.",
                  "Uses only what you wrote here and in your profile.",
                )}
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>
                  {localized(
                    locale,
                    "Redacta y adjunta",
                    "Writes and attaches",
                  )}
                </strong>
                {localized(
                  locale,
                  "La envía cuando el canal admite carta, o la deja lista para copiar.",
                  "Sends it when the channel supports a letter, or leaves it ready to copy.",
                )}
              </span>
            </li>
          </ol>
          <div className="cover-letter-guardrail">
            <b>✓</b>
            <p>
              <strong>
                {localized(locale, "Sin invenciones", "No fabrication")}
              </strong>
              {localized(
                locale,
                "Landeo omite lo que no sabe. No crea empresas, títulos, habilidades ni resultados.",
                "Landeo omits what it doesn’t know. It never invents companies, titles, skills or results.",
              )}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
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
  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        <nav className="block-nav">
          {(locale === "es"
            ? [
                "Identidad y contacto",
                "CV privado",
                "Autorización laboral",
                "Consentimientos",
              ]
            : [
                "Identity and contact",
                "Private résumé",
                "Work authorization",
                "Consents",
              ]
          ).map((label, index) => (
            <button key={label} className={index === 0 ? "done" : ""}>
              <i>{index + 1}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <form className="profile-form" onSubmit={submit}>
          <span className="overline">
            {localized(
              locale,
              "DATOS MÍNIMOS PARA POSTULARTE",
              "MINIMUM APPLICATION DETAILS",
            )}
          </span>
          <h2>
            {localized(
              locale,
              "Prepara tu candidatura",
              "Prepare your application",
            )}
          </h2>
          <p>
            {localized(
              locale,
              "El servidor volverá a validar cada campo antes de enviar.",
              "The server validates every field again before submission.",
            )}
          </p>
          <div className="form-grid">
            <label>
              {localized(locale, "Nombre", "First name")}
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "Apellidos", "Last name")}
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "Teléfono", "Phone")}
              <input
                required
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "Ciudad", "City")}
              <input
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "País", "Country")}
              <input
                required
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "Puesto actual", "Current role")}
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </label>
            <label>
              {localized(locale, "Autorización laboral", "Work authorization")}
              <input
                required
                value={authorization}
                onChange={(event) => setAuthorization(event.target.value)}
              />
            </label>
            <label className="full">
              {localized(
                locale,
                "CV privado · PDF, DOC o DOCX · máximo 8 MB",
                "Private résumé · PDF, DOC or DOCX · 8 MB maximum",
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setCv(event.target.files?.[0] ?? null)}
              />
              <small>
                {cv?.name ||
                  profile?.cvPath?.split("/").pop() ||
                  localized(
                    locale,
                    "Aún no has subido un CV",
                    "No résumé uploaded yet",
                  )}
              </small>
            </label>
          </div>
          <div className="consent-box">
            <label
              aria-label={localized(
                locale,
                "Consentimiento de privacidad",
                "Privacy consent",
              )}
            >
              <input
                type="checkbox"
                checked={privacy}
                onChange={(event) => setPrivacy(event.target.checked)}
              />
              <span>
                <strong>
                  {localized(
                    locale,
                    "Consentimiento de privacidad",
                    "Privacy consent",
                  )}
                </strong>
                <small>
                  {localized(
                    locale,
                    "Autorizo el tratamiento de mis datos para gestionar candidaturas.",
                    "I authorize the processing of my information to manage applications.",
                  )}
                </small>
              </span>
            </label>
            <label
              aria-label={localized(
                locale,
                "Autorización de candidatura automática",
                "Automatic application authorization",
              )}
            >
              <input
                type="checkbox"
                checked={automatic}
                onChange={(event) => setAutomatic(event.target.checked)}
              />
              <span>
                <strong>
                  {localized(
                    locale,
                    "Autorización de candidatura automática",
                    "Automatic application authorization",
                  )}
                </strong>
                <small>
                  {localized(
                    locale,
                    "Solo se utiliza cuando expreso intención con un swipe derecho.",
                    "Used only when I express intent with a right swipe.",
                  )}
                </small>
              </span>
            </label>
          </div>
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
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? localized(locale, "Guardando…", "Saving…")
                : localized(locale, "Guardar perfil →", "Save profile →")}
            </button>
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
