vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue({}),
}));
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: {} } }));

import {
  createCategory,
  updateCategoryDisplayName,
  toggleWildcardEligible,
  deleteCategory,
  clearCategoriesCache,
} from "@/utils/categories";
import { setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const mockGetToken = vi.fn().mockResolvedValue("fake-token");

beforeEach(() => {
  vi.clearAllMocks();
  clearCategoriesCache();
});

describe("Category CRUD — OAK-57", () => {
  it("createCategory — calls setDoc and clears cache", async () => {
    await createCategory("Test Category", "testcategory", mockGetToken);
    expect(setDoc).toHaveBeenCalledTimes(1);
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

  it("deleteCategory — calls deleteDoc", async () => {
    await deleteCategory("africansavanna", mockGetToken);
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
