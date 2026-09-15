"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import type { DashboardLocale } from "../lib/dashboard-i18n";

type TourRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type TourStep = {
  selector?: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
};

const TOUR_VERSION = "landeo-dashboard-tour-v1";
const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const tourCopy = {
  es: {
    guide: "Guía",
    guideLabel: "Abrir guía del dashboard",
    close: "Cerrar guía",
    skip: "Saltar guía",
    previous: "Anterior",
    next: "Siguiente",
    finish: "Empezar",
    progress: (current: number, total: number) =>
      `Paso ${current} de ${total}`,
    steps: [
      {
        icon: "✦",
        eyebrow: "TU PRIMERA BÚSQUEDA",
        title: "Encuentra y solicita empleos en segundos",
        body: "Te enseñamos cómo decidir, guardar y postularte. Solo tardarás un minuto.",
      },
      {
        selector: '[data-tour="filters"]',
        icon: "⌕",
        eyebrow: "AFINA LOS RESULTADOS",
        title: "Empieza por tus preferencias",
        body: "Busca un cargo o empresa y filtra por país, modalidad y tipo de candidatura. En móvil puedes deslizar esta barra lateralmente.",
      },
      {
        selector: '[data-tour="job-card"]',
        icon: "↔",
        eyebrow: "REVISA LA OFERTA",
        title: "Todo lo importante, en una tarjeta",
        body: "Comprueba puesto, ubicación, salario y afinidad. Desliza a la izquierda para pasar o a la derecha para postularte.",
      },
      {
        selector: '[data-tour="application-channel"]',
        icon: "✓",
        eyebrow: "CANAL TRANSPARENTE",
        title: "Mira cómo se completará",
        body: "Automática significa que Landeo puede enviarla por un canal autorizado; asistida puede pedirte un dato; externa termina en la web oficial.",
      },
      {
        selector: '[data-tour="pass-action"]',
        icon: "×",
        eyebrow: "NO ME INTERESA",
        title: "Pasa sin perder tiempo",
        body: "Descarta la oferta y Landeo mostrará inmediatamente la siguiente. También puedes deslizar hacia la izquierda.",
      },
      {
        selector: '[data-tour="save-action"]',
        icon: "♡",
        eyebrow: "PARA MÁS TARDE",
        title: "Guarda las que quieras revisar",
        body: "Las ofertas guardadas quedan reunidas en tu sección Guardados para volver a ellas cuando quieras.",
      },
      {
        selector: '[data-tour="apply-action"]',
        icon: "→",
        eyebrow: "LISTO PARA AVANZAR",
        title: "Postúlate con un toque",
        body: "Landeo registra tu intención, muestra confeti y carga la siguiente oferta. El estado solo será “Enviada” cuando el canal confirme la entrega.",
      },
      {
        selector: '[data-tour="applications-nav"]',
        icon: "↗",
        eyebrow: "SIGUE EL PROGRESO",
        title: "Consulta cada candidatura",
        body: "En Candidaturas verás cuáles están en cola, enviadas, requieren una acción o han avanzado a entrevista.",
      },
    ] satisfies TourStep[],
  },
  en: {
    guide: "Guide",
    guideLabel: "Open dashboard guide",
    close: "Close guide",
    skip: "Skip guide",
    previous: "Back",
    next: "Next",
    finish: "Get started",
    progress: (current: number, total: number) =>
      `Step ${current} of ${total}`,
    steps: [
      {
        icon: "✦",
        eyebrow: "YOUR FIRST SEARCH",
        title: "Find and apply to jobs in seconds",
        body: "Here’s how to decide, save and apply. It only takes a minute.",
      },
      {
        selector: '[data-tour="filters"]',
        icon: "⌕",
        eyebrow: "REFINE YOUR RESULTS",
        title: "Start with your preferences",
        body: "Search by role or company, then filter by market, work setup and application type. On mobile, swipe this bar sideways.",
      },
      {
        selector: '[data-tour="job-card"]',
        icon: "↔",
        eyebrow: "REVIEW THE ROLE",
        title: "Everything important, in one card",
        body: "Check the role, location, salary and match. Swipe left to pass or right to apply.",
      },
      {
        selector: '[data-tour="application-channel"]',
        icon: "✓",
        eyebrow: "A CLEAR CHANNEL",
        title: "See how it will be completed",
        body: "Automatic means Landeo can submit through an authorized channel; assisted may need one detail from you; external finishes on the official site.",
      },
      {
        selector: '[data-tour="pass-action"]',
        icon: "×",
        eyebrow: "NOT FOR ME",
        title: "Pass without wasting time",
        body: "Dismiss the role and Landeo immediately shows the next one. You can also swipe left.",
      },
      {
        selector: '[data-tour="save-action"]',
        icon: "♡",
        eyebrow: "KEEP IT FOR LATER",
        title: "Save roles you want to revisit",
        body: "Saved roles stay together in your Saved section, ready whenever you want to return.",
      },
      {
        selector: '[data-tour="apply-action"]',
        icon: "→",
        eyebrow: "READY TO MOVE",
        title: "Apply with one tap",
        body: "Landeo records your intent, celebrates it and loads the next role. A status only becomes “Sent” after the channel confirms delivery.",
      },
      {
        selector: '[data-tour="applications-nav"]',
        icon: "↗",
        eyebrow: "TRACK YOUR PROGRESS",
        title: "Follow every application",
        body: "Applications shows what is queued, sent, waiting for your action or moving forward to an interview.",
      },
    ] satisfies TourStep[],
  },
};

