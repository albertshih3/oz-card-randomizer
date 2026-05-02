import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import { pageVariants } from "@/lib/motion";
import { M3Spinner } from "@/components/m3/spinner";
import { Menu } from "lucide-react";
import { NavDrawer } from "@/components/admin/nav-drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AdminFiltersProvider } from "@/contexts/admin-filters-context";
import { TutorialProvider } from "@/contexts/tutorial-context";
import { TutorialOverlay } from "@/components/admin/tutorial";

export default function AdminLayout() {
  const { isLoaded, userId } = useAuth();
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={locationKey}
                  variants={pageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-6 pt-16 lg:pt-6 min-h-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          <TutorialOverlay />
        </div>
      </AdminFiltersProvider>
    </TutorialProvider>
  );
}
