import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navigation</nav>,
}));

import DefaultLayout from "@/layouts/default";

describe("DefaultLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows a Version 3 announcement banner below the navbar", () => {
    render(
      <DefaultLayout>
        <p>Page content</p>
      </DefaultLayout>,
    );

    const banner = screen.getByRole("region", { name: /version 3/i });

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(banner).toHaveTextContent(/version 3/i);
    expect(banner).toHaveTextContent(/new version/i);
    expect(banner).toHaveClass("bg-[var(--md-sys-color-primary)]");
    expect(
      screen.getByRole("link", { name: /view changelog/i }),
    ).toHaveAttribute("href", "/changelog");
  });

  it("uses animated high-contrast controls in the Version 3 announcement", () => {
    render(
      <DefaultLayout>
        <p>Page content</p>
      </DefaultLayout>,
    );

    const changelogLink = screen.getByRole("link", {
      name: /view changelog/i,
    });
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });

    fireEvent.pointerDown(changelogLink);

    expect(changelogLink).toHaveStyle({ transform: "scale(0.97)" });
    expect(dismissButton).toHaveStyle({
      color: "var(--md-sys-color-on-primary)",
    });
  });

  it("lets users dismiss the Version 3 announcement banner", () => {
    render(
      <DefaultLayout>
        <p>Page content</p>
      </DefaultLayout>,
    );

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(
      screen.queryByRole("region", { name: /version 3/i }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("oz-version-3-banner-dismissed")).toBe("true");
  });

  it("keeps the Version 3 announcement hidden after dismissal", () => {
    localStorage.setItem("oz-version-3-banner-dismissed", "true");

    render(
      <DefaultLayout>
        <p>Page content</p>
      </DefaultLayout>,
    );

    expect(
      screen.queryByRole("region", { name: /version 3/i }),
    ).not.toBeInTheDocument();
  });
});
