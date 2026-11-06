import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Card, CardsByCollection } from "@/types/index";

/** Enough parallelism to avoid a read waterfall without a burst of requests. */
const READ_CONCURRENCY = 4;

/**
 * Builds a Card from a stored document, or null if it cannot be displayed.
 * Identity comes from the snapshot and is assigned last: legacy documents carry
 * their own `collection` field, which must not override where they really live.
 * Legacy cards may store `number` as an integer and may omit `active`.
 */
export function parseCard(
  id: string,
  collectionId: string,
  data: Record<string, unknown>,
): Card | null {
  const { name, number } = data;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (typeof number !== "string" && typeof number !== "number") return null;
  return {
    name,
    number: String(number),
    active: data.active !== false,
    id,
    collection: collectionId,
  };
}

export interface CollectionRead {
  cards: Card[];
  malformed: number;
}

export async function readCollection(
  collectionId: string,
): Promise<CollectionRead> {
  const snapshot = await getDocs(collection(db, collectionId));
  const cards: Card[] = [];
  let malformed = 0;
  snapshot.forEach((docSnap) => {
    const card = parseCard(docSnap.id, collectionId, docSnap.data());
    if (card) {
      cards.push(card);
    } else {
      malformed += 1;
      console.warn(`Skipped malformed card ${collectionId}/${docSnap.id}`);
    }
  });
  return { cards, malformed };
}

export interface CatalogRead {
  byCollection: CardsByCollection;
  malformed: number;
}

/** Reads several collections with bounded parallelism. Rejects if any fails. */
export async function readCollections(ids: string[]): Promise<CatalogRead> {
  const byCollection: CardsByCollection = {};
  let malformed = 0;
  const queue = [...ids];

  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const result = await readCollection(id);
      byCollection[id] = result.cards;
      malformed += result.malformed;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, ids.length) }, worker),
  );
  return { byCollection, malformed };
}
