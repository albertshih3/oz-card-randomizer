import type { VercelRequest, VercelResponse } from "@vercel/node";

const { mockVerifyToken, mockGetUser, mockCreateCustomToken } = vi.hoisted(
  () => ({
    mockVerifyToken: vi.fn(),
    mockGetUser: vi.fn(),
    mockCreateCustomToken: vi.fn(),
  }),
);

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({ users: { getUser: mockGetUser } })),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));
vi.mock("../../../api/_firebase-admin", () => ({
  createCustomToken: mockCreateCustomToken,
}));

import {
  authorizedParties,
  isApproved,
  requireApproved,
} from "../../../api/_auth";
import tokenHandler, {
  APPROVAL_LEASE_SECONDS,
} from "../../../api/auth/firebase-token";

function makeReq(token?: string, method = "POST"): VercelRequest {
  return {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as VercelRequest;
}

function makeRes() {
  const state: { status: number; body: unknown } = { status: 200, body: null };
  const res = {
    setHeader: vi.fn(() => res),
    status: vi.fn((code: number) => {
      state.status = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      state.body = data;
      return res;
    }),
    end: vi.fn(() => res),
  } as unknown as VercelResponse;
  return { res, state };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyToken.mockResolvedValue({ sub: "user_1" });
  mockGetUser.mockResolvedValue({ publicMetadata: { approved: true } });
  mockCreateCustomToken.mockReturnValue("firebase-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isApproved", () => {
  it.each([
    [{ approved: "true" }],
    [{ approved: 1 }],
    [{}],
    [null],
    [undefined],
  ])("rejects %j", (metadata) => {
    expect(isApproved(metadata)).toBe(false);
  });

  it("accepts only boolean true", () => {
    expect(isApproved({ approved: true })).toBe(true);
  });
});

describe("authorizedParties", () => {
  it("excludes localhost in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(authorizedParties()).toEqual([
      "https://ozboosterpacks.albertshih.org",
    ]);
  });

  it("includes this preview deployment and configured origins", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "branch.vercel.app");
    vi.stubEnv("AUTHORIZED_PARTIES", "https://a.test, https://b.test");
    expect(authorizedParties()).toEqual(
      expect.arrayContaining([
        "https://branch.vercel.app",
        "https://a.test",
        "https://b.test",
      ]),
    );
  });
});

describe("requireApproved", () => {
  it("returns 401 with no token and never looks up the user", async () => {
    const { res, state } = makeRes();
    await expect(requireApproved(makeReq(), res)).rejects.toThrow();
    expect(state.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    mockVerifyToken.mockRejectedValue(new Error("bad"));
    const { res, state } = makeRes();
    await expect(requireApproved(makeReq("t"), res)).rejects.toThrow();
    expect(state.status).toBe(401);
  });

  it("passes authorized parties to token verification", async () => {
    const { res } = makeRes();
    await requireApproved(makeReq("t"), res);
    expect(mockVerifyToken).toHaveBeenCalledWith(
      "t",
      expect.objectContaining({ authorizedParties: authorizedParties() }),
    );
  });

  it("returns 403 for a valid but unapproved user", async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: {} });
    const { res, state } = makeRes();
    await expect(requireApproved(makeReq("t"), res)).rejects.toThrow();
    expect(state.status).toBe(403);
  });

  it("fails closed with 503 when approval cannot be checked", async () => {
    mockGetUser.mockRejectedValue(new Error("clerk down"));
    const { res, state } = makeRes();
    await expect(requireApproved(makeReq("t"), res)).rejects.toThrow();
    expect(state.status).toBe(503);
  });

  it("returns the user id when approved", async () => {
    const { res } = makeRes();
    await expect(requireApproved(makeReq("t"), res)).resolves.toEqual({
      userId: "user_1",
    });
  });
});

describe("POST /api/auth/firebase-token", () => {
  it("rejects other methods", async () => {
    const { res, state } = makeRes();
    await tokenHandler(makeReq("t", "GET"), res);
    expect(state.status).toBe(405);
  });

  it("does not mint a token for an unapproved user", async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: {} });
    const { res, state } = makeRes();
    await tokenHandler(makeReq("t"), res);
    expect(state.status).toBe(403);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it("mints a token whose claims carry a bounded lease", async () => {
    const before = Math.floor(Date.now() / 1000);
    const { res, state } = makeRes();
    await tokenHandler(makeReq("t"), res);

    expect(state.status).toBe(200);
    const [uid, claims] = mockCreateCustomToken.mock.calls[0];
    expect(uid).toBe("user_1");
    expect(claims.approved).toBe(true);
    expect(claims.approvedUntil).toBeGreaterThanOrEqual(
      before + APPROVAL_LEASE_SECONDS,
    );
    expect(claims.approvedUntil).toBeLessThanOrEqual(
      before + APPROVAL_LEASE_SECONDS + 5,
    );
  });

  it("fails closed when the admin credential is unavailable", async () => {
    mockCreateCustomToken.mockImplementation(() => {
      throw new Error("no credential");
    });
    const { res, state } = makeRes();
    await tokenHandler(makeReq("t"), res);
    expect(state.status).toBe(503);
  });
});
