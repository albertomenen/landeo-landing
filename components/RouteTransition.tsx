"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 180;
const SAFETY_TIMEOUT_MS = 12_000;

export default function RouteTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <RouteTransitionController key={`${pathname}?${searchParams.toString()}`} />;
}

function RouteTransitionController() {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState<"es" | "en">("es");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      showTimer.current = null;
      safetyTimer.current = null;
    };
    const finish = () => {
      clearTimers();
      setPending(false);
      setVisible(false);
    };
    const start = () => {
      clearTimers();
      setLocale(document.documentElement.lang.toLowerCase().startsWith("es") ? "es" : "en");
      setPending(true);
      showTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      safetyTimer.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
    };
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.dataset.noTransition === "true") return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      if (destination.pathname === current.pathname && destination.search === current.search) return;
      start();
    };
    const onHistory = () => {
      if (window.location.pathname.startsWith("/app/")) return;
      start();
    };
    const onPageShow = () => finish();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onHistory);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onHistory);
      window.removeEventListener("pageshow", onPageShow);
      clearTimers();
    };
  }, []);

  if (!pending) return null;
  const copy = locale === "es"
    ? { title: "Preparando tu siguiente vista", detail: "Actualizando oportunidades y progreso…" }
    : { title: "Preparing your next view", detail: "Updating opportunities and progress…" };

  return (
    <div className={`route-transition ${visible ? "is-visible" : "is-pending"}`} role="status" aria-live="polite" aria-label={copy.title}>
      <div className="route-progress" aria-hidden="true"><i /></div>
      <div className="route-transition-veil" aria-hidden={!visible}>
        <div className="route-transition-card">
          <div className="route-transition-mark" aria-hidden="true"><i /><i /><i /></div>
          <div>
            <strong>{copy.title}</strong>
            <span>{copy.detail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
