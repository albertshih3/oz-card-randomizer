let mockUserId: string | null = "user_123";
let mockIsLoaded = true;

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: mockIsLoaded, userId: mockUserId }),
  useUser: () => ({
    isLoaded: true,
    user: { publicMetadata: mockPublicMetadata },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
  UserButton: () => <div data-testid="user-button" />,
}));

let mockPublicMetadata: Record<string, unknown> = { approved: true };
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/admin", key: "default" }),
  Outlet: () => <div data-testid="outlet" />,
}));

vi.mock("@/components/admin/top-app-bar", () => ({
  TopAppBar: ({ title }: { title: string }) => (
    <div data-testid="top-app-bar">{title}</div>
  ),
}));

vi.mock("@/components/admin/nav-drawer", () => ({
  NavDrawer: () => <div data-testid="nav-drawer" />,
}));

vi.mock("@/components/m3/spinner", () => ({
  M3Spinner: () => <div data-testid="m3-spinner" />,
}));

vi.mock("@/lib/motion", () => ({
  pageVariants: {},
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { [key: string]: unknown }) => {
      const nonDom = new Set([
        "initial",
        "animate",
        "exit",
        "transition",
        "variants",
        "custom",
        "whileHover",
        "whileTap",
        "layout",
        "layoutId",
      ]);
      const filtered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (!nonDom.has(k)) filtered[k] = v;
      }
      return <div {...filtered}>{children}</div>;
    },
  },
}));

vi.mock("@/contexts/admin-filters-context", () => ({
  AdminFiltersProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAdminFiltersContext: () => ({
    filters: {
      selectedCategory: "all",
      viewMode: "table",
      searchQuery: "",
      statusFilter: "all",
    },
    setSelectedCategory: vi.fn(),
    setViewMode: vi.fn(),
    setSearchQuery: vi.fn(),
    setStatusFilter: vi.fn(),
    categoryRefreshKey: 0,
    bumpCategoryRefreshKey: vi.fn(),
  }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/layouts/admin";

beforeEach(() => {
  mockUserId = "user_123";
  mockIsLoaded = true;
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe("AdminLayout — OAK-53", () => {
  beforeEach(() => {
    mockPublicMetadata = { approved: true };
  });

  it("shows the not-approved state to a signed-in unapproved user", () => {
    mockPublicMetadata = {};
    render(<AdminLayout />);
    expect(screen.getByRole("alert")).toHaveTextContent("isn't approved");
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });

  it("redirects to /sign-in when userId is null", () => {
    mockUserId = null;
    render(<AdminLayout />);
    expect(mockNavigate).toHaveBeenCalledWith("/sign-in", { replace: true });
  });

  it("renders children when authenticated", () => {
    render(<AdminLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByTestId("nav-drawer")).toBeInTheDocument();
  });
});
