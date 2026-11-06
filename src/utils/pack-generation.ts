import {
  BASE_COLLECTION_IDS,
  COLLECTION_DISPLAY_NAMES,
  COLLECTION_IDS,
} from "@/constants/collections";
import { MAX_PACKS_PER_EXPORT, PACK_SIZE } from "@/constants/generation";
import type {
  Card,
  CardsByCollection,
  Collection,
  GeneratedPack,
  PackSlot,
} from "@/types/index";

/** Column labels double as slot labels, so the UI and workbook always agree. */
const baseSlotLabel = (collectionId: string, position: number) =>
  `${COLLECTION_DISPLAY_NAMES[collectionId] ?? collectionId} ${position}`;

export const WILDCARD_LABEL = "Wildcard";
export const SPOONBILL_LABEL = "Spoonbill";

/** Every slot label in pack order. Order controls workbook columns. */
export const PACK_SLOT_LABELS: readonly string[] = [
  ...BASE_COLLECTION_IDS.flatMap((col) => [
    baseSlotLabel(col, 1),
    baseSlotLabel(col, 2),
  ]),
  WILDCARD_LABEL,
  SPOONBILL_LABEL,
];

export const packCards = (pack: GeneratedPack): Card[] =>
  pack.slots.flatMap((slot) => (slot.card ? [slot.card] : []));

export const missingSlots = (pack: GeneratedPack): string[] =>
  pack.slots.filter((slot) => !slot.card).map((slot) => slot.label);

export const isCompletePack = (pack: GeneratedPack): boolean =>
  packCards(pack).length === PACK_SIZE;

export const isValidPackCount = (count: unknown): count is number =>
  typeof count === "number" &&
  Number.isInteger(count) &&
  count >= 1 &&
  count <= MAX_PACKS_PER_EXPORT;

/**
 * Draws one pack. Selection chooses only among cards still available, so a
 * slot goes empty only when no eligible card exists. Incomplete packs are
 * allowed and reported through empty slots.
 *
 * The fixed Spoonbill slot draws before the wildcard: Spoonbill may be
 * wildcard-eligible, and the wildcard must not take the only fixed-slot card.
 * Slot order in the result is unaffected by draw order.
 */
export function drawPack(
  cardsData: CardsByCollection,
  collections: Collection[],
  random: () => number = Math.random,
): GeneratedPack {
  const used = new Set<string>();
  const available = (collection: string) =>
    (cardsData[collection] ?? []).filter(
      (card) => !used.has(`${collection}/${card.id}`),
    );

  const draw = (collection: string): Card | null => {
    const pool = available(collection);
    if (pool.length === 0) return null;
    const card = pool[Math.floor(random() * pool.length)];
    used.add(`${collection}/${card.id}`);
    return { ...card, collection };
  };

  const baseSlots: PackSlot[] = BASE_COLLECTION_IDS.flatMap((col) =>
    [1, 2].map((position) => ({
      kind: "base" as const,
      label: baseSlotLabel(col, position),
      card: draw(col),
    })),
  );

  const spoonbill: PackSlot = {
    kind: "spoonbill",
    label: SPOONBILL_LABEL,
    card: draw(COLLECTION_IDS.SPOONBILL),
  };

  const wildcardPool = collections
    .filter((c) => c.isWildcardEligible && available(c.id).length > 0)
    .map((c) => c.id);
  const wildcard: PackSlot = {
    kind: "wildcard",
    label: WILDCARD_LABEL,
    card:
      wildcardPool.length > 0
        ? draw(wildcardPool[Math.floor(random() * wildcardPool.length)])
        : null,
  };

  return { slots: [...baseSlots, wildcard, spoonbill] };
}
