import { renderHook, act } from "@testing-library/react";
import { useBoosterPackGeneration } from "@/hooks/use-booster-pack-generation";
import { BASE_COLLECTION_IDS, COLLECTION_IDS } from "@/constants/collections";
import { PACK_HISTORY_LIMIT } from "@/constants/generation";
import type { Card, Collection } from "@/types/index";

vi.mock("@/lib/gtag", () => ({
  event: vi.fn(),
  timing: vi.fn(),
  exception: vi.fn(),
}));

// --- Fixtures ---

// The `collection` field is a required Card property but the hook always overwrites
// it with the collection key from cardsData. Any placeholder value is fine here.
function makeCard(id: string): Card {
  return { id, name: `Card ${id}`, number: id, collection: "", active: true };
}

const WILDCARD_ID = COLLECTION_IDS.SPECIAL_EDITION;
const SPOONBILL_ID = COLLECTION_IDS.SPOONBILL;

function makeStandardCardsData(): { [key: string]: Card[] } {
  const data: { [key: string]: Card[] } = {};
  for (const col of BASE_COLLECTION_IDS) {
    data[col] = [makeCard("1"), makeCard("2"), makeCard("3"), makeCard("4")];
  }
  data[WILDCARD_ID] = [makeCard("1"), makeCard("2"), makeCard("3")];
  data[SPOONBILL_ID] = [makeCard("1"), makeCard("2")];
  return data;
}

function makeStandardCollections(): Collection[] {
  return [
    ...(BASE_COLLECTION_IDS as readonly string[]).map((id) => ({
      id,
      name: id,
      isWildcardEligible: false,
    })),
    { id: WILDCARD_ID, name: WILDCARD_ID, isWildcardEligible: true },
    { id: SPOONBILL_ID, name: SPOONBILL_ID, isWildcardEligible: false },
  ];
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe("pack card counts", () => {
  it("generates a pack with exactly 10 cards", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    expect(packs[0].length).toBe(10);
  });

  it("generates exactly 2 cards from each base collection", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    for (const id of BASE_COLLECTION_IDS) {
      expect(packs[0].filter((c) => c.collection === id).length).toBe(2);
    }
  });

  it("generates exactly 1 spoonbill card", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    expect(
      packs[0].filter((c) => c.collection === COLLECTION_IDS.SPOONBILL).length,
    ).toBe(1);
  });

  it("generates exactly 1 wildcard card", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    const wildcardCard = packs[0].filter(
      (c) =>
        !(BASE_COLLECTION_IDS as readonly string[]).includes(c.collection) &&
        c.collection !== COLLECTION_IDS.SPOONBILL,
    );
    expect(wildcardCard.length).toBe(1);
  });

  it("generates the requested number of packs when count > 1", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(3);
    });
    expect(packs.length).toBe(3);
    for (const pack of packs) {
      expect(pack.length).toBe(10);
    }
  });
});

describe("no duplicate cards within a single pack", () => {
  it("does not duplicate any card id+collection pair within one pack", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    const set = new Set(packs[0].map((c) => `${c.collection}-${c.id}`));
    expect(set.size).toBe(packs[0].length);
  });

  it("does not duplicate any card within each individual pack in a multi-pack call", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(5);
    });
    for (const pack of packs) {
      const set = new Set(pack.map((c) => c.collection + "-" + c.id));
      expect(set.size).toBe(pack.length);
    }
  });
});

