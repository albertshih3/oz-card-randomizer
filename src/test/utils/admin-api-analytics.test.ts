import { getAnalyticsSummary } from "@/utils/admin-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("getAnalyticsSummary", () => {
  it("sends GET with Authorization header and ?days=30", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSummary),
    });
    await getAnalyticsSummary("tok-123", 30);
    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/summary?days=30", {
      headers: { Authorization: "Bearer tok-123" },
    });
  });

  it("uses default 30 days when no argument given", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSummary),
    });
    await getAnalyticsSummary("tok-123");
    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/summary?days=30", {
      headers: { Authorization: "Bearer tok-123" },
    });
  });

  it("returns parsed AnalyticsSummary", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSummary),
    });
    const result = await getAnalyticsSummary("tok", 30);
    expect(result.days).toBe(30);
    expect(result.series).toHaveLength(1);
    expect(result.current.activeUsers).toBe(5);
  });

  it("throws on non-ok response with error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Analytics not configured" }),
    });
    await expect(getAnalyticsSummary("tok", 30)).rejects.toThrow(
      "Analytics not configured",
    );
  });
});
