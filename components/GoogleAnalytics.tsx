"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AnalyticsConsent = "granted" | "denied";
type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    clarity?: ClarityFunction;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const CONSENT_KEY = "landeo-analytics-consent";

function startAnalytics(measurementId: string) {
  window[`ga-disable-${measurementId}`] = false;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (!document.querySelector(`script[data-landeo-ga="${measurementId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.landeoGa = measurementId;
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
  }
}

function stopAnalytics(measurementId: string) {
  window[`ga-disable-${measurementId}`] = true;
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function startClarity(projectId: string) {
  if (!window.clarity) {
    window.clarity = (...args: unknown[]) => {
      if (!window.clarity) return;
      window.clarity.q = window.clarity.q ?? [];
      window.clarity.q.push(args);
    };
  }

  window.clarity("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "granted",
  });

  if (!document.querySelector(`script[data-landeo-clarity="${projectId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
    script.dataset.landeoClarity = projectId;
    document.head.appendChild(script);
  }
}

function stopClarity() {
  window.clarity?.("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "denied",
  });
  window.clarity?.("consent", false);
}

function pageArea(pathname: string) {
  if (pathname.startsWith("/app")) return "dashboard";
  if (pathname === "/onboarding") return "onboarding";
  if (pathname === "/login" || pathname === "/signup") return "authentication";
  if (pathname === "/pricing") return "pricing";
  return "landing";
}

export default function GoogleAnalytics({
  measurementId,
  clarityId,
  locale,
}: {
  measurementId?: string;
  clarityId?: string;
  locale: "es" | "en";
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "granted" || saved === "denied") setConsent(saved);
  }, []);

  useEffect(() => {
    const shouldMask = pathname.startsWith("/app") || ["/onboarding", "/login", "/signup"].includes(pathname);
    if (shouldMask) document.body.setAttribute("data-clarity-mask", "true");
    else document.body.removeAttribute("data-clarity-mask");
    return () => document.body.removeAttribute("data-clarity-mask");
  }, [pathname]);

  useEffect(() => {
    if (consent !== "granted") return;
    if (measurementId) {
      startAnalytics(measurementId);
      window.gtag?.("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    if (clarityId) {
      startClarity(clarityId);
      window.clarity?.("set", "page_area", pageArea(pathname));
      window.clarity?.("set", "language", locale);
      window.clarity?.("event", "page_view");
    }
  }, [clarityId, consent, locale, measurementId, pathname]);

  if (!measurementId && !clarityId) return null;

  const copy = locale === "es"
    ? {
        title: "Tu privacidad, bajo tu control",
        body: "Usamos Google Analytics y Microsoft Clarity para entender qué partes de Landeo resultan útiles mediante estadísticas y grabaciones protegidas. No cargaremos estas herramientas hasta que lo aceptes.",
        accept: "Aceptar analítica",
        reject: "Rechazar",
        privacy: "Política de privacidad",
        settings: "Cookies",
      }
    : {
        title: "Your privacy, under your control",
        body: "We use Google Analytics and Microsoft Clarity to understand which parts of Landeo are useful through statistics and privacy-masked recordings. These tools will not load until you accept.",
        accept: "Accept analytics",
        reject: "Reject",
        privacy: "Privacy policy",
        settings: "Cookies",
      };

  function choose(nextConsent: AnalyticsConsent) {
    window.localStorage.setItem(CONSENT_KEY, nextConsent);
    setConsent(nextConsent);
    setPreferencesOpen(false);
    if (nextConsent === "denied") {
      if (measurementId) stopAnalytics(measurementId);
      if (clarityId) stopClarity();
    }
  }

  const showBanner = consent === null || preferencesOpen;

  return (
    <>
      {showBanner && (
        <section className="analytics-consent" role="dialog" aria-label={copy.title} aria-live="polite">
          <div>
            <strong>{copy.title}</strong>
            <p>{copy.body} <Link href="/privacy">{copy.privacy}</Link>.</p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" className="analytics-reject" onClick={() => choose("denied")}>{copy.reject}</button>
            <button type="button" className="analytics-accept" onClick={() => choose("granted")}>{copy.accept}</button>
          </div>
        </section>
      )}
      {consent !== null && !showBanner && (
        <button type="button" className="analytics-settings" onClick={() => setPreferencesOpen(true)}>{copy.settings}</button>
      )}
    </>
  );
}
