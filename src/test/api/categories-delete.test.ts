import type { VercelRequest, VercelResponse } from "@vercel/node";

const { state, ops } = vi.hoisted(() => ({
  state: {
    byName: [] as string[],
    canonicalExists: true,
    count: 0,
    countFails: false,
  },
  ops: [] as string[],
}));

vi.mock("../../../api/_auth", () => ({
  requireApproved: vi.fn(async () => ({ userId: "user_1" })),
}));
vi.mock("../../../api/_firebase-admin", () => ({
  getFirebaseAdminApp: vi.fn(() => ({})),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        path: `${name}/${id}`,
        get: async () => ({ exists: state.canonicalExists }),
      }),
      where: () => ({
        get: async () => ({
          docs: state.byName.map((id) => ({
            ref: { path: `${name}/${id}` },
          })),
        }),
      }),
      count: () => ({
        get: async () => {
          ops.push("count");
          if (state.countFails) throw new Error("firestore down");
          return { data: () => ({ count: state.count }) };
        },
      }),
    }),
    batch: () => ({
      update: (ref: { path: string }, data: { deleting: boolean }) =>
        ops.push(`mark:${data.deleting}:${ref.path}`),
      delete: (ref: { path: string }) => ops.push(`delete:${ref.path}`),
      commit: async () => {},
    }),
  }),
}));

import { requireApproved } from "../../../api/_auth";
import handler from "../../../api/categories/delete";

function makeReq(id: unknown, method = "POST"): VercelRequest {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: { id },
  } as unknown as VercelRequest;
}

function makeRes() {
  const result = { status: 200, body: null as unknown };
  const res = {
    setHeader: vi.fn(() => res),
    status: vi.fn((code: number) => {
      result.status = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      result.body = data;
      return res;
    }),
    end: vi.fn(() => res),
  } as unknown as VercelResponse;
  return { res, result };
}

describe("POST /api/categories/delete", () => {
  beforeEach(() => {
    ops.length = 0;
    state.byName = [];
    state.canonicalExists = true;
    state.count = 0;
    state.countFails = false;
    vi.mocked(requireApproved).mockClear();
  });

  it("does nothing when the guard refuses", async () => {
    vi.mocked(requireApproved).mockRejectedValueOnce(new Error("403"));
    const { res } = makeRes();
    await handler(makeReq("disney"), res);
    expect(ops).toEqual([]);
  });

  it.each(["spoonbill", "africansavanna"])(
    "refuses to delete required category %s",
    async (id) => {
      const { res, result } = makeRes();
      await handler(makeReq(id), res);
      expect(result.status).toBe(409);
      expect(ops).toEqual([]);
    },
  );

  it.each([["../x"], [""], [5], [null]])("rejects id %j", async (id) => {
    const { res, result } = makeRes();
    await handler(makeReq(id), res);
    expect(result.status).toBe(400);
  });

  it("returns 404 for an unknown category", async () => {
    state.canonicalExists = false;
    const { res, result } = makeRes();
    await handler(makeReq("nope"), res);
    expect(result.status).toBe(404);
  });

  it("closes the category to writes before counting, then deletes", async () => {
    const { res, result } = makeRes();
    await handler(makeReq("disney"), res);
    expect(result.status).toBe(200);
    expect(ops).toEqual([
      "mark:true:categories/disney",
      "count",
      "delete:categories/disney",
    ]);
  });

  it("restores a populated category and reports the count", async () => {
    state.count = 3;
    const { res, result } = makeRes();
    await handler(makeReq("disney"), res);
    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).toContain("3 cards");
    expect(ops).toEqual([
      "mark:true:categories/disney",
      "count",
      "mark:false:categories/disney",
    ]);
  });

  it("reopens the category if anything fails after it was closed", async () => {
    state.countFails = true;
    const { res, result } = makeRes();
    await handler(makeReq("disney"), res);
    expect(result.status).toBe(500);
    expect(ops).toEqual([
      "mark:true:categories/disney",
      "count",
      "mark:false:categories/disney",
    ]);
  });

  it("covers legacy auto-id duplicates of the same category", async () => {
    state.byName = ["0abc", "1abc"];
    state.canonicalExists = false;
    const { res } = makeRes();
    await handler(makeReq("disney"), res);
    expect(ops).toContain("delete:categories/0abc");
    expect(ops).toContain("delete:categories/1abc");
  });
});
