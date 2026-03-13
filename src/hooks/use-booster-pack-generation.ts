import { useState } from "react";
import { event, timing, exception } from "@/lib/gtag";
import { BASE_COLLECTION_IDS } from "@/constants/collections";
import type { Card, Collection, PackHistoryItem } from "@/types/index";

/** Minimum wildcard draw attempts regardless of eligible pool size. */
const MIN_WILDCARD_ATTEMPTS = 10;
/** Attempts per eligible category before giving up on wildcard slot. */
const RETRY_MULTIPLIER = 2;

export function useBoosterPackGeneration(
  cardsData: { [key: string]: Card[] },
  collections: Collection[],
) {
  const [boosterPacks, setBoosterPacks] = useState<Card[][]>([]);
  const [packHistory, setPackHistory] = useState<PackHistoryItem[]>([]);
  const [lastGenTime, setLastGenTime] = useState<Date | null>(null);

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
      }
    } else {
      console.warn(
        "No wildcard-eligible categories found; wildcard slot skipped",
      );
    }

    if (!addCard("spoonbill")) {
      console.warn("Not enough cards in spoonbill collection");
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
          const updated = [...historyItems, ...prev].slice(0, 10);
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
