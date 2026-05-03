import React from "react";

const { mockGetToken, mockGetAnalyticsSummary } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockGetAnalyticsSummary: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));
vi.mock("@/utils/admin-api", () => ({
  getAnalyticsSummary: mockGetAnalyticsSummary,
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
vi.mock("@heroui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={`skeleton ${className ?? ""}`} data-testid="skeleton" />
  ),
}));
vi.mock("@/components/m3/linear-progress", () => ({
  LinearProgress: ({ visible }: { visible: boolean }) => (
    <div data-testid="linear-progress" data-visible={visible} />
  ),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminAnalyticsPage from "@/pages/admin/analytics";

const mockSummary = {
  days: 30,
  series: [
    {
      date: "2026-03-27",
      activeUsers: 5,
      sessions: 8,
      packGenerations: 12,
      exports: 3,
    },
  ],
  current: { activeUsers: 5, sessions: 8, packGenerations: 12, exports: 3 },
  prior: { activeUsers: 2, sessions: 4, packGenerations: 6, exports: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue("fake-token");
  mockGetAnalyticsSummary.mockResolvedValue(mockSummary);
});

describe("AdminAnalyticsPage — OAK-95", () => {
  it("shows LinearProgress while loading", () => {
    // Return a promise that never resolves to keep loading state
    mockGetAnalyticsSummary.mockReturnValue(new Promise(() => {}));
    render(<AdminAnalyticsPage />);
    const progress = screen.getByTestId("linear-progress");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("data-visible", "true");
  });

  it("renders 4 metric card titles when data loads", async () => {
    render(<AdminAnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText("Active Users")).toBeInTheDocument(),
    );
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(
      screen.getAllByText("Pack Generations").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Exports").length).toBeGreaterThanOrEqual(1);
  });

  it("shows inline error with Retry button when fetch fails", async () => {
    mockGetAnalyticsSummary.mockRejectedValueOnce(
      new Error("Analytics not configured"),
    );
    render(<AdminAnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText("Could not load analytics")).toBeInTheDocument(),
    );
    expect(screen.getByText("Analytics not configured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("Retry button re-calls getAnalyticsSummary", async () => {
    mockGetAnalyticsSummary.mockRejectedValueOnce(
      new Error("Analytics not configured"),
    );
    render(<AdminAnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText("Could not load analytics")).toBeInTheDocument(),
    );
    expect(mockGetAnalyticsSummary).toHaveBeenCalledTimes(1);

    mockGetAnalyticsSummary.mockResolvedValueOnce(mockSummary);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      expect(mockGetAnalyticsSummary).toHaveBeenCalledTimes(2),
    );
  });

  it("day selector buttons call fetch with correct days value", async () => {
    render(<AdminAnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText("Active Users")).toBeInTheDocument(),
    );

    // Initial call was with 30 days
    expect(mockGetAnalyticsSummary).toHaveBeenCalledWith("fake-token", 30);

    mockGetAnalyticsSummary.mockResolvedValueOnce({
      ...mockSummary,
      days: 7,
    });
    fireEvent.click(screen.getByText("7d"));
    await waitFor(() =>
      expect(mockGetAnalyticsSummary).toHaveBeenCalledWith("fake-token", 7),
    );
  });
});