function visibleTarget(selector?: string) {
  if (!selector) return null;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.top < window.innerHeight &&
        style.visibility !== "hidden"
      );
    },
  );
}

export function DashboardTour({
  locale,
  enabled,
  identityKey,
}: {
  locale: DashboardLocale;
  enabled: boolean;
  identityKey: string;
}) {
  const copy = tourCopy[locale];
  const steps = copy.steps;
  const storageKey = `${TOUR_VERSION}:${identityKey}`;
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);
  const checkedKey = useRef("");
  const panelRef = useRef<HTMLDivElement>(null);
  const step = steps[index];

  useEffect(() => {
    if (!mounted || !enabled || checkedKey.current === storageKey) return;
    checkedKey.current = storageKey;
    if (window.localStorage.getItem(storageKey) === "complete") return;
    const timer = window.setTimeout(() => {
      setIndex(0);
      setOpen(true);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [enabled, mounted, storageKey]);

  const measure = useCallback(() => {
    const target = visibleTarget(step.selector);
    if (!target) {
      setTargetRect(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    });
  }, [step.selector]);

  useEffect(() => {
    if (!open) return;
    const target = visibleTarget(step.selector);
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
      inline: "center",
    });
    const firstMeasure = window.requestAnimationFrame(measure);
    const delayedMeasure = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      window.cancelAnimationFrame(firstMeasure);
      window.clearTimeout(delayedMeasure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, open, step.selector]);

  const complete = useCallback(() => {
    window.localStorage.setItem(storageKey, "complete");
    setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") complete();
      if (event.key === "ArrowRight")
        setIndex((current) => Math.min(current + 1, steps.length - 1));
      if (event.key === "ArrowLeft")
        setIndex((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [complete, open, steps.length]);

  const panelPosition = useMemo(() => {
    if (!targetRect) return undefined;
    const width = Math.min(370, window.innerWidth - 32);
    const left = Math.max(
      16,
      Math.min(targetRect.left + targetRect.width / 2 - width / 2, window.innerWidth - width - 16),
    );
    const placeAbove = targetRect.bottom + 300 > window.innerHeight && targetRect.top > 300;
    return {
      "--tour-left": `${left}px`,
      "--tour-top": placeAbove
        ? `${Math.max(16, targetRect.top - 274)}px`
        : `${Math.min(window.innerHeight - 274, targetRect.bottom + 16)}px`,
      "--tour-width": `${width}px`,
    } as CSSProperties;
  }, [targetRect]);

  if (!mounted || !enabled) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {!open && (
          <m.button
            className="dashboard-tour-help"
            type="button"
            aria-label={copy.guideLabel}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
          >
            <span>?</span>
            {copy.guide}
          </m.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <div className="dashboard-tour-layer">
            <div className={`dashboard-tour-guard ${targetRect ? "" : "is-full"}`} />
            {targetRect && (
              <m.div
                className="dashboard-tour-spotlight"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  top: Math.max(8, targetRect.top - 7),
                  left: Math.max(8, targetRect.left - 7),
                  width: Math.min(window.innerWidth - 16, targetRect.width + 14),
                  height: targetRect.height + 14,
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              />
            )}
            <m.div
              key={index}
              ref={panelRef}
              className={`dashboard-tour-card ${targetRect ? "is-anchored" : "is-centered"}`}
              style={panelPosition}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-tour-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="dashboard-tour-top">
                <m.span
                  key={step.icon}
                  initial={{ rotate: -14, scale: 0.75 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                >
                  {step.icon}
                </m.span>
                <div>
                  <small>{step.eyebrow}</small>
                  <strong>{copy.progress(index + 1, steps.length)}</strong>
                </div>
                <button type="button" aria-label={copy.close} onClick={complete}>
                  ×
                </button>
              </div>
              <div className="dashboard-tour-progress" aria-hidden="true">
                {steps.map((_, position) => (
                  <m.i
                    key={position}
                    animate={{
                      scaleX: position <= index ? 1 : 0.3,
                      opacity: position <= index ? 1 : 0.36,
                    }}
                  />
                ))}
              </div>
              <h2 id="dashboard-tour-title">{step.title}</h2>
              <p>{step.body}</p>
              <div className="dashboard-tour-actions">
                <button type="button" className="tour-skip" onClick={complete}>
                  {copy.skip}
                </button>
                <div>
                  {index > 0 && (
                    <button
                      type="button"
                      className="tour-back"
                      onClick={() => setIndex((current) => current - 1)}
                    >
                      ← {copy.previous}
                    </button>
                  )}
                  <button
                    type="button"
                    className="tour-next"
                    onClick={() => {
                      if (index === steps.length - 1) complete();
                      else setIndex((current) => current + 1);
                    }}
                  >
                    {index === steps.length - 1 ? copy.finish : copy.next} →
                  </button>
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
