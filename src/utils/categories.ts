import {
  collection,
  doc,
  getDocs,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureFirebaseAuth } from "@/lib/firebase-auth";
import type { GetToken } from "@/lib/firebase-auth";

export interface Category {
  id: string;
  name: string;
  displayName: string;
  isWildcardEligible?: boolean;
}

// Only confirmed reads are cached, so a transient failure is retried next time.
let cachedCategories: Category[] | null = null;
let pendingRead: Promise<Category[]> | null = null;
/** Bumped on invalidation so a read already in flight is not cached afterward. */
let cacheVersion = 0;

const readCategories = async (): Promise<Category[]> => {
  const snapshot = await getDocs(collection(db, "categories"));
  const categories: Category[] = [];
  const seenNames = new Set<string>();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const name =
      typeof data.name === "string" && data.name ? data.name : docSnap.id;

    // Legacy data has several documents per name. First in document order wins.
    if (seenNames.has(name)) return;
    seenNames.add(name);
    categories.push({
      id: docSnap.id,
      name,
      displayName: data.displayName || data.name || docSnap.id,
      isWildcardEligible: data.isWildcardEligible === true,
    });
  });

  return categories;
};

/**
 * Reads category metadata. Read-only: an empty result is returned as empty, and
 * failures reject so callers can show an error instead of mistaking them for
 * valid data. Concurrent callers share one request.
 */
export const getCategories = async (): Promise<Category[]> => {
  if (cachedCategories) return cachedCategories;
  if (pendingRead) return pendingRead;

  const startedAt = cacheVersion;
  const read = readCategories()
    .then((categories) => {
      if (startedAt === cacheVersion) cachedCategories = categories;
      return categories;
    })
    .finally(() => {
      if (pendingRead === read) pendingRead = null;
    });
  pendingRead = read;
  return read;
};

// Clear cache when categories are updated
export const clearCategoriesCache = (): void => {
  cachedCategories = null;
  pendingRead = null;
  cacheVersion += 1;
};

// Convert categories to the legacy format for compatibility
export const categoriesToLegacyFormat = (categories: Category[]) => {
  return categories.map((cat) => ({
    id: cat.name,
    name: cat.displayName,
    isWildcardEligible: cat.isWildcardEligible,
  }));
};

/** Thrown for a problem the person can act on. The message is safe to show. */
export class CategoryError extends Error {}

/**
 * Creates a category, refusing to overwrite. The transaction makes concurrent
 * creates safe, and the name check covers legacy auto-ID documents.
 */
export const createCategory = async (
  displayName: string,
  categoryId: string,
  getToken: GetToken,
): Promise<void> => {
  await ensureFirebaseAuth(getToken);

  clearCategoriesCache();
  const existing = await getCategories();
  if (existing.some((c) => c.name === categoryId)) {
    throw new CategoryError(
      `A category with ID "${categoryId}" already exists.`,
    );
  }

  const ref = doc(db, "categories", categoryId);
  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) {
      throw new CategoryError(
        `A category with ID "${categoryId}" already exists.`,
      );
    }
    tx.set(ref, {
      name: categoryId,
      displayName,
      isWildcardEligible: false,
    });
  });
  clearCategoriesCache();
};

export const updateCategoryDisplayName = async (
  categoryId: string,
  displayName: string,
  getToken: GetToken,
): Promise<void> => {
  await ensureFirebaseAuth(getToken);
  await updateDoc(doc(db, "categories", categoryId), { displayName });
  clearCategoriesCache();
};

export const toggleWildcardEligible = async (
  categoryId: string,
  value: boolean,
  getToken: GetToken,
): Promise<void> => {
  await ensureFirebaseAuth(getToken);
  await updateDoc(doc(db, "categories", categoryId), {
    isWildcardEligible: value,
  });
  clearCategoriesCache();
};

/** Deletion runs on the server, which can guarantee the category is empty. */
export const deleteCategory = async (
  categoryId: string,
  getToken: GetToken,
): Promise<void> => {
  const token = await getToken();
  if (!token)
    throw new CategoryError("Your session has expired. Sign in again.");

  const res = await fetch("/api/categories/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: categoryId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new CategoryError(body.error ?? "Failed to delete category.");
  }
  clearCategoriesCache();
};
