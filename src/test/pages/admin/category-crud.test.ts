vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue({}),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: {} } }));
vi.mock("@/lib/firebase-auth", () => ({
  ensureFirebaseAuth: vi.fn().mockResolvedValue(undefined),
}));

import {
  createCategory,
  updateCategoryDisplayName,
  toggleWildcardEligible,
  deleteCategory,
  clearCategoriesCache,
  CategoryError,
} from "@/utils/categories";
import { getDocs, runTransaction, updateDoc } from "firebase/firestore";

const mockGetToken = vi.fn().mockResolvedValue("fake-token");

beforeEach(() => {
  vi.clearAllMocks();
  clearCategoriesCache();
});

describe("Category CRUD — OAK-57", () => {
  const stubTransaction = (exists: boolean) => {
    const tx = {
      get: vi.fn(async () => ({ exists: () => exists })),
      set: vi.fn(),
    };
    vi.mocked(runTransaction).mockImplementation(
      async (_db, fn) => fn(tx as never) as never,
    );
    return tx;
  };

  it("createCategory — writes a new category in a transaction", async () => {
    const tx = stubTransaction(false);
    await createCategory("New Set", "newset", mockGetToken);
    expect(tx.set).toHaveBeenCalledWith(expect.anything(), {
      name: "newset",
      displayName: "New Set",
      isWildcardEligible: false,
    });
  });

  it("createCategory — refuses to overwrite an existing document", async () => {
    const tx = stubTransaction(true);
    await expect(
      createCategory("Dup", "disney", mockGetToken),
    ).rejects.toBeInstanceOf(CategoryError);
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("createCategory — catches a legacy document with an auto-generated id", async () => {
    const tx = stubTransaction(false);
    vi.mocked(getDocs).mockResolvedValueOnce({
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: "0abc", data: () => ({ name: "disney" }) }),
    } as never);
    await expect(createCategory("Dup", "disney", mockGetToken)).rejects.toThrow(
      "already exists",
    );
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("updateCategoryDisplayName — calls updateDoc and clears cache", async () => {
    await updateCategoryDisplayName(
      "africansavanna",
      "African Savanna Updated",
      mockGetToken,
    );
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = (updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).toMatchObject({ displayName: "African Savanna Updated" });
  });

  it("toggleWildcardEligible — calls updateDoc with correct value", async () => {
    await toggleWildcardEligible("africansavanna", true, mockGetToken);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = (updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).toMatchObject({ isWildcardEligible: true });
  });

  it("deleteCategory — asks the server, which enforces emptiness", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await deleteCategory("disney", mockGetToken);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/delete",
      expect.objectContaining({ body: JSON.stringify({ id: "disney" }) }),
    );
    vi.unstubAllGlobals();
  });

  it("deleteCategory — surfaces the server's reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "still has 3 cards" }), {
            status: 409,
          }),
      ),
    );
    await expect(deleteCategory("disney", mockGetToken)).rejects.toThrow(
      "still has 3 cards",
    );
    vi.unstubAllGlobals();
  });
});
