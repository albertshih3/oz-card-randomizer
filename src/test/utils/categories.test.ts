import {
  getCategories,
  getDefaultCategories,
  clearCategoriesCache,
  categoriesToLegacyFormat,
} from "@/utils/categories";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
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

describe("getCategories() — empty Firestore fallback", () => {
  it("calls setDoc 9 times when Firestore returns zero documents", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeFakeSnapshot([]) as never);
    vi.mocked(setDoc).mockResolvedValue(undefined);
    await getCategories();
    expect(vi.mocked(setDoc).mock.calls.length).toBe(9);
  });

  it("returns 9 categories when Firestore is empty and setDoc succeeds", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeFakeSnapshot([]) as never);
    vi.mocked(setDoc).mockResolvedValue(undefined);
    const result = await getCategories();
    expect(result.length).toBe(9);
    expect(result.every((c) => c.isWildcardEligible === false)).toBe(true);
  });

  it("returns getDefaultCategories() result when setDoc fails", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeFakeSnapshot([]) as never);
    vi.mocked(setDoc).mockRejectedValue(new Error("write failed"));
    const result = await getCategories();
    const defaults = getDefaultCategories();
    expect(result.length).toBe(defaults.length);
    const resultIds = result.map((c) => c.id).sort();
    const defaultIds = defaults.map((c) => c.id).sort();
    expect(resultIds).toEqual(defaultIds);
  });
});

describe("getCategories() — getDocs error handling", () => {
  it("returns getDefaultCategories() result when getDocs throws", async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error("network error"));
    const result = await getCategories();
    const defaults = getDefaultCategories();
    expect(result.length).toBe(defaults.length);
    const resultIds = result.map((c) => c.id).sort();
    const defaultIds = defaults.map((c) => c.id).sort();
    expect(resultIds).toEqual(defaultIds);
  });

  it("does not throw when getDocs fails", async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error("network error"));
    await expect(getCategories()).resolves.not.toThrow();
  });
});

describe("getDefaultCategories()", () => {
  it("returns exactly 9 categories", () => {
    expect(getDefaultCategories().length).toBe(9);
  });

  it("returns all expected collection IDs", () => {
    const expectedIds = [
      "africansavanna",
      "californiatrail",
      "childrenszoo",
      "tropicalrainforest",
      "specialedition",
      "booatthezoo",
      "arcas",
      "newnaturefoundation",
      "disney",
    ];
    const result = getDefaultCategories();
    const idSet = new Set(result.map((c) => c.id));
    for (const id of expectedIds) {
      expect(idSet.has(id)).toBe(true);
    }
  });

  it("all returned categories have isWildcardEligible: false", () => {
    const result = getDefaultCategories();
    expect(result.every((c) => c.isWildcardEligible === false)).toBe(true);
  });

  it("id and name fields are identical for each category", () => {
    const result = getDefaultCategories();
    expect(result.every((c) => c.id === c.name)).toBe(true);
  });

  it("is a pure function — returns a new array on each call", () => {
    const result1 = getDefaultCategories();
    const result2 = getDefaultCategories();
    expect(result1).not.toBe(result2);
    expect(result1.map((c) => c.id)).toEqual(result2.map((c) => c.id));
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
