import React from "react";

let mockIsSignedIn = false;

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) =>
    mockIsSignedIn ? <>{children}</> : null,
  SignedOut: ({ children }: { children: React.ReactNode }) =>
    mockIsSignedIn ? null : <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/gtag", () => ({
  event: vi.fn(),
}));

vi.mock("@heroui/navbar", () => ({
  Navbar: ({ children }: { children: React.ReactNode }) => (
    <nav>{children}</nav>
  ),
  NavbarBrand: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  NavbarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  NavbarItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  NavbarMenuToggle: () => <button />,
  NavbarMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  NavbarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@heroui/link", () => ({
  Link: ({
    children,
    href,
    onPress,
  }: {
    children: React.ReactNode;
    href: string;
    onPress?: () => void;
  }) => (
    <a href={href} onClick={onPress}>
      {children}
    </a>
  ),
  link: () => "",
}));

vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => <button onClick={onPress}>{children}</button>,
}));

vi.mock("@heroui/theme", () => ({
  link: () => "",
}));

vi.mock("@/components/theme-switch", () => ({
  ThemeSwitch: () => <div data-testid="theme-switch" />,
}));

vi.mock("@/config/site", () => ({
  siteConfig: {
    navItems: [
      { label: "Home", href: "/" },
      { label: "Changelog", href: "/changelog" },
      { label: "Usage", href: "/about" },
    ],
    navMenuItems: [
      { label: "Home", href: "/" },
      { label: "Changelog", href: "/changelog" },
      { label: "Usage", href: "/about" },
    ],
  },
}));

import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/navbar";

describe("Navbar", () => {
  beforeEach(() => {
    mockIsSignedIn = false;
    vi.clearAllMocks();
  });

  it("does not show Admin link when signed out", () => {
    mockIsSignedIn = false;
    render(<Navbar />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows Admin link when signed in", () => {
    mockIsSignedIn = true;
    render(<Navbar />);
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  it("does not show Edit Cards link for any user", () => {
    mockIsSignedIn = false;
    render(<Navbar />);
    expect(screen.queryByText("Edit Cards")).not.toBeInTheDocument();
  });

  it("does not show Categories link for any user", () => {
    mockIsSignedIn = false;
    render(<Navbar />);
    expect(screen.queryByText("Categories")).not.toBeInTheDocument();
  });

  it("shows Home, Changelog, and Usage for unauthenticated users", () => {
    mockIsSignedIn = false;
    render(<Navbar />);
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Changelog").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usage").length).toBeGreaterThan(0);
  });
});
