import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageview } from "@/lib/gtag";

export const usePageView = () => {
  const location = useLocation();

  useEffect(() => {
    const url = new URL(window.location.href);
    pageview(url);
  }, [location]);
};