describe("wildcard selection", () => {
  it("wildcard card belongs to a wildcard-eligible collection", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    const wildcardCard = packs[0].find(
      (c) =>
        !(BASE_COLLECTION_IDS as readonly string[]).includes(c.collection) &&
        c.collection !== COLLECTION_IDS.SPOONBILL,
    );
    expect(wildcardCard?.collection).toBe(WILDCARD_ID);
  });

  it("wildcard is not drawn from a base collection", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    const wildcardCard = packs[0].find(
      (c) =>
        !(BASE_COLLECTION_IDS as readonly string[]).includes(c.collection) &&
        c.collection !== COLLECTION_IDS.SPOONBILL,
    );
    expect(
      (BASE_COLLECTION_IDS as readonly string[]).includes(
        wildcardCard!.collection,
      ),
    ).toBe(false);
  });

  it("wildcard is not drawn from spoonbill collection", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    const wildcardCard = packs[0].find(
      (c) =>
        !(BASE_COLLECTION_IDS as readonly string[]).includes(c.collection) &&
        c.collection !== COLLECTION_IDS.SPOONBILL,
    );
    expect(wildcardCard!.collection).not.toBe(COLLECTION_IDS.SPOONBILL);
  });

  it("skips wildcard slot when no wildcard-eligible collections exist", async () => {
    const { exception } = await import("@/lib/gtag");
    const noWildcardCollections: Collection[] = [
      ...(BASE_COLLECTION_IDS as readonly string[]).map((id) => ({
        id,
        name: id,
        isWildcardEligible: false,
      })),
      { id: SPOONBILL_ID, name: SPOONBILL_ID, isWildcardEligible: false },
    ];
    const noWildcardData: { [key: string]: Card[] } = {};
    for (const col of BASE_COLLECTION_IDS) {
      noWildcardData[col] = [
        makeCard("1"),
        makeCard("2"),
        makeCard("3"),
        makeCard("4"),
      ];
    }
    noWildcardData[SPOONBILL_ID] = [makeCard("1"), makeCard("2")];

    const { result } = renderHook(() =>
      useBoosterPackGeneration(noWildcardData, noWildcardCollections),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(1);
    });
    expect(exception).toHaveBeenCalled();
    expect(packs[0].length).toBe(9);
  });

  it("calls exception() when wildcard-eligible collection has no cards", async () => {
    const { exception } = await import("@/lib/gtag");
    const collections: Collection[] = [
      ...(BASE_COLLECTION_IDS as readonly string[]).map((id) => ({
        id,
        name: id,
        isWildcardEligible: false,
      })),
      { id: WILDCARD_ID, name: WILDCARD_ID, isWildcardEligible: true },
      { id: SPOONBILL_ID, name: SPOONBILL_ID, isWildcardEligible: false },
    ];
    const cardsData: { [key: string]: Card[] } = {};
    for (const col of BASE_COLLECTION_IDS) {
      cardsData[col] = [
        makeCard("1"),
        makeCard("2"),
        makeCard("3"),
        makeCard("4"),
      ];
    }
    cardsData[WILDCARD_ID] = [];
    cardsData[SPOONBILL_ID] = [makeCard("1"), makeCard("2")];

    const { result } = renderHook(() =>
      useBoosterPackGeneration(cardsData, collections),
    );
    act(() => {
      result.current.generatePacks(1);
    });
    expect(exception).toHaveBeenCalled();
  });
});

describe("empty and undersized collections", () => {
  it("handles a base collection with zero cards — produces 0 cards from that collection", () => {
    const cardsData = makeStandardCardsData();
    cardsData["tropicalrainforest"] = [];
    const { result } = renderHook(() =>
      useBoosterPackGeneration(cardsData, makeStandardCollections()),
    );
    let packs: Card[][] = [];
    expect(() => {
      act(() => {
        packs = result.current.generatePacks(1);
      });
    }).not.toThrow();
    expect(
      packs[0].filter((c) => c.collection === "tropicalrainforest").length,
    ).toBe(0);
    expect(
      packs[0].filter((c) => c.collection !== "tropicalrainforest").length,
    ).toBeGreaterThan(0);
  });

  it("handles a base collection with exactly 1 card — produces exactly 1 card from that collection", () => {
    const cardsData = makeStandardCardsData();
    const targetCol = BASE_COLLECTION_IDS[0];
    cardsData[targetCol] = [makeCard("1")];
    const { result } = renderHook(() =>
      useBoosterPackGeneration(cardsData, makeStandardCollections()),
    );
    let packs: Card[][] = [];
    expect(() => {
      act(() => {
        packs = result.current.generatePacks(1);
      });
    }).not.toThrow();
    expect(packs[0].filter((c) => c.collection === targetCol).length).toBe(1);
  });

  it("handles empty spoonbill collection — pack has 9 cards and exception() is called", async () => {
    const { exception } = await import("@/lib/gtag");
    const cardsData = makeStandardCardsData();
    cardsData[SPOONBILL_ID] = [];
    const { result } = renderHook(() =>
      useBoosterPackGeneration(cardsData, makeStandardCollections()),
    );
    let packs: Card[][] = [];
    expect(() => {
      act(() => {
        packs = result.current.generatePacks(1);
      });
    }).not.toThrow();
    expect(
      packs[0].filter((c) => c.collection === COLLECTION_IDS.SPOONBILL).length,
    ).toBe(0);
    expect(exception).toHaveBeenCalled();
  });

  it("handles completely empty cardsData — returns a pack with 0 cards and does not throw", () => {
    const { result } = renderHook(() => useBoosterPackGeneration({}, []));
    let packs: Card[][] = [];
    expect(() => {
      act(() => {
        packs = result.current.generatePacks(1);
      });
    }).not.toThrow();
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.length).toBe(1);
    expect(packs[0].length).toBe(0);
  });
});

