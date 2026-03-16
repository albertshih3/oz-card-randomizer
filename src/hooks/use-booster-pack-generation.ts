import { useState } from "react";
import { event, timing, exception } from "@/lib/gtag";
import { BASE_COLLECTION_IDS, COLLECTION_IDS } from "@/constants/collections";
import {
  MIN_WILDCARD_ATTEMPTS,
  RETRY_MULTIPLIER,
  PACK_HISTORY_LIMIT,
} from "@/constants/generation";
import type { Card, Collection, PackHistoryItem } from "@/types/index";

export function useBoosterPackGeneration(
  cardsData: { [key: string]: Card[] },
  collections: Collection[],
) {
  const [boosterPacks, setBoosterPacks] = useState<Card[][]>([]);
  const [packHistory, setPackHistory] = useState<PackHistoryItem[]>([]);
  const [lastGenTime, setLastGenTime] = useState<Date | null>(null);

  /**
   * Logging strategy for generateBoosterPack:
   *
   * Tier 1 — slot-draw-level warnings (addCard returns false for a single draw attempt):
   *   console.warn only. These are low-level transient conditions the draw loop handles
   *   by retrying or moving on. Not reported to GA — too granular and recoverable.
   *
   * Tier 2 — pack-level slot failures (a required pack slot could not be filled):
   *   console.warn + exception({ fatal: false }). These conditions mean the generated
   *   pack is structurally incomplete and should be surfaced in GA analytics.
   *   Applies to: wildcard slot exhausted after all attempts, no wildcard-eligible
   *   categories exist, spoonbill slot empty.
   *
   * Tier 3 — unexpected errors (caught by generatePacks try/catch):
   *   console.error + exception({ fatal: false }). Already handled in generatePacks.
   */
  const generateBoosterPack = () => {
    const startTime = performance.now();
    const pack: Card[] = [];
    const usedCards = new Set();

    const addCard = (col: string) => {
      const source = Array.isArray(cardsData[col]) ? cardsData[col] : [];
      const availableCards = source.filter(
        (card: Card) => !usedCards.has(`${col}-${card.id}`),
      );
      if (availableCards.length === 0) {
        console.warn(`No more available cards in ${col} collection`);
        return false;
      }

      const card =
        availableCards[Math.floor(Math.random() * availableCards.length)];
      pack.push({ ...card, collection: col });
      usedCards.add(`${col}-${card.id}`);
      return true;
    };

    // Order is load-bearing: controls pack slot assignment (cards 1–8) and Excel column order.
    // Defined in src/constants/collections.ts — do NOT reorder.
    for (const col of BASE_COLLECTION_IDS) {
      if (!addCard(col)) {
        console.warn(`Not enough cards in ${col} collection (card 1)`);
      }
      if (!addCard(col)) {
        console.warn(`Not enough cards in ${col} collection (card 2)`);
      }
    }

    // 9th card: from wildcard-eligible categories
    const eligibleCategories = Object.keys(cardsData).filter((id) => {
      const col = collections.find((c) => c.id === id);
      return (
        col?.isWildcardEligible &&
        Array.isArray(cardsData[id]) &&
        cardsData[id].length > 0
      );
    });

    if (eligibleCategories.length > 0) {
      let randomCollection: string | undefined;
      let attempts = 0;
      const maxAttempts = Math.max(
        MIN_WILDCARD_ATTEMPTS,
        eligibleCategories.length * RETRY_MULTIPLIER,
      );
      while (attempts < maxAttempts) {
        randomCollection =
          eligibleCategories[
            Math.floor(Math.random() * eligibleCategories.length)
          ];
        if (addCard(randomCollection)) break;
        attempts++;
      }
      if (attempts >= maxAttempts) {
        console.warn(
          `Failed to add a card from a random collection after ${maxAttempts} attempts`,
        );
        exception({
          description: `Wildcard slot unfilled after ${maxAttempts} attempts`,
          fatal: false,
        });
      }
    } else {
      console.warn(
        "No wildcard-eligible categories found; wildcard slot skipped",
      );
      exception({
        description:
          "Wildcard slot skipped: no wildcard-eligible categories found",
        fatal: false,
      });
    }

    if (!addCard(COLLECTION_IDS.SPOONBILL)) {
      console.warn("Not enough cards in spoonbill collection");
      exception({
        description:
          "Spoonbill slot unfilled: no available cards in spoonbill collection",
        fatal: false,
      });
    }

    const endTime = performance.now();
    return { pack, duration: Math.round(endTime - startTime) };
  };

  const generatePacks = (count: number): Card[][] => {
    let newPacks: Card[][] = [];
    try {
      event({
        action: "generate",
        category: "booster_pack",
        label: "multiple_packs",
        value: count,
      });

      // Archive current packs to history if they exist
      if (boosterPacks.length > 0) {
        const historyItems: PackHistoryItem[] = boosterPacks.map((pack) => ({
          id: crypto.randomUUID(),
          timestamp: lastGenTime || new Date(),
          cards: pack,
        }));

        setPackHistory((prev) => {
          const updated = [...historyItems, ...prev].slice(
            0,
            PACK_HISTORY_LIMIT,
          );
          return updated;
        });
      }

      newPacks = [];
      let totalDuration = 0;
      for (let i = 0; i < count; i++) {
        const { pack, duration } = generateBoosterPack();
        newPacks.push(pack);
        totalDuration += duration;
      }

      setBoosterPacks(newPacks);
      setLastGenTime(new Date());

      timing({
        name: "pack_generation",
        value: totalDuration,
        category: "performance",
        label: "multiple_packs",
      });
    } catch (err) {
      console.error("Error generating packs:", err);
      exception({
        description: `Failed to generate booster packs: ${err}`,
        fatal: false,
      });
    }
    return newPacks;
  };

  return { boosterPacks, packHistory, lastGenTime, generatePacks };
}
