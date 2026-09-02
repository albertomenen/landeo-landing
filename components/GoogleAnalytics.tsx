"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
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

export default function GoogleAnalytics({
  measurementId,
  locale,
}: {
  measurementId?: string;
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
    if (!measurementId || consent !== "granted") return;
    startAnalytics(measurementId);
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [consent, measurementId, pathname]);

  if (!measurementId) return null;
  const activeMeasurementId = measurementId;

  const copy = locale === "es"
    ? {
        title: "Tu privacidad, bajo tu control",
        body: "Usamos Google Analytics para entender qué partes de Landeo resultan útiles. No cargaremos Analytics hasta que lo aceptes.",
        accept: "Aceptar analítica",
        reject: "Rechazar",
        privacy: "Política de privacidad",
        settings: "Cookies",
      }
    : {
        title: "Your privacy, under your control",
        body: "We use Google Analytics to understand which parts of Landeo are useful. Analytics will not load until you accept.",
        accept: "Accept analytics",
        reject: "Reject",
        privacy: "Privacy policy",
        settings: "Cookies",
      };

  function choose(nextConsent: AnalyticsConsent) {
    window.localStorage.setItem(CONSENT_KEY, nextConsent);
    setConsent(nextConsent);
    setPreferencesOpen(false);
    if (nextConsent === "denied") stopAnalytics(activeMeasurementId);
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
