import { Menu, ArrowLeft } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

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
    <header
      className="h-16 sticky top-0 z-30 flex items-center px-4 gap-3 shadow-elevation-1"
      style={{ background: "var(--md-sys-color-surface)" }}
    >
      <button
        className="lg:hidden p-2 rounded-full hover:opacity-80 transition-opacity"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
        aria-expanded={isDrawerOpen}
        aria-controls="admin-nav-drawer"
        style={{ color: "var(--md-sys-color-on-surface)" }}
      >
        <Menu size={24} />
      </button>

      <img
        src="/csclogo.svg"
        alt="Oakland Zoo"
        className="h-8 w-auto lg:hidden"
      />

      <h1
        className="flex-1 text-title-large"
        style={{ color: "var(--md-sys-color-on-surface)" }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <UserButton />
        <a
          href="/"
          className="flex items-center gap-1 text-label-large hover:opacity-80 transition-opacity"
          style={{ color: "var(--md-sys-color-primary)" }}
        >
          <ArrowLeft size={16} />
          Back to site
        </a>
      </div>
    </header>
  );
}
