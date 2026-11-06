import { Suspense, useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { motion, useReducedMotion } from "framer-motion";
import { pageVariants } from "@/lib/motion";
import { ErrorBoundary } from "@/components/error-boundary";
import { M3Button } from "@/components/m3/button";
import { M3Spinner } from "@/components/m3/spinner";
import { Menu } from "lucide-react";
import { NavDrawer } from "@/components/admin/nav-drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AdminFiltersProvider } from "@/contexts/admin-filters-context";
import { TutorialProvider } from "@/contexts/tutorial-context";
import { TutorialOverlay } from "@/components/admin/tutorial";

const routeLoadingFallback = (
  <div
    className="flex items-center justify-center py-24"
    role="status"
    aria-label="Loading page"
  >
    <M3Spinner size="lg" />
  </div>
);

// React.lazy caches a rejected import, so recovery needs a full reload.
const routeErrorFallback = (
  <div
    role="alert"
    className="rounded-2xl p-4 flex items-center justify-between gap-4"
    style={{
      background: "var(--md-sys-color-error-container)",
      color: "var(--md-sys-color-on-error-container)",
    }}
  >
    <p className="text-body-medium">This page could not be loaded.</p>
    <M3Button variant="tonal" onPress={() => window.location.reload()}>
      Reload
    </M3Button>
  </div>
);

export default function AdminLayout() {
  const { isLoaded, userId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const handleMenuToggle = useCallback(() => setDrawerOpen((p) => !p), []);
  const handleDrawerClose = useCallback(() => setDrawerOpen(false), []);

  // Close overlay when resizing to desktop
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  // Auth guard
  useEffect(() => {
    if (isLoaded && !userId) navigate("/sign-in", { replace: true });
  }, [isLoaded, userId, navigate]);

  // Body scroll lock for mobile drawer
  useEffect(() => {
    document.body.style.overflow = drawerOpen && !isDesktop ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, isDesktop]);

  if (!isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--md-sys-color-surface)" }}
      >
        <M3Spinner size="lg" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <TutorialProvider>
      <AdminFiltersProvider>
        <div
          className="flex h-screen overflow-hidden"
          style={{ background: "var(--md-sys-color-background)" }}
        >
          <NavDrawer isOpen={drawerOpen} onClose={handleDrawerClose} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Mobile hamburger — floating, top-left, hidden on desktop */}
            <button
              data-tutorial-id="hamburger-menu"
              className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-full shadow-elevation-2"
              onClick={handleMenuToggle}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="admin-nav-drawer"
              style={{
                background: "var(--md-sys-color-surface)",
                color: "var(--md-sys-color-on-surface)",
              }}
            >
              <Menu size={22} />
            </button>
            <main className="flex-1 overflow-y-auto">
              {/*
                The Suspense and error boundaries live below the shell on
                purpose: a route chunk that is slow or fails must not suspend
                or replace the drawer and the tour, which would leave the tour
                overlay on screen with no way to dismiss it.
              */}
              <motion.div
                key={pathname}
                variants={pageVariants}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                className="p-6 pt-16 lg:pt-6 min-h-full"
              >
                <ErrorBoundary fallback={routeErrorFallback}>
                  <Suspense fallback={routeLoadingFallback}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </main>
          </div>
          <TutorialOverlay />
        </div>
      </AdminFiltersProvider>
    </TutorialProvider>
  );
}
