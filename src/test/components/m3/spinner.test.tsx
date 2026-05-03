import { render, screen } from "@testing-library/react";
import { M3Spinner } from "@/components/m3/spinner";

describe("M3Spinner", () => {
  it("renders without throwing", () => {
    render(<M3Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label=Loading for screen readers", () => {
    render(<M3Spinner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("renders with size sm — svg width is 24", () => {
    render(<M3Spinner size="sm" />);
    expect(screen.getByRole("status")).toHaveAttribute("width", "24");
  });

  it("renders with size lg — svg width is 48", () => {
    render(<M3Spinner size="lg" />);
    expect(screen.getByRole("status")).toHaveAttribute("width", "48");
  });

  it("renders label text when label prop is provided", () => {
    render(<M3Spinner label="Loading data..." />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });
});
