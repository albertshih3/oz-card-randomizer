import type { VercelResponse } from "@vercel/node";

const { store, failing } = vi.hoisted(() => ({
  store: new Map<string, number>(),
  failing: { value: false },
}));

vi.mock("../../../api/_firebase-admin", () => ({
  getFirebaseAdminApp: vi.fn(() => ({})),
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => n },
  Timestamp: { fromMillis: (ms: number) => ms },
  getFirestore: () => ({
    doc: (path: string) => ({ path }),
    runTransaction: async (
      fn: (tx: unknown) => Promise<number>,
    ): Promise<number> => {
      if (failing.value) throw new Error("firestore down");
      return fn({
        get: async ({ path }: { path: string }) => ({
          get: () => store.get(path),
        }),
        set: ({ path }: { path: string }) => {
          store.set(path, (store.get(path) ?? 0) + 1);
        },
      });
    },
  }),
}));

import { enforceRateLimit, type RateLimit } from "../../../api/_rate-limit";

const LIMIT: RateLimit = {
  bucket: "test",
  key: "1.2.3.4",
  limit: 2,
  windowSeconds: 60,
  whenUnavailable: "deny",
};

function makeRes() {
  const state = { status: 200, headers: {} as Record<string, string> };
  const res = {
    setHeader: (name: string, value: string) => {
      state.headers[name] = value;
      return res;
    },
    status: (code: number) => {
      state.status = code;
      return res;
    },
    json: () => res,
  } as unknown as VercelResponse;
  return { res, state };
}

describe("enforceRateLimit", () => {
  beforeEach(() => {
    store.clear();
    failing.value = false;
  });

  it("allows up to the limit, then answers 429 with Retry-After", async () => {
    expect(await enforceRateLimit(makeRes().res, LIMIT)).toBe(true);
    expect(await enforceRateLimit(makeRes().res, LIMIT)).toBe(true);

    const { res, state } = makeRes();
    expect(await enforceRateLimit(res, LIMIT)).toBe(false);
    expect(state.status).toBe(429);
    expect(Number(state.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("counts clients separately", async () => {
    await enforceRateLimit(makeRes().res, LIMIT);
    await enforceRateLimit(makeRes().res, LIMIT);
    expect(
      await enforceRateLimit(makeRes().res, { ...LIMIT, key: "5.6.7.8" }),
    ).toBe(true);
  });

  it("never stores the raw key", async () => {
    await enforceRateLimit(makeRes().res, LIMIT);
    expect([...store.keys()].join()).not.toContain("1.2.3.4");
  });

  it("fails closed when configured to deny", async () => {
    failing.value = true;
    const { res, state } = makeRes();
    expect(await enforceRateLimit(res, LIMIT)).toBe(false);
    expect(state.status).toBe(503);
  });

  it("fails open when configured to allow", async () => {
    failing.value = true;
    expect(
      await enforceRateLimit(makeRes().res, {
        ...LIMIT,
        whenUnavailable: "allow",
      }),
    ).toBe(true);
  });
});
