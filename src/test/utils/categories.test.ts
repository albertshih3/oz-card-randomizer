import {
  getCategories,
  clearCategoriesCache,
  categoriesToLegacyFormat,
} from "@/utils/categories";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: { currentUser: {} },
}));

import { getDocs, setDoc } from "firebase/firestore";

// --- Helper ---

function makeFakeSnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  return {
    forEach: (
      cb: (doc: { id: string; data: () => Record<string, unknown> }) => void,
    ) => {
      docs.forEach((d) => cb({ id: d.id, data: () => d.data }));
    },
  };
}

// --- Setup ---

beforeEach(() => {
  clearCategoriesCache();
  vi.clearAllMocks();
});

// --- Tests ---

describe("getCategories()", () => {
  it("returns categories from Firestore when documents exist", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeFakeSnapshot([
        {
          id: "africansavanna",
          data: {
            name: "africansavanna",
            displayName: "African Savanna",
            isWildcardEligible: false,
          },
        },
        {
          id: "childrenszoo",
          data: {
            name: "childrenszoo",
            displayName: "Children's Zoo",
            isWildcardEligible: true,
          },
        },
      ]) as never,
    );
    const result = await getCategories();
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("africansavanna");
    expect(result[0].displayName).toBe("African Savanna");
    expect(result[1].id).toBe("childrenszoo");
    expect(result[1].isWildcardEligible).toBe(true);
  });

  it("uses document id as name fallback when name field is missing", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeFakeSnapshot([
        { id: "testcol", data: { displayName: "Test" } },
      ]) as never,
    );
    const result = await getCategories();
    expect(result[0].name).toBe("testcol");
  });

  it("uses document id as displayName fallback when both displayName and name are missing", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeFakeSnapshot([{ id: "barecol", data: {} }]) as never,
    );
    const result = await getCategories();
    expect(result[0].displayName).toBe("barecol");
  });

  it("deduplicates documents with the same name field", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeFakeSnapshot([
        { id: "col1", data: { name: "sharedname", displayName: "Shared" } },
        {
          id: "col2",
          data: { name: "sharedname", displayName: "Shared Duplicate" },
        },
      ]) as never,
    );
    const result = await getCategories();
    expect(result.length).toBe(1);
  });

  it("defaults isWildcardEligible to false when field is absent from document", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeFakeSnapshot([
        { id: "plain", data: { name: "plain", displayName: "Plain" } },
      ]) as never,
    );
    const result = await getCategories();
    expect(result[0].isWildcardEligible).toBe(false);
  });
});

describe("getCategories() — cache behavior", () => {
  it("caches result and does not call getDocs again on subsequent calls", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeFakeSnapshot([
        { id: "col1", data: { name: "col1", displayName: "Col 1" } },
        { id: "col2", data: { name: "col2", displayName: "Col 2" } },
      ]) as never,
    );
    const result1 = await getCategories();
    const result2 = await getCategories();
    expect(vi.mocked(getDocs).mock.calls.length).toBe(1);
    expect(result1).toBe(result2);
  });

  it("returns fresh data after clearCategoriesCache() is called", async () => {
    const doc1 = { id: "col1", data: { name: "col1", displayName: "Col 1" } };
    const doc2 = { id: "col2", data: { name: "col2", displayName: "Col 2" } };
    vi.mocked(getDocs)
      .mockResolvedValueOnce(makeFakeSnapshot([doc1]) as never)
      .mockResolvedValueOnce(makeFakeSnapshot([doc1, doc2]) as never);
    const first = await getCategories();
    expect(first.length).toBe(1);
    clearCategoriesCache();
    const second = await getCategories();
    expect(second.length).toBe(2);
    expect(vi.mocked(getDocs).mock.calls.length).toBe(2);
  });
});

describe("getCategories() — read-only, honest results", () => {
  it("returns an empty list without writing when Firestore is empty", async () => {
    vi.mocked(getDocs).mockResolvedValue(makeFakeSnapshot([]) as never);
    await expect(getCategories()).resolves.toEqual([]);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("rejects on a read failure instead of inventing defaults", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("offline"));
    await expect(getCategories()).rejects.toThrow("offline");
  });

  it("does not cache a failure", async () => {
    const doc1 = { id: "a", data: { name: "a", displayName: "A" } };
    vi.mocked(getDocs)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(makeFakeSnapshot([doc1]) as never);
    await expect(getCategories()).rejects.toThrow();
    await expect(getCategories()).resolves.toHaveLength(1);
  });

  it("shares one request between concurrent callers", async () => {
    vi.mocked(getDocs).mockResolvedValue(makeFakeSnapshot([]) as never);
    await Promise.all([getCategories(), getCategories()]);
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it("does not cache a read that was invalidated while in flight", async () => {
    const doc1 = { id: "a", data: { name: "a", displayName: "A" } };
    vi.mocked(getDocs).mockResolvedValue(makeFakeSnapshot([doc1]) as never);
    const stale = getCategories();
    clearCategoriesCache();
    await stale;
    await getCategories();
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  it("keeps the first document's values when legacy duplicates disagree", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeFakeSnapshot([
        { id: "0abc", data: { name: "dup", isWildcardEligible: true } },
        { id: "1abc", data: { name: "dup", isWildcardEligible: false } },
      ]) as never,
    );
    const [category] = await getCategories();
    expect(category.isWildcardEligible).toBe(true);
  });
});

describe("categoriesToLegacyFormat()", () => {
  it("maps id field to cat.name", () => {
    const input = [
      {
        id: "doc-id",
        name: "africansavanna",
        displayName: "African Savanna",
        isWildcardEligible: false,
      },
    ];
    const result = categoriesToLegacyFormat(input);
    expect(result[0].id).toBe("africansavanna");
  });

  it("maps name field to cat.displayName", () => {
    const input = [
      {
        id: "doc-id",
        name: "africansavanna",
        displayName: "African Savanna",
        isWildcardEligible: false,
      },
    ];
    const result = categoriesToLegacyFormat(input);
    expect(result[0].name).toBe("African Savanna");
  });

  it("preserves isWildcardEligible", () => {
    const input = [
      {
        id: "doc-id",
        name: "specialedition",
        displayName: "Special Edition",
        isWildcardEligible: true,
      },
    ];
    const result = categoriesToLegacyFormat(input);
    expect(result[0].isWildcardEligible).toBe(true);
  });

  it("maps an empty array to an empty array", () => {
    expect(categoriesToLegacyFormat([]).length).toBe(0);
  });

  it("maps multiple categories correctly", () => {
    const input = [
      {
        id: "id1",
        name: "africansavanna",
        displayName: "African Savanna",
        isWildcardEligible: false,
      },
      {
        id: "id2",
        name: "childrenszoo",
        displayName: "Children's Zoo",
        isWildcardEligible: true,
      },
    ];
    const result = categoriesToLegacyFormat(input);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("africansavanna");
    expect(result[1].id).toBe("childrenszoo");
  });
});

describe("clearCategoriesCache()", () => {
  it("forces a fresh getDocs call after cache is cleared", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeFakeSnapshot([
        { id: "col1", data: { name: "col1", displayName: "Col 1" } },
      ]) as never,
    );
    await getCategories();
    expect(vi.mocked(getDocs).mock.calls.length).toBe(1);
    clearCategoriesCache();
    await getCategories();
    expect(vi.mocked(getDocs).mock.calls.length).toBe(2);
  });
});
