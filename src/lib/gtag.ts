export const GA_TRACKING_ID = process.env.VITE_GA_ID || '';

// Initialize gtag if it doesn't exist
export const initGtag = () => {
  if (typeof window !== 'undefined' && !window.gtag && GA_TRACKING_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID);
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: URL) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url.pathname,
      page_title: document.title,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track timing events (e.g., how long it takes to generate a pack)
export const timing = ({
  name,
  value,
  category = 'performance',
  label,
}: {
  name: string;
  value: number;
  category?: string;
  label?: string;
}) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('event', 'timing_complete', {
      name,
      value,
      event_category: category,
      event_label: label,
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
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('event', 'exception', {
      description,
      fatal,
    });
  }
};

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}