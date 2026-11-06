/** The stream behind GA4_PROPERTY_ID, which feeds the admin dashboard. */
export const PRODUCTION_GA_ID = "G-Q4K84LKR3M";

const PRODUCTION_HOST = "ozboosterpacks.albertshih.org";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

/**
 * Picks the stream by where the app is running, so local testing can never
 * reach production numbers: the production site uses the production stream,
 * local development uses VITE_GA_ID, and anything else (previews) sends nothing.
 */
export const trackingIdFor = (hostname: string): string => {
  if (hostname === PRODUCTION_HOST) return PRODUCTION_GA_ID;
  if (!LOCAL_HOSTS.includes(hostname)) return "";
  const localId = import.meta.env.VITE_GA_ID || "";
  return localId === PRODUCTION_GA_ID ? "" : localId;
};

/** The one GA initializer. */
export const initGtag = (hostname = window.location.hostname) => {
  const trackingId = trackingIdFor(hostname);
  if (!trackingId || typeof window.gtag === "function") return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag.js only processes Arguments objects. Pushing an array is silently
  // ignored, so this must not become a rest parameter.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments as unknown as unknown[]);
  };
  window.gtag("js", new Date());
  // SPA navigation is reported by pageview(), once per route.
  window.gtag("config", trackingId, { send_page_view: false });
};

// https://developers.google.com/analytics/devguides/collection/ga4/views
export const pageview = (url: URL) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_location: url.href,
      page_path: url.pathname,
      page_title: document.title,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/ga4/reference/events
export const event = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

// Track performance timing. Replaces deprecated timing_complete with a custom event.
export const timing = (
  name: string,
  durationMs: number,
  extra?: Record<string, unknown>,
) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "performance_timing", {
      timing_name: name,
      duration_ms: durationMs,
      ...extra,
    });
  }
};

// Track exceptions/errors
export const exception = ({
  description,
  fatal = false,
}: {
  description: string;
  fatal?: boolean;
}) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "exception", {
      description,
      fatal,
    });
  }
};

declare global {
  interface Window {
    gtag: (command: string, ...args: unknown[]) => void;
    dataLayer: unknown[][];
  }
}
