/**
 * Pack generation tuning constants.
 *
 * These values are referenced by:
 *   - src/hooks/use-booster-pack-generation.ts (wildcard draw logic, history cap)
 *   - src/pages/index.tsx (UI labels, input constraints)
 */

/** Minimum wildcard draw attempts regardless of eligible pool size. */
export const MIN_WILDCARD_ATTEMPTS = 10;

/** Multiplier applied to eligible pool size to scale maximum wildcard draw attempts. */
export const RETRY_MULTIPLIER = 2;

/** Maximum number of historical generation runs to retain in the pack history list. */
export const PACK_HISTORY_LIMIT = 10;

/** Maximum number of packs allowed in a single export operation (enforced by the UI input). */
export const MAX_PACKS_PER_EXPORT = 1000;
