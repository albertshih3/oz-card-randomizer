import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { M3Spinner } from "@/components/m3/spinner";
import { TopAppBar } from "@/components/admin/top-app-bar";
import { NavDrawer } from "@/components/admin/nav-drawer";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Cards",
  "/admin/users": "Users",
};

export default function AdminLayout() {
  const { isLoaded, userId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const title = ROUTE_TITLES[pathname] ?? "Admin";

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
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--md-sys-color-background)" }}
    >
      <NavDrawer isOpen={drawerOpen} onClose={handleDrawerClose} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopAppBar
          title={title}
          onMenuToggle={handleMenuToggle}
          isDrawerOpen={drawerOpen}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
