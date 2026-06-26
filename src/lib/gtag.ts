export const GA_TRACKING_ID = import.meta.env.VITE_GA_ID || "";

// Initialize gtag if it doesn't exist
export const initGtag = () => {
  if (typeof window !== "undefined" && !window.gtag && GA_TRACKING_ID) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args) {
      window.dataLayer.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_TRACKING_ID);
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: URL) => {
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
    window.gtag("config", GA_TRACKING_ID, {
      page_path: url.pathname,
      page_title: document.title,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/ga4/reference/events
export const event = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
    window.gtag("event", eventName, params);
  }
};

// Track performance timing. Replaces deprecated timing_complete with a custom event.
export const timing = (
  name: string,
  durationMs: number,
  extra?: Record<string, unknown>,
) => {
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
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
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
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
