let mockUserId: string | null = "user_123";
let mockIsLoaded = true;

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isLoaded: mockIsLoaded, userId: mockUserId }),
  UserButton: () => <div data-testid="user-button" />,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/admin" }),
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
  it("redirects to /sign-in when userId is null", () => {
    mockUserId = null;
    render(<AdminLayout />);
    expect(mockNavigate).toHaveBeenCalledWith("/sign-in", { replace: true });
  });

  it("renders children when authenticated", () => {
    render(<AdminLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByTestId("top-app-bar")).toBeInTheDocument();
    expect(screen.getByTestId("nav-drawer")).toBeInTheDocument();
  });
});
