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
  Tag,
  Sun,
  Moon,
  HelpCircle,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/use-theme";
import { useTutorial } from "@/contexts/tutorial-context";
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
  const { isDark, toggleTheme } = useTheme();
  const { isActive, startTutorial } = useTutorial();

  const handleCardsClick = () => {
    const isAllAndOnAdmin = selectedCategory === "all" && isCardsPage;
    if (isAllAndOnAdmin) {
      onToggleCards();
    } else {
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

  const navItemStyle = (active: boolean): React.CSSProperties =>
    active
      ? {
          background: "var(--md-sys-color-secondary-container)",
          color: "var(--md-sys-color-on-secondary-container)",
        }
      : { color: "var(--md-sys-color-on-surface-variant)" };

  return (
    <nav className="flex flex-col flex-1 overflow-y-auto px-3 py-2">
      {/* Cards + categories */}
      <button
        onClick={handleCardsClick}
        aria-current={
          isCardsPage && selectedCategory === "all" ? "page" : undefined
        }
        aria-expanded={cardsExpanded}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
        style={navItemStyle(isCardsPage && selectedCategory === "all")}
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
            <div className="ml-6 my-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-9 w-full rounded-xl my-1 ml-1" />
                  <Skeleton className="h-9 w-full rounded-xl my-1 ml-1" />
                  <Skeleton className="h-9 w-full rounded-xl my-1 ml-1" />
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
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-body-medium transition-colors pl-3"
                    style={navItemStyle(
                      isCardsPage && selectedCategory === cat.name,
                    )}
                  >
                    {cat.displayName}
                  </button>
                ))
              )}
            </div>
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
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
        style={navItemStyle(pathname === "/admin/users")}
      >
        <Users size={18} />
        Users
      </button>

      <button
        onClick={() => handleNavClick("/admin/categories")}
        aria-current={pathname === "/admin/categories" ? "page" : undefined}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
        style={navItemStyle(pathname === "/admin/categories")}
      >
        <Tag size={18} />
        Categories
      </button>

      <button
        onClick={() => handleNavClick("/admin/analytics")}
        aria-current={pathname === "/admin/analytics" ? "page" : undefined}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
        style={navItemStyle(pathname === "/admin/analytics")}
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
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        <ExternalLink size={18} />
        Public Site
      </button>

      {/* Bottom actions */}
      <div className="mt-auto flex flex-col">
        {!isActive && (
          <button
            onClick={() => {
              startTutorial();
              onClose();
            }}
            aria-label="Take a tour"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            <HelpCircle size={18} />
            Take a tour
          </button>
        )}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left text-label-large transition-colors"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? "Light mode" : "Dark mode"}
        </button>
      </div>
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
  const [cardsExpanded, setCardsExpanded] = useState(true);

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
    if (pathname !== "/admin") navigate("/admin");
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
    onToggleCards: () => setCardsExpanded((prev) => !prev),
  };

  const DrawerHeader = ({ onLogoClick }: { onLogoClick: () => void }) => (
    <div className="h-16 flex items-center justify-between px-4 shrink-0">
      <button
        onClick={onLogoClick}
        aria-label="Go to public site"
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img src="/csclogo.svg" alt="Oakland Zoo" className="h-8 w-auto" />
      </button>
      <UserButton />
    </div>
  );

  return (
    <>
      {/* Desktop permanent drawer — floating card style */}
      <aside
        data-tutorial-id="nav-drawer"
        className="hidden lg:flex flex-col w-64 shrink-0 m-3 rounded-3xl overflow-hidden"
        style={{
          background: "var(--md-sys-color-surface)",
          border: "1px solid var(--md-sys-color-outline-variant)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        <DrawerHeader onLogoClick={() => navigate("/")} />
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
              data-tutorial-id="nav-drawer"
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
              <DrawerHeader
                onLogoClick={() => {
                  navigate("/");
                  onClose();
                }}
              />
              <DrawerContent {...contentProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
