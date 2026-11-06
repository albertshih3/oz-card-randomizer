import type { VercelRequest, VercelResponse } from "@vercel/node";

const { mockVerifyToken, mockGetUserList, mockCreateInvitation } = vi.hoisted(
  () => ({
    mockVerifyToken: vi.fn(),
    mockGetUserList: vi.fn(),
    mockCreateInvitation: vi.fn(),
  }),
);

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUserList: mockGetUserList,
      getUser: vi.fn().mockResolvedValue({
        publicMetadata: { approved: true },
      }),
    },
    invitations: { createInvitation: mockCreateInvitation },
  })),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock("../../../api/_rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(true),
}));

// Relative imports -- api/ is outside src/, so @/ alias cannot reach it
import listHandler from "../../../api/users/list";
import inviteHandler from "../../../api/users/invite";

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "GET",
    headers: {},
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

describe("api/users handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET /api/users/list
  it("returns 405 for non-GET method", async () => {
    const mock = makeRes();
    await listHandler(makeReq({ method: "POST" }), mock.res);
    expect(mock.getStatusCode()).toBe(405);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const mock = makeRes();
    await listHandler(makeReq({ headers: {} }), mock.res);
    expect(mock.getStatusCode()).toBe(401);
  });

  it("returns 401 when verifyToken throws", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("bad token"));
    const mock = makeRes();
    await listHandler(
      makeReq({ headers: { authorization: "Bearer badtoken" } }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(401);
  });

  it("returns sanitized user array on success", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    mockGetUserList.mockResolvedValueOnce({
      data: [
        {
          id: "u1",
          emailAddresses: [{ emailAddress: "test@zoo.org" }],
          firstName: "Test",
          lastName: "User",
          lastSignInAt: 1000,
        },
      ],
    });
    const mock = makeRes();
    await listHandler(
      makeReq({ headers: { authorization: "Bearer validtoken" } }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);
    const users = mock.getBody() as Array<{ id: string; email: string }>;
    expect(users[0].email).toBe("test@zoo.org");
    expect(users[0]).not.toHaveProperty("emailAddresses");
  });

  // POST /api/users/invite
  it("returns 405 for non-POST method on invite", async () => {
    const mock = makeRes();
    await inviteHandler(makeReq({ method: "GET" }), mock.res);
    expect(mock.getStatusCode()).toBe(405);
  });

  it("returns 401 when token is invalid on invite", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("bad"));
    const mock = makeRes();
    await inviteHandler(
      makeReq({
        method: "POST",
        headers: { authorization: "Bearer bad" },
        body: { email: "x@y.com" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    const mock = makeRes();
    await inviteHandler(
      makeReq({
        method: "POST",
        headers: {
          authorization: "Bearer tok",
          "content-type": "application/json",
        },
        body: {},
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(400);
  });

  it("returns 200 and { success: true } on success", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "user_123" });
    mockCreateInvitation.mockResolvedValueOnce({});
    const mock = makeRes();
    await inviteHandler(
      makeReq({
        method: "POST",
        headers: {
          authorization: "Bearer tok",
          "content-type": "application/json",
        },
        body: { email: "new@zoo.org" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);
    expect(mock.getBody()).toEqual({ success: true });
  });

  describe("GET /api/users/list completeness", () => {
    const auth = { headers: { authorization: "Bearer validtoken" } };
    const user = (id: string, emails: string[], primary?: string) => ({
      id,
      primaryEmailAddressId: primary ?? null,
      emailAddresses: emails.map((email, i) => ({
        id: `e${i}`,
        emailAddress: email,
      })),
      firstName: null,
      lastName: null,
      lastSignInAt: null,
    });

    beforeEach(() => {
      mockVerifyToken.mockResolvedValue({ sub: "user_1" });
    });

    it("returns every page beyond the first 100 users", async () => {
      const page = Array.from({ length: 100 }, (_, i) =>
        user(`u${i}`, ["a@b.co"]),
      );
      mockGetUserList
        .mockResolvedValueOnce({ data: page })
        .mockResolvedValueOnce({ data: [user("last", ["z@b.co"])] });
      const mock = makeRes();
      await listHandler(makeReq(auth), mock.res);
      expect(mock.getBody()).toHaveLength(101);
      expect(mockGetUserList).toHaveBeenLastCalledWith({
        limit: 100,
        offset: 100,
      });
    });

    it("stops at a bounded number of pages", async () => {
      const page = Array.from({ length: 100 }, (_, i) =>
        user(`u${i}`, ["a@b.co"]),
      );
      mockGetUserList.mockReset();
      mockGetUserList.mockResolvedValue({ data: page });
      const mock = makeRes();
      await listHandler(makeReq(auth), mock.res);
      expect(mockGetUserList).toHaveBeenCalledTimes(10);
    });

    it("returns the primary email, not the first one", async () => {
      mockGetUserList.mockReset();
      mockGetUserList.mockResolvedValue({
        data: [user("u1", ["old@b.co", "main@b.co"], "e1")],
      });
      const mock = makeRes();
      await listHandler(makeReq(auth), mock.res);
      expect((mock.getBody() as Array<{ email: string }>)[0].email).toBe(
        "main@b.co",
      );
    });

    it("falls back when no primary email is set", async () => {
      mockGetUserList.mockReset();
      mockGetUserList.mockResolvedValue({ data: [user("u1", ["a@b.co"])] });
      const mock = makeRes();
      await listHandler(makeReq(auth), mock.res);
      expect((mock.getBody() as Array<{ email: string }>)[0].email).toBe(
        "a@b.co",
      );
    });
  });
});
