import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageview } from "@/lib/gtag";

export const usePageView = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    pageview(new URL(window.location.href));
  }, [pathname]);
};
