"use client";

export type ProductEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export const PRODUCT_EVENT_NAME = "landeo:product-event";

declare global {
  interface Window {
    __landeoAnalyticsReady?: boolean;
    __landeoProductEvents?: Array<{
      name: string;
      properties: ProductEventProperties;
    }>;
  }
}

/**
 * Sends a privacy-safe product event to the consent-aware analytics bridge.
 * Never include names, email addresses, CV content, free text or job titles.
 */
export function trackProductEvent(
  name: string,
  properties: ProductEventProperties = {},
) {
  if (typeof window === "undefined") return;
  if (!window.__landeoAnalyticsReady) {
    window.__landeoProductEvents = window.__landeoProductEvents ?? [];
    window.__landeoProductEvents.push({ name, properties });
    if (window.__landeoProductEvents.length > 100) {
      window.__landeoProductEvents = window.__landeoProductEvents.slice(-100);
    }
    return;
  }
  window.dispatchEvent(
    new CustomEvent(PRODUCT_EVENT_NAME, {
      detail: { name, properties },
    }),
  );
}