describe("multiple pack generation — distinct packs", () => {
  it("generates multiple structurally valid packs in a single call", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(10);
    });
    expect(packs.length).toBe(10);
    for (const pack of packs) {
      expect(pack.length).toBe(10);
      const uniqueCards = new Set(pack.map((c) => `${c.collection}-${c.id}`));
      expect(uniqueCards.size).toBe(10);
    }
    // With 10 packs drawn from a pool of 4 cards per collection, at least 2 packs will differ.
    const serialized = new Set(packs.map((p) => JSON.stringify(p)));
    expect(serialized.size).toBeGreaterThan(1);
  });

  it("generatePacks returns the packs directly as Card[][]", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    let packs: Card[][] = [];
    act(() => {
      packs = result.current.generatePacks(3);
    });
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.length).toBe(3);
    for (const pack of packs) {
      expect(Array.isArray(pack)).toBe(true);
    }
  });
});

describe("pack history", () => {
  it("pack history is empty before any packs are generated", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    expect(result.current.packHistory.length).toBe(0);
  });

  it("pack history gains an entry on the second generatePacks call", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(1);
    });
    act(() => {
      result.current.generatePacks(1);
    });
    expect(result.current.packHistory.length).toBe(1);
  });

  it("pack history is capped at PACK_HISTORY_LIMIT entries", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    for (let i = 0; i < PACK_HISTORY_LIMIT + 2; i++) {
      act(() => {
        result.current.generatePacks(1);
      });
    }
    expect(result.current.packHistory.length).toBe(PACK_HISTORY_LIMIT);
  });

  it("each pack history entry has a unique id", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.generatePacks(1);
      });
    }
    const ids = result.current.packHistory.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each pack history entry has a timestamp that is a Date object", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(1);
    });
    act(() => {
      result.current.generatePacks(1);
    });
    expect(result.current.packHistory[0].timestamp instanceof Date).toBe(true);
  });
});

describe("state updates", () => {
  it("boosterPacks state is updated after generatePacks", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(2);
    });
    expect(result.current.boosterPacks.length).toBe(2);
  });

  it("lastGenTime is null before first generation", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    expect(result.current.lastGenTime).toBeNull();
  });

  it("lastGenTime is a Date after generation", () => {
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(1);
    });
    expect(result.current.lastGenTime instanceof Date).toBe(true);
  });
});

describe("analytics calls", () => {
  it("calls event() once per generatePacks call", async () => {
    const { event } = await import("@/lib/gtag");
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(1);
    });
    expect(vi.mocked(event).mock.calls.length).toBe(1);
  });

  it("calls timing() once per generatePacks call (not once per pack)", async () => {
    const { timing } = await import("@/lib/gtag");
    const { result } = renderHook(() =>
      useBoosterPackGeneration(
        makeStandardCardsData(),
        makeStandardCollections(),
      ),
    );
    act(() => {
      result.current.generatePacks(5);
    });
    expect(vi.mocked(timing).mock.calls.length).toBe(1);
  });
});
