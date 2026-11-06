import type { VercelRequest, VercelResponse } from "@vercel/node";

const { mockVerifyToken, mockRunReport } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockRunReport: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn().mockResolvedValue({
        publicMetadata: { approved: true },
      }),
    },
  })),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: function () {
    return { runReport: mockRunReport };
  },
}));

vi.mock("../../../api/_rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(true),
}));

import handler, { completeDaysBefore } from "../../../api/analytics/summary";

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "GET",
    headers: {},
    query: {},
    body: null,
    ...overrides,
  } as unknown as VercelRequest;
}

interface MockRes {
  res: VercelResponse;
  getStatusCode: () => number;
  getBody: () => unknown;
}

function makeRes(): MockRes {
  let statusCode = 200;
  let body: unknown = null;
  const res = {
    setHeader: vi.fn(() => res),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      body = data;
      return res;
    }),
    end: vi.fn(() => res),
  } as unknown as VercelResponse;
  return {
    res,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

describe("api/analytics/summary handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GA4_PROPERTY_ID = "123456789";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = Buffer.from(
      JSON.stringify({ type: "service_account", project_id: "test" }),
    ).toString("base64");
  });

  afterEach(() => {
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  });

  it("returns 405 for non-GET method", async () => {
    const mock = makeRes();
    await handler(makeReq({ method: "POST" }), mock.res);
    expect(mock.getStatusCode()).toBe(405);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const mock = makeRes();
    await handler(makeReq({ headers: {} }), mock.res);
    expect(mock.getStatusCode()).toBe(401);
  });

  it("returns 401 when verifyToken throws", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("bad token"));
    const mock = makeRes();
    await handler(
      makeReq({ headers: { authorization: "Bearer badtoken" } }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(401);
  });

  it("returns 500 when env vars are not set", async () => {
    delete process.env.GA4_PROPERTY_ID;
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    const mock = makeRes();
    await handler(
      makeReq({ headers: { authorization: "Bearer validtoken" } }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(500);
    expect(mock.getBody()).toEqual({ error: "Analytics not configured" });
  });

  it.each([["365"], ["0"], ["7.5"], ["abc"], [["7", "30"]]])(
    "rejects days=%j without calling GA",
    async (days) => {
      mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
      const mock = makeRes();
      await handler(
        makeReq({
          headers: { authorization: "Bearer validtoken" },
          query: { days },
        }),
        mock.res,
      );
      expect(mock.getStatusCode()).toBe(400);
      expect(mockRunReport).not.toHaveBeenCalled();
    },
  );

  it("defaults days to 30 when missing", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    const emptyResponse = [{ rows: [] }];
    mockRunReport.mockResolvedValue(emptyResponse);
    const mock = makeRes();
    await handler(
      makeReq({ headers: { authorization: "Bearer validtoken" } }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);
    const body = mock.getBody() as { days: number };
    expect(body.days).toBe(30);
  });

  describe("report handling", () => {
    const yesterday = completeDaysBefore(
      new Date(),
      "America/Los_Angeles",
      7,
    ).at(-1) as string;
    const gaDate = yesterday.replace(/-/g, "");

    const row = (dimensions: string[], metrics: string[]) => ({
      dimensionValues: dimensions.map((value) => ({ value })),
      metricValues: metrics.map((value) => ({ value })),
    });

    function stubReports() {
      mockRunReport.mockImplementation(
        async (request: {
          dateRanges: Array<{ startDate: string }>;
          dimensions?: Array<{ name: string }>;
          dimensionFilter?: unknown;
        }) => {
          const isCurrent = request.dateRanges[0].startDate === "7daysAgo";
          const dimensions = request.dimensions?.map((d) => d.name) ?? [];
          let rows: unknown[];
          if (isCurrent && dimensions.join() === "date") {
            rows = [row([gaDate], ["5", "8"])];
          } else if (isCurrent && dimensions.length === 0) {
            rows = [row([], ["3", "6"])];
          } else if (isCurrent) {
            rows = [
              row([gaDate, "generate"], ["12"]),
              row([gaDate, "download"], ["4"]),
            ];
          } else if (dimensions.length === 0) {
            rows = [row([], ["2", "4"])];
          } else {
            rows = [row(["generate"], ["6"]), row(["download"], ["1"])];
          }
          return [{ rows, metadata: { timeZone: "America/Los_Angeles" } }];
        },
      );
    }

    async function summary() {
      mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
      const mock = makeRes();
      await handler(
        makeReq({
          headers: { authorization: "Bearer validtoken" },
          query: { days: "7" },
        }),
        mock.res,
      );
      return mock.getBody() as {
        series: Array<Record<string, unknown>>;
        current: Record<string, number>;
        prior: Record<string, number>;
      };
    }

    it("counts period users once rather than summing daily uniques", async () => {
      stubReports();
      const body = await summary();
      expect(body.series.at(-1)?.activeUsers).toBe(5);
      expect(body.current.activeUsers).toBe(3);
      expect(body.current.sessions).toBe(6);
    });

    it("measures users and sessions across all app usage", async () => {
      stubReports();
      await summary();
      const usageQueries = mockRunReport.mock.calls
        .map(([request]) => request)
        .filter((request) =>
          request.metrics.some(
            (m: { name: string }) => m.name === "activeUsers",
          ),
        );
      expect(usageQueries.length).toBeGreaterThan(0);
      for (const query of usageQueries) {
        expect(query.dimensionFilter).toBeUndefined();
      }
    });

    it("keeps generation and export counts separate", async () => {
      stubReports();
      const body = await summary();
      expect(body.current).toMatchObject({ packGenerations: 12, exports: 4 });
      expect(body.prior).toEqual({
        activeUsers: 2,
        sessions: 4,
        packGenerations: 6,
        exports: 1,
      });
    });

    it("includes every day, with zeros where nothing happened", async () => {
      stubReports();
      const body = await summary();
      expect(body.series).toHaveLength(7);
      expect(body.series[0]).toMatchObject({
        activeUsers: 0,
        sessions: 0,
        packGenerations: 0,
        exports: 0,
      });
    });

    it("excludes today from both periods", async () => {
      stubReports();
      await summary();
      const ranges = mockRunReport.mock.calls.map(
        ([request]) => request.dateRanges[0],
      );
      expect(ranges).toContainEqual({
        startDate: "7daysAgo",
        endDate: "yesterday",
      });
      expect(ranges).toContainEqual({
        startDate: "14daysAgo",
        endDate: "8daysAgo",
      });
    });

    it("treats a malformed metric as zero rather than NaN", async () => {
      mockRunReport.mockResolvedValue([
        { rows: [row([], ["not-a-number", ""])] },
      ]);
      const body = await summary();
      expect(body.current.activeUsers).toBe(0);
      expect(body.current.sessions).toBe(0);
    });
  });

  describe("completeDaysBefore", () => {
    it("uses the property's calendar, not UTC", () => {
      // 02:00 UTC on Mar 10 is still Mar 9 in Los Angeles.
      const now = new Date("2026-03-10T02:00:00Z");
      expect(completeDaysBefore(now, "America/Los_Angeles", 1)).toEqual([
        "2026-03-08",
      ]);
      expect(completeDaysBefore(now, "UTC", 1)).toEqual(["2026-03-09"]);
    });

    it("spans a DST change without skipping or repeating a date", () => {
      const now = new Date("2026-03-10T20:00:00Z");
      expect(completeDaysBefore(now, "America/Los_Angeles", 3)).toEqual([
        "2026-03-07",
        "2026-03-08",
        "2026-03-09",
      ]);
    });
  });

  it("never calls GA for a denied request", async () => {
    const mock = makeRes();
    await handler(makeReq({ headers: {} }), mock.res);
    expect(mock.getStatusCode()).toBe(401);
    expect(mockRunReport).not.toHaveBeenCalled();
  });

  it("returns 500 when runReport throws", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    mockRunReport.mockRejectedValue(new Error("GA4 API error"));
    const mock = makeRes();
    await handler(
      makeReq({
        headers: { authorization: "Bearer validtoken" },
        query: { days: "7" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(500);
    expect(mock.getBody()).toEqual({ error: "Failed to fetch analytics" });
  });
});
