type Row = Record<string, unknown> & { id: string };

interface E2EFirestore {
  categories?: Row[];
  cards?: Record<string, Row[]>;
  delayMs?: number;
  fail?: boolean;
}

declare global {
  interface Window {
    __E2E_FIRESTORE__?: E2EFirestore;
  }
}

const defaultCategories: Row[] = [
  "africansavanna",
  "californiatrail",
  "childrenszoo",
  "tropicalrainforest",
  "spoonbill",
  "disney",
].map((id) => ({
  id,
  name: id,
  displayName: id,
  isWildcardEligible: id === "disney",
}));

const config = () => window.__E2E_FIRESTORE__ ?? {};

const rows = (path: string): Row[] => {
  const { categories = defaultCategories, cards } = config();
  if (path === "categories") return categories;
  return (
    cards?.[path] ??
    Array.from({ length: 4 }, (_, i) => ({
      id: `${path}-${i}`,
      name: `${path} card ${i}`,
      number: String(i + 1),
      active: true,
    }))
  );
};

const snapshot = (items: Row[]) => {
  const docs = items.map(({ id, ...data }) => ({
    id,
    data: () => data,
    exists: () => true,
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (fn: (doc: (typeof docs)[number]) => void) => docs.forEach(fn),
  };
};

export const getFirestore = () => ({});
export const collection = (_db: unknown, path: string) => ({ path });
export const doc = (_db: unknown, ...segments: string[]) => ({
  path: segments.join("/"),
});
export const getDocs = async ({ path }: { path: string }) => {
  const { delayMs = 0, fail } = config();
  if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (fail) throw new Error("e2e firestore failure");
  return snapshot(rows(path));
};
export const getDoc = async () => ({
  exists: () => false,
  data: () => undefined,
});
export const getCountFromServer = async ({ path }: { path: string }) => ({
  data: () => ({ count: rows(path).length }),
});
export const runTransaction = async (
  _db: unknown,
  fn: (tx: unknown) => Promise<unknown>,
) =>
  fn({
    get: async () => ({ exists: () => false }),
    set: () => {},
    update: () => {},
    delete: () => {},
  });
export const addDoc = async () => ({ id: "e2e-new" });
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const writeBatch = () => ({
  set: () => {},
  update: () => {},
  delete: () => {},
  commit: async () => {},
});
