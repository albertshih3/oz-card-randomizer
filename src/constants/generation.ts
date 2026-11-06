/**
 * Pack generation tuning constants.
 *
 * These values are referenced by:
 *   - src/utils/pack-generation.ts (pack size, count validation)
 *   - src/hooks/use-booster-pack-generation.ts (history cap)
 *   - src/pages/index.tsx (UI labels, input constraints)
 */

/** Cards in a complete pack: eight base, one wildcard, one Spoonbill. */
export const PACK_SIZE = 10;

/** Maximum number of historical generation runs to retain in the pack history list. */
export const PACK_HISTORY_LIMIT = 10;

/** Maximum number of packs allowed in a single export operation (enforced at the generation boundary). */
export const MAX_PACKS_PER_EXPORT = 1000;
