import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  drawerVariants,
  backdropVariants,
  accordionVariants,
} from "@/lib/motion";
import { Skeleton } from "@heroui/skeleton";
import {
  Users,
  BarChart2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RectangleVertical,
} from "lucide-react";
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
  cardsExpanded: boolean;
  onToggleCards: () => void;
}

function DrawerContent({
  onClose,
  categories,
  isLoading,
  pathname,
  selectedCategory,
  onCategorySelect,
  onNavigate,
  cardsExpanded,
  onToggleCards,
}: DrawerContentProps) {
  const isCardsPage = pathname === "/admin";

  const handleCardsClick = () => {
    const isAllAndOnAdmin = selectedCategory === "all" && isCardsPage;
    if (isAllAndOnAdmin) {
      // Already viewing "all" on /admin — just toggle expand/collapse
      onToggleCards();
    } else {
      // Navigate to "all" and expand to show sub-items
      onCategorySelect("all");
      onClose();
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId);
    onClose();
  };

  const handleNavClick = (href: string) => {
    onNavigate(href);
    onClose();
  };

  const ChevronIcon = cardsExpanded ? ChevronDown : ChevronRight;

  return (
    <nav className="flex flex-col flex-1 overflow-y-auto px-3 py-2">
      <button
        onClick={handleCardsClick}
        aria-current={
          isCardsPage && selectedCategory === "all" ? "page" : undefined
        }
        aria-expanded={cardsExpanded}
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
        <RectangleVertical size={18} />
        Cards
        <ChevronIcon size={16} className="ml-auto" />
      </button>

      <AnimatePresence initial={false}>
        {cardsExpanded && (
          <motion.div
            key="category-list"
            variants={accordionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
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
                    isCardsPage && selectedCategory === cat.name
                      ? "page"
                      : undefined
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
          </motion.div>
        )}
      </AnimatePresence>

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

      <button
        onClick={() => handleNavClick("/admin/analytics")}
        aria-current={pathname === "/admin/analytics" ? "page" : undefined}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-sm transition-colors"
        style={
          pathname === "/admin/analytics"
            ? {
                background: "var(--md-sys-color-secondary-container)",
                color: "var(--md-sys-color-on-secondary-container)",
              }
            : {
                color: "var(--md-sys-color-on-surface-variant)",
              }
        }
      >
        <BarChart2 size={18} />
        Analytics
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
  const [cardsExpanded, setCardsExpanded] = useState(false);

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
    setCardsExpanded(true);
    if (pathname !== "/admin") {
      navigate("/admin");
    }
  };

  const handleToggleCards = () => {
    setCardsExpanded((prev) => !prev);
  };

  const contentProps: DrawerContentProps = {
    onClose,
    categories,
    isLoading,
    pathname,
    selectedCategory: filters.selectedCategory,
    onCategorySelect: handleCategorySelect,
    onNavigate: navigate,
    cardsExpanded,
    onToggleCards: handleToggleCards,
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
          <button
            onClick={() => navigate("/")}
            aria-label="Go to public site"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src="/csclogo.svg" alt="Oakland Zoo" className="h-8 w-auto" />
          </button>
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
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              key="admin-drawer-panel"
              id="admin-nav-drawer"
              className="fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col lg:hidden shadow-elevation-2"
              style={{ background: "var(--md-sys-color-surface)" }}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="h-16 flex items-center px-4 shrink-0">
                <button
                  onClick={() => {
                    navigate("/");
                    onClose();
                  }}
                  aria-label="Go to public site"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src="/csclogo.svg"
                    alt="Oakland Zoo"
                    className="h-8 w-auto"
                  />
                </button>
              </div>
              <DrawerContent {...contentProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
