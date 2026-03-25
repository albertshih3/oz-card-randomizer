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
    users: { getUserList: mockGetUserList },
    invitations: { createInvitation: mockCreateInvitation },
  })),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
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
        headers: { authorization: "Bearer tok" },
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
        headers: { authorization: "Bearer tok" },
        body: { email: "new@zoo.org" },
      }),
      mock.res,
    );
    expect(mock.getStatusCode()).toBe(200);
    expect(mock.getBody()).toEqual({ success: true });
  });
});
