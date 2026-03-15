import { useState } from "react";
import { event } from "@/lib/gtag";
import {
  BASE_COLLECTION_IDS,
  COLLECTION_DISPLAY_NAMES,
  COLLECTION_IDS,
} from "@/constants/collections";
import type { Card } from "@/types";

export function useExcelExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async (packs: Card[][]) => {
    if (!packs.length) {
      console.warn("No data to export");
      return;
    }

    event({
      action: "download",
      category: "export",
      label: "excel_export",
      value: packs.length,
    });

    setIsExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");

      // Construct sheet data
      const sheetData = packs.map((pack, index) => {
        const row: { [key: string]: any } = { "Pack #": index + 1 };

        // Order is load-bearing: controls pack slot assignment (cards 1–8) and Excel column order.
        // Defined in src/constants/collections.ts — do NOT reorder.
        BASE_COLLECTION_IDS.forEach((col) => {
          const cards = pack.filter((card) => card.collection === col);
          const displayName = COLLECTION_DISPLAY_NAMES[col] || col;
          row[`${displayName} 1`] = cards[0]
            ? `#${cards[0].number} - ${cards[0].name}`
            : "";
          row[`${displayName} 2`] = cards[1]
            ? `#${cards[1].number} - ${cards[1].name}`
            : "";
        });

        // Wildcard is whichever card is not a base-category card and not spoonbill.
        const wildcard = pack.find(
          (c) =>
            !(BASE_COLLECTION_IDS as readonly string[]).includes(
              c.collection,
            ) && c.collection !== COLLECTION_IDS.SPOONBILL,
        );
        row["Wildcard"] = wildcard
          ? `#${wildcard.number} - ${wildcard.name}`
          : "";

        const spoonbill = pack.find(
          (card) => card.collection === COLLECTION_IDS.SPOONBILL,
        );
        row["Spoonbill"] = spoonbill
          ? `#${spoonbill.number} - ${spoonbill.name}`
          : "";

        return row;
      });

      const ws = utils.json_to_sheet(sheetData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Booster Packs");
      writeFile(wb, "BoosterPacks.xlsx");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToExcel, isExporting };
}
