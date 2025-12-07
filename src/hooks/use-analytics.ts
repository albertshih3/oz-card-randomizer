import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageview, event } from "@/lib/gtag";

export const usePageView = () => {
  const location = useLocation();

  useEffect(() => {
    const url = new URL(window.location.href);
    pageview(url);

    // Track page visits
    event({
      action: "page_view",
      category: "navigation",
      label: location.pathname,
    });
  }, [location]);
};

export const useAnalytics = () => {
  const trackEvent = (
    action: string,
    category: string,
    label?: string,
    value?: number,
  ) => {
    event({
      action,
      category,
      label,
      value,
    });
  };

  const trackButtonClick = (buttonName: string, page?: string) => {
    trackEvent("click", "button", `${page ? `${page}_` : ""}${buttonName}`);
  };

  const trackFormSubmission = (formName: string, success: boolean = true) => {
    trackEvent(success ? "submit_success" : "submit_error", "form", formName);
  };

  const trackUserAction = (action: string, details?: string) => {
    trackEvent(action, "user_action", details);
  };

  return {
    trackEvent,
    trackButtonClick,
    trackFormSubmission,
    trackUserAction,
  };
};
