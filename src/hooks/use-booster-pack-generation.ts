import { useState } from "react";
import { event, timing, exception } from "@/lib/gtag";
import { PACK_HISTORY_LIMIT } from "@/constants/generation";
import {
  drawPack,
  isValidPackCount,
  missingSlots,
  packCards,
} from "@/utils/pack-generation";
import type {
  CardsByCollection,
  Collection,
  GeneratedPack,
  PackHistoryItem,
} from "@/types/index";

export function useBoosterPackGeneration(
  cardsData: CardsByCollection,
  collections: Collection[],
) {
  const [boosterPacks, setBoosterPacks] = useState<GeneratedPack[]>([]);
  const [packHistory, setPackHistory] = useState<PackHistoryItem[]>([]);
  const [lastGenTime, setLastGenTime] = useState<Date | null>(null);

  /**
   * Generates `count` packs, or returns an empty array without touching state
   * if the count is invalid or generation fails. Events fire only after the
   * work succeeds. Shortages are reported once per run rather than once per
   * pack, so a large export sends one analytics exception.
   */
  const generatePacks = (count: number): GeneratedPack[] => {
    if (!isValidPackCount(count)) {
      console.warn(`Rejected invalid pack count: ${count}`);
      return [];
    }

    try {
      const startTime = performance.now();
      const newPacks = Array.from({ length: count }, () =>
        drawPack(cardsData, collections),
      );
      const duration = Math.round(performance.now() - startTime);

      if (boosterPacks.length > 0) {
        const historyItems: PackHistoryItem[] = boosterPacks.map((pack) => ({
          id: crypto.randomUUID(),
          timestamp: lastGenTime || new Date(),
          cards: packCards(pack),
          missing: missingSlots(pack),
        }));
        setPackHistory((prev) =>
          [...historyItems, ...prev].slice(0, PACK_HISTORY_LIMIT),
        );
      }

      setBoosterPacks(newPacks);
      setLastGenTime(new Date());

      event("generate", { content_type: "booster_pack", pack_count: count });
      timing("pack_generation", duration, { pack_count: count });

      const incomplete = newPacks.filter((p) => missingSlots(p).length > 0);
      if (incomplete.length > 0) {
        const labels = new Set(incomplete.flatMap(missingSlots));
        console.warn(`${incomplete.length} of ${count} packs incomplete`);
        exception({
          description: `${incomplete.length} of ${count} packs incomplete: ${[...labels].join(", ")}`,
          fatal: false,
        });
      }

      return newPacks;
    } catch (err) {
      console.error("Error generating packs:", err);
      exception({
        description: `Failed to generate booster packs: ${err}`,
        fatal: false,
      });
      return [];
    }
  };

  return { boosterPacks, packHistory, lastGenTime, generatePacks };
}
