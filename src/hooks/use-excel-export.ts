import { useState } from "react";
import { event } from "@/lib/gtag";
import { PACK_SIZE } from "@/constants/generation";
import {
  PACK_SLOT_LABELS,
  missingSlots,
  packCards,
} from "@/utils/pack-generation";
import type { GeneratedPack } from "@/types";

export const WORKBOOK_FILE_NAME = "BoosterPacks.xlsx";

/** One row per pack. Cells come from slots, never from a card's collection. */
export function buildWorkbookRows(
  packs: GeneratedPack[],
): Record<string, string | number>[] {
  return packs.map((pack, index) => {
    const row: Record<string, string | number> = { "Pack #": index + 1 };
    for (const label of PACK_SLOT_LABELS) {
      const card = pack.slots.find((slot) => slot.label === label)?.card;
      row[label] = card ? `#${card.number} - ${card.name}` : "";
    }
    const missing = missingSlots(pack);
    row["Warnings"] =
      missing.length > 0
        ? `Incomplete (${packCards(pack).length} of ${PACK_SIZE}): missing ${missing.join(", ")}`
        : "";
    return row;
  });
}

export function useExcelExport() {
  const [isExporting, setIsExporting] = useState(false);

  /** Rejects if the workbook cannot be built, so callers can offer a retry. */
  const exportToExcel = async (packs: GeneratedPack[]) => {
    if (!packs.length) {
      console.warn("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");

      const ws = utils.json_to_sheet(buildWorkbookRows(packs));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Booster Packs");
      writeFile(wb, WORKBOOK_FILE_NAME);

      // Marks the browser download being started, not a confirmed saved file.
      event("download", {
        file_name: WORKBOOK_FILE_NAME,
        file_extension: "xlsx",
        pack_count: packs.length,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToExcel, isExporting };
}
