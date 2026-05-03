import type { VercelRequest, VercelResponse } from "@vercel/node";

const { mockVerifyToken, mockRunReport } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockRunReport: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({})),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: function () {
    return { runReport: mockRunReport };
  },
}));

import handler from "../../../api/analytics/summary";

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

  it("clamps days param to 90", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    const emptyResponse = [{ rows: [] }];
    mockRunReport.mockResolvedValue(emptyResponse);
    const mock = makeRes();
    await handler(
      makeReq({
        headers: { authorization: "Bearer validtoken" },
        query: { days: "365" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);
    const body = mock.getBody() as { days: number };
    expect(body.days).toBe(90);
  });

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

  it("returns 200 with correctly shaped SummaryResponse", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });

    // Response A: current period generate events with date dimension
    const responseA = [
      {
        rows: [
          {
            dimensionValues: [{ value: "20260327" }],
            metricValues: [{ value: "5" }, { value: "8" }, { value: "12" }],
          },
        ],
      },
    ];
    // Response B: current period download events with date dimension
    const responseB = [
      {
        rows: [
          {
            dimensionValues: [{ value: "20260327" }],
            metricValues: [{ value: "3" }],
          },
        ],
      },
    ];
    // Response C: prior period generate totals
    const responseC = [
      {
        rows: [
          {
            metricValues: [{ value: "2" }, { value: "4" }, { value: "6" }],
          },
        ],
      },
    ];
    // Response D: prior period download totals
    const responseD = [
      {
        rows: [
          {
            metricValues: [{ value: "1" }],
          },
        ],
      },
    ];

    mockRunReport
      .mockResolvedValueOnce(responseA)
      .mockResolvedValueOnce(responseB)
      .mockResolvedValueOnce(responseC)
      .mockResolvedValueOnce(responseD);

    const mock = makeRes();
    await handler(
      makeReq({
        headers: { authorization: "Bearer validtoken" },
        query: { days: "30" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);

    const body = mock.getBody() as {
      days: number;
      series: Array<{
        date: string;
        activeUsers: number;
        sessions: number;
        packGenerations: number;
        exports: number;
      }>;
      current: {
        activeUsers: number;
        sessions: number;
        packGenerations: number;
        exports: number;
      };
      prior: {
        activeUsers: number;
        sessions: number;
        packGenerations: number;
        exports: number;
      };
    };

    expect(body.days).toBe(30);
    expect(body.series).toHaveLength(1);
    expect(body.series[0].date).toBe("2026-03-27");
    expect(body.series[0].activeUsers).toBe(5);
    expect(body.series[0].sessions).toBe(8);
    expect(body.series[0].packGenerations).toBe(12);
    expect(body.series[0].exports).toBe(3);

    expect(body.current).toEqual({
      activeUsers: 5,
      sessions: 8,
      packGenerations: 12,
      exports: 3,
    });
    expect(body.prior).toEqual({
      activeUsers: 2,
      sessions: 4,
      packGenerations: 6,
      exports: 1,
    });
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
