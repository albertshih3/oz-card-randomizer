import { BASE_COLLECTION_IDS, COLLECTION_IDS } from "@/constants/collections";
import {
  PACK_SLOT_LABELS,
  drawPack,
  isCompletePack,
  isValidPackCount,
  missingSlots,
  packCards,
} from "@/utils/pack-generation";
import { buildWorkbookRows } from "@/hooks/use-excel-export";
import type { Card, CardsByCollection, Collection } from "@/types/index";

vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));

const cards = (prefix: string, count: number): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix} ${i}`,
    number: String(i),
    collection: "",
    active: true,
  }));

const fullData = (): CardsByCollection => ({
  ...Object.fromEntries(BASE_COLLECTION_IDS.map((c) => [c, cards(c, 4)])),
  [COLLECTION_IDS.SPOONBILL]: cards("spoonbill", 2),
  disney: cards("disney", 3),
});

const eligible = (...ids: string[]): Collection[] =>
  ids.map((id) => ({ id, name: id, isWildcardEligible: true }));

const slot = (pack: ReturnType<typeof drawPack>, label: string) =>
  pack.slots.find((s) => s.label === label);

describe("drawPack", () => {
  it("fills all ten slots in fixed order", () => {
    const pack = drawPack(fullData(), eligible("disney"));
    expect(pack.slots.map((s) => s.label)).toEqual(PACK_SLOT_LABELS);
    expect(isCompletePack(pack)).toBe(true);
    expect(slot(pack, "Wildcard")?.card?.collection).toBe("disney");
    expect(slot(pack, "Spoonbill")?.card?.collection).toBe("spoonbill");
  });

  it("keeps a base-set wildcard in the wildcard slot", () => {
    const col = BASE_COLLECTION_IDS[0];
    const pack = drawPack(fullData(), eligible(col));
    expect(slot(pack, "Wildcard")?.card?.collection).toBe(col);
    expect(packCards(pack).filter((c) => c.collection === col)).toHaveLength(3);
  });

  it("reserves the only Spoonbill card for the fixed slot", () => {
    const data = {
      ...fullData(),
      [COLLECTION_IDS.SPOONBILL]: cards("spoonbill", 1),
    };
    for (let i = 0; i < 25; i++) {
      const pack = drawPack(data, eligible(COLLECTION_IDS.SPOONBILL));
      expect(slot(pack, "Spoonbill")?.card).not.toBeNull();
      expect(slot(pack, "Wildcard")?.card).toBeNull();
    }
  });

  it("allows a Spoonbill wildcard when a second card exists", () => {
    const pack = drawPack(fullData(), eligible(COLLECTION_IDS.SPOONBILL));
    expect(slot(pack, "Wildcard")?.card?.collection).toBe("spoonbill");
    expect(slot(pack, "Spoonbill")?.card?.id).not.toBe(
      slot(pack, "Wildcard")?.card?.id,
    );
  });

  it("reports one missing base slot by label", () => {
    const col = BASE_COLLECTION_IDS[0];
    const pack = drawPack(
      { ...fullData(), [col]: cards(col, 1) },
      eligible("disney"),
    );
    expect(missingSlots(pack)).toEqual(["Tropical Rainforest 2"]);
  });

  it("leaves the wildcard empty with no candidates", () => {
    expect(missingSlots(drawPack(fullData(), []))).toEqual(["Wildcard"]);
  });

  it("always finds the category with cards left, whatever the random draw", () => {
    const exhausted = BASE_COLLECTION_IDS[0];
    const data = { ...fullData(), [exhausted]: cards(exhausted, 2) };
    for (const value of [0, 0.5, 0.999]) {
      const pack = drawPack(data, eligible(exhausted, "disney"), () => value);
      expect(slot(pack, "Wildcard")?.card?.collection).toBe("disney");
    }
  });

  it("handles a catalog with no cards at all", () => {
    const pack = drawPack({}, []);
    expect(packCards(pack)).toEqual([]);
    expect(missingSlots(pack)).toHaveLength(10);
  });

  it("treats identical document ids in different collections as distinct", () => {
    const shared = (): Card[] => [
      { id: "same", name: "x", number: "1", collection: "", active: true },
      { id: "other", name: "y", number: "2", collection: "", active: true },
    ];
    const data = Object.fromEntries(
      [...BASE_COLLECTION_IDS, COLLECTION_IDS.SPOONBILL].map((c) => [
        c,
        shared(),
      ]),
    );
    data.disney = shared();
    const pack = drawPack(data, eligible("disney"));
    expect(isCompletePack(pack)).toBe(true);
  });

  it("never repeats a card within a pack", () => {
    const pack = drawPack(fullData(), eligible(...BASE_COLLECTION_IDS));
    const keys = packCards(pack).map((c) => `${c.collection}/${c.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("isValidPackCount", () => {
  it.each([1, 50, 1000])("accepts %d", (n) => {
    expect(isValidPackCount(n)).toBe(true);
  });

  it.each([0, -1, 1.5, 1001, NaN, Infinity, "5", null])("rejects %j", (n) => {
    expect(isValidPackCount(n)).toBe(false);
  });
});

describe("buildWorkbookRows", () => {
  it("keeps the column order and puts each card in its assigned slot", () => {
    const col = BASE_COLLECTION_IDS[0];
    const pack = drawPack(fullData(), eligible(col));
    const [row] = buildWorkbookRows([pack]);

    expect(Object.keys(row)).toEqual([
      "Pack #",
      ...PACK_SLOT_LABELS,
      "Warnings",
    ]);
    const wildcard = slot(pack, "Wildcard")?.card;
    expect(row["Wildcard"]).toBe(`#${wildcard?.number} - ${wildcard?.name}`);
    expect(row["Warnings"]).toBe("");
  });

  it("does not mistake a Spoonbill wildcard for the fixed card", () => {
    const pack = drawPack(fullData(), eligible(COLLECTION_IDS.SPOONBILL));
    const [row] = buildWorkbookRows([pack]);
    expect(row["Wildcard"]).not.toBe("");
    expect(row["Spoonbill"]).not.toBe("");
    expect(row["Wildcard"]).not.toBe(row["Spoonbill"]);
  });

  it("explains blank cells in the Warnings column", () => {
    const [row] = buildWorkbookRows([drawPack(fullData(), [])]);
    expect(row["Wildcard"]).toBe("");
    expect(row["Warnings"]).toBe("Incomplete (9 of 10): missing Wildcard");
  });

  it("produces a row for a zero-card pack", () => {
    const [row] = buildWorkbookRows([drawPack({}, [])]);
    expect(row["Pack #"]).toBe(1);
    expect(row["Warnings"]).toContain("Incomplete (0 of 10)");
  });
});
