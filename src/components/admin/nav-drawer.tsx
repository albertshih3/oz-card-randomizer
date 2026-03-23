import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@heroui/skeleton";
import { Users, ExternalLink } from "lucide-react";
import { getCategories } from "@/utils/categories";
import type { Category } from "@/utils/categories";
import { useAdminFiltersContext } from "@/contexts/admin-filters-context";

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawerContentProps {
  onClose: () => void;
  categories: Category[];
  isLoading: boolean;
  pathname: string;
  selectedCategory: string;
  onCategorySelect: (id: string) => void;
  onNavigate: (href: string) => void;
}

function DrawerContent({
  onClose,
  categories,
  isLoading,
  pathname,
  selectedCategory,
  onCategorySelect,
  onNavigate,
}: DrawerContentProps) {
  const isCardsPage = pathname === "/admin";

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId);
    onClose();
  };

  const handleNavClick = (href: string) => {
    onNavigate(href);
    onClose();
  };

  return (
    <nav className="flex flex-col flex-1 overflow-y-auto px-3 py-2">
      <button
        onClick={() => handleCategoryClick("all")}
        aria-current={
          isCardsPage && selectedCategory === "all" ? "page" : undefined
        }
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left font-semibold text-base transition-colors"
        style={
          isCardsPage && selectedCategory === "all"
            ? {
                background: "var(--md-sys-color-secondary-container)",
                color: "var(--md-sys-color-on-secondary-container)",
              }
            : {
                color: "var(--md-sys-color-on-surface-variant)",
              }
        }
      >
        Cards
      </button>

      {isLoading ? (
        <>
          <Skeleton className="h-10 w-full rounded-xl my-1" />
          <Skeleton className="h-10 w-full rounded-xl my-1" />
          <Skeleton className="h-10 w-full rounded-xl my-1" />
        </>
      ) : (
        categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.name)}
            aria-current={
              isCardsPage && selectedCategory === cat.name ? "page" : undefined
            }
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-sm transition-colors pl-6"
            style={
              isCardsPage && selectedCategory === cat.name
                ? {
                    background: "var(--md-sys-color-secondary-container)",
                    color: "var(--md-sys-color-on-secondary-container)",
                  }
                : { color: "var(--md-sys-color-on-surface-variant)" }
            }
          >
            {cat.displayName}
          </button>
        ))
      )}

      <hr
        className="my-2"
        style={{ borderColor: "var(--md-sys-color-outline-variant)" }}
      />

      <button
        onClick={() => handleNavClick("/admin/users")}
        aria-current={pathname === "/admin/users" ? "page" : undefined}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-sm transition-colors"
        style={
          pathname === "/admin/users"
            ? {
                background: "var(--md-sys-color-secondary-container)",
                color: "var(--md-sys-color-on-secondary-container)",
              }
            : {
                color: "var(--md-sys-color-on-surface-variant)",
              }
        }
      >
        <Users size={18} />
        Users
      </button>

      <hr
        className="my-2"
        style={{ borderColor: "var(--md-sys-color-outline-variant)" }}
      />

      <button
        onClick={() => handleNavClick("/")}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-sm transition-colors"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        <ExternalLink size={18} />
        Public Site
      </button>
    </nav>
  );
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { filters, setSelectedCategory, categoryRefreshKey } =
    useAdminFiltersContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCategories()
      .then((cats) => {
        if (!cancelled) {
          setCategories(cats);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("NavDrawer: failed to load categories", err);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryRefreshKey]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Ensure we're on the cards page when selecting a category
    if (pathname !== "/admin") {
      navigate("/admin");
    }
  };

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  const contentProps: DrawerContentProps = {
    onClose,
    categories,
    isLoading,
    pathname,
    selectedCategory: filters.selectedCategory,
    onCategorySelect: handleCategorySelect,
    onNavigate: handleNavigate,
  };

  return (
    <>
      {/* Desktop permanent drawer */}
      <aside
        className="hidden lg:flex flex-col w-64 h-full shrink-0"
        style={{
          background: "var(--md-sys-color-surface)",
          borderRight: "1px solid var(--md-sys-color-outline-variant)",
        }}
      >
        <div className="h-16 flex items-center px-4 shrink-0">
          <img src="/csclogo.svg" alt="Oakland Zoo" className="h-8 w-auto" />
        </div>
        <DrawerContent {...contentProps} onClose={() => {}} />
      </aside>

      {/* Mobile overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="admin-drawer-backdrop"
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              key="admin-drawer-panel"
              id="admin-nav-drawer"
              className="fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col lg:hidden shadow-elevation-2"
              style={{ background: "var(--md-sys-color-surface)" }}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1.0] }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="h-16 flex items-center px-4 shrink-0">
                <img
                  src="/csclogo.svg"
                  alt="Oakland Zoo"
                  className="h-8 w-auto"
                />
              </div>
              <DrawerContent {...contentProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
