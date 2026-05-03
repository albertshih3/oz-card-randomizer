import { Menu } from "lucide-react";

interface TopAppBarProps {
  title: string;
  onMenuToggle: () => void;
  isDrawerOpen: boolean;
}

export function TopAppBar({
  title,
  onMenuToggle,
  isDrawerOpen,
}: TopAppBarProps) {
  return (
    <header className="h-16 sticky top-0 z-30 flex items-center px-4 gap-3">
      <button
        data-tutorial-id="hamburger-menu"
        className="lg:hidden p-2 rounded-full hover:opacity-80 transition-opacity"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
        aria-expanded={isDrawerOpen}
        aria-controls="admin-nav-drawer"
        style={{ color: "var(--md-sys-color-on-surface)" }}
      >
        <Menu size={24} />
      </button>

      <h1
        className="flex-1 text-title-large"
        style={{ color: "var(--md-sys-color-on-surface)" }}
      >
        {title}
      </h1>
    </header>
  );
}
