const { auth, signInWithCustomToken, signOut } = vi.hoisted(() => {
  const auth = { currentUser: null as { uid: string } | null };
  return {
    auth,
    signInWithCustomToken: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock("firebase/auth", () => ({ signInWithCustomToken, signOut }));
vi.mock("@/lib/firebase", () => ({ auth }));

import {
  ensureFirebaseAuth,
  resetFirebaseAuthState,
  syncFirebaseIdentity,
} from "@/lib/firebase-auth";

const jwtFor = (sub: string) => `h.${btoa(JSON.stringify({ sub }))}.s`;
const tokenFor = (sub: string) => async () => jwtFor(sub);
const leaseResponse = (seconds = 900) =>
  new Response(
    JSON.stringify({
      token: "custom",
      approvedUntil: Math.floor(Date.now() / 1000) + seconds,
    }),
  );

describe("firebase-auth", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFirebaseAuthState();
    auth.currentUser = null;
    fetchMock = vi.fn(async () => leaseResponse());
    vi.stubGlobal("fetch", fetchMock);
    signInWithCustomToken.mockImplementation(async () => {
      auth.currentUser = { uid: signingInAs };
    });
    signOut.mockImplementation(async () => {
      auth.currentUser = null;
    });
    signingInAs = "user_a";
  });

  let signingInAs = "user_a";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs in once and reuses a live lease", async () => {
    await ensureFirebaseAuth(tokenFor("user_a"));
    await ensureFirebaseAuth(tokenFor("user_a"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renews when the lease is about to lapse", async () => {
    fetchMock.mockImplementationOnce(async () => leaseResponse(30));
    await ensureFirebaseAuth(tokenFor("user_a"));
    await ensureFirebaseAuth(tokenFor("user_a"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one sign-in across simultaneous mutations", async () => {
    await Promise.all([
      ensureFirebaseAuth(tokenFor("user_a")),
      ensureFirebaseAuth(tokenFor("user_a")),
    ]);
    expect(signInWithCustomToken).toHaveBeenCalledTimes(1);
  });

  it("rejects and clears Firebase when Clerk has no token", async () => {
    auth.currentUser = { uid: "user_a" };
    await expect(ensureFirebaseAuth(async () => null)).rejects.toThrow(
      "session has expired",
    );
    expect(signOut).toHaveBeenCalled();
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it("signs Firebase out on Clerk sign-out", async () => {
    await syncFirebaseIdentity("user_a");
    await ensureFirebaseAuth(tokenFor("user_a"));
    await syncFirebaseIdentity(null);
    expect(auth.currentUser).toBeNull();
  });

  it("re-issues the session when switching from user A to user B", async () => {
    await syncFirebaseIdentity("user_a");
    await ensureFirebaseAuth(tokenFor("user_a"));

    await syncFirebaseIdentity("user_b");
    expect(auth.currentUser).toBeNull();

    signingInAs = "user_b";
    await ensureFirebaseAuth(tokenFor("user_b"));
    expect(auth.currentUser).toEqual({ uid: "user_b" });
  });

  it("discards user A's sign-in if it resolves after user B takes over", async () => {
    await syncFirebaseIdentity("user_a");
    let release = (_: Response) => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (release = resolve)),
    );

    const stale = ensureFirebaseAuth(tokenFor("user_a"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await syncFirebaseIdentity("user_b");
    release(leaseResponse());

    await expect(stale).rejects.toThrow("Session changed");
    expect(signInWithCustomToken).not.toHaveBeenCalled();
    expect(auth.currentUser).toBeNull();
  });

  it("signs out if the identity changes during Firebase sign-in", async () => {
    await syncFirebaseIdentity("user_a");
    signInWithCustomToken.mockImplementationOnce(async () => {
      auth.currentUser = { uid: "user_a" };
      await syncFirebaseIdentity("user_b");
      auth.currentUser = { uid: "user_a" };
    });

    await expect(ensureFirebaseAuth(tokenFor("user_a"))).rejects.toThrow(
      "Session changed",
    );
    expect(auth.currentUser).toBeNull();
  });

  it("clears Firebase when approval has been revoked", async () => {
    await ensureFirebaseAuth(tokenFor("user_a"));
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ error: "not approved" }), {
          status: 403,
        }),
    );
    resetFirebaseAuthState();

    await expect(ensureFirebaseAuth(tokenFor("user_a"))).rejects.toThrow(
      "not approved",
    );
    expect(auth.currentUser).toBeNull();
  });
});
