export const COLLECTION_IDS = {
  TROPICAL_RAINFOREST: "tropicalrainforest",
  CHILDRENS_ZOO: "childrenszoo",
  CALIFORNIA_TRAIL: "californiatrail",
  AFRICAN_SAVANNA: "africansavanna",
  SPECIAL_EDITION: "specialedition",
  BOO_AT_THE_ZOO: "booatthezoo",
  ARCAS: "arcas",
  NEW_NATURE_FOUNDATION: "newnaturefoundation",
  DISNEY: "disney",
  SPOONBILL: "spoonbill",
} as const;

/** Order matters -- controls pack slot assignment AND export column order. Do NOT reorder. */
export const BASE_COLLECTION_IDS = [
  COLLECTION_IDS.TROPICAL_RAINFOREST,
  COLLECTION_IDS.CHILDRENS_ZOO,
  COLLECTION_IDS.CALIFORNIA_TRAIL,
  COLLECTION_IDS.AFRICAN_SAVANNA,
] as const satisfies readonly string[];

export const COLLECTION_DISPLAY_NAMES: Record<string, string> = {
  [COLLECTION_IDS.TROPICAL_RAINFOREST]: "Tropical Rainforest",
  [COLLECTION_IDS.CHILDRENS_ZOO]: "Children's Zoo",
  [COLLECTION_IDS.CALIFORNIA_TRAIL]: "California Trail",
  [COLLECTION_IDS.AFRICAN_SAVANNA]: "African Savanna",
  [COLLECTION_IDS.SPECIAL_EDITION]: "Special Edition",
  [COLLECTION_IDS.BOO_AT_THE_ZOO]: "Boo at the Zoo",
  [COLLECTION_IDS.ARCAS]: "ARCAS",
  [COLLECTION_IDS.NEW_NATURE_FOUNDATION]: "New Nature Foundation",
  [COLLECTION_IDS.DISNEY]: "Disney",
  [COLLECTION_IDS.SPOONBILL]: "Spoonbill",
};

// Colors are defined only for the six collections that appear in badge UI.
// arcas, newnaturefoundation, disney, and spoonbill intentionally use the
// fallback color ("bg-primary/10 text-primary") defined in collection-badge.tsx.
export const COLLECTION_COLORS: Record<string, string> = {
  [COLLECTION_IDS.CHILDRENS_ZOO]: "bg-teal-500 text-white",
  [COLLECTION_IDS.TROPICAL_RAINFOREST]: "bg-purple-300 text-purple-900",
  [COLLECTION_IDS.BOO_AT_THE_ZOO]: "bg-orange-500 text-white",
  [COLLECTION_IDS.CALIFORNIA_TRAIL]: "bg-orange-400 text-white",
  [COLLECTION_IDS.AFRICAN_SAVANNA]: "bg-lime-400 text-black",
  [COLLECTION_IDS.SPECIAL_EDITION]: "bg-yellow-500 text-black",
};
