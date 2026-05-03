import { listUsers, inviteUser } from "@/utils/admin-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin-api", () => {
  it("listUsers — sends GET with Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    await listUsers("tok-123");
    expect(mockFetch).toHaveBeenCalledWith("/api/users/list", {
      headers: { Authorization: "Bearer tok-123" },
    });
  });

  it("listUsers — returns parsed AdminUser array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "u1",
            email: "a@b.com",
            firstName: "A",
            lastName: "B",
            lastSignInAt: 1000,
          },
        ]),
    });
    const result = await listUsers("tok");
    expect(result[0].email).toBe("a@b.com");
  });

  it("listUsers — throws on non-ok response with error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });
    await expect(listUsers("bad")).rejects.toThrow("Unauthorized");
  });

  it("inviteUser — sends POST with Authorization header and JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const result = await inviteUser("tok-123", "user@zoo.org");
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith("/api/users/invite", {
      method: "POST",
      headers: {
        Authorization: "Bearer tok-123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "user@zoo.org" }),
    });
  });

  it("inviteUser — throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Already invited" }),
    });
    await expect(inviteUser("tok", "x@y.com")).rejects.toThrow(
      "Already invited",
    );
  });
});
