# Oakland Zoo Booster Pack Generator - Development Notes

This document contains important development context, patterns, and decisions for AI coding assistants working on this project.

## Project Overview

Web application for generating randomized trading card booster packs for Oakland Zoo's Learning & Engagement program. Built with React, TypeScript, Vite, and Firebase.

**Live URL**: https://ozboosterpacks.albertshih.org

## Recent Changes

### March 13, 2026 - Code Quality: Type Safety + Structural Fixes + Analytics Separation (OAK-38, OAK-39, OAK-40, v2.0.9)

**Released as v2.0.9** — `src/data/changelog.json` updated; `2.0.8` entry marked `isCurrent: false`.

**Motivation**: Three focused quality passes across the type system, structural constants, and analytics architecture. No behavior changes.

#### OAK-38 — Type safety across the generation and export pipeline

**Updated `src/types/index.ts`**:
- Added `Card` interface — the authoritative shape for a single Firestore card document (`name: string`, `number: string`, `active: boolean`).
- Renamed `LegacyCollection` → `Collection`. The "Legacy" qualifier was a holdover from an earlier design phase; the type is the current standard and should not be named as if it is deprecated.
- `PackHistoryItem.cards` is now typed as `Card[]` instead of a looser shape.

**Updated `src/hooks/use-booster-pack-generation.ts`** — replaced all `any[]` with `Card` / `Card[][]` throughout the hook body, function signatures, and return type.

**Updated `src/hooks/use-excel-export.ts`** — replaced `any[][]` parameter type for the packs argument with `Card[][]`.

**Why this matters**: The `any[]` types in the generation and export hooks meant TypeScript provided no structural guarantees for the data flowing through the most important code paths in the application. `Card[][]` makes the pack shape verifiable at compile time.

#### OAK-39 — Semantic wildcard lookup and constant hardening

**Problem**: `use-excel-export.ts` located the wildcard card using `pack[8]` — a positional index that silently breaks if pack slot ordering ever changes.

**Fix**: Replaced `pack[8]` with `pack.find(card => !BASE_COLLECTION_IDS.includes(card.collection) && card.collection !== COLLECTION_IDS.spoonbill)`. This lookup is semantic: it finds the card that is neither a base-slot card nor the Spoonbill slot, regardless of its position in the array.

**Hardened `BASE_COLLECTION_IDS` in `src/constants/collections.ts`**:
- Changed type annotation from `as const` to `as const satisfies readonly string[]`. This asserts the value is a valid `readonly string[]` at declaration time, catching any type-narrowing regressions at the point of definition rather than at use sites.

**Added load-bearing order comments** at both usage sites (`use-booster-pack-generation.ts` and `use-excel-export.ts`) stating that `BASE_COLLECTION_IDS` order controls pack slot assignment and Excel column order respectively — do not reorder.

**Documented `COLLECTION_COLORS` intentional gap** in `src/constants/collections.ts`: not all collection IDs have a color entry. This is intentional — only collections that appear in the UI badge need a color. The gap is noted in a comment to prevent future agents from treating it as an oversight.

#### OAK-40 — Analytics separation and magic number extraction

**Extracted magic numbers** in `use-booster-pack-generation.ts` into named module-level constants declared above `useBoosterPackGeneration`:
- `MIN_WILDCARD_ATTEMPTS = 10` — minimum number of draw attempts before the wildcard slot gives up.
- `RETRY_MULTIPLIER = 2` — multiplier applied to scale retry attempts relative to pool size.

**Made `generateBoosterPack` pure** — removed all `timing()` / analytics calls from the private inner function. `generateBoosterPack` now returns `{ pack, duration }` instead of `pack[]`. It measures its own elapsed time but delegates all reporting to the caller.

**`generatePacks` accumulates total duration** across all `generateBoosterPack` calls and fires a single `timing()` call for the full batch. This is more accurate (one event per user action rather than one per pack) and keeps analytics concerns out of the core generation logic.

**Removed dead `./src/hooks/**` Tailwind content path** from `tailwind.config.js`. Hook files contain no Tailwind class strings and never did; this entry was adding unnecessary glob scanning on every build.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — pack structure, Excel output format, analytics event semantics, and all UI behavior are identical

---

### March 13, 2026 - index.tsx Refactor: Constants + Hooks (OAK-9, OAK-7, OAK-8, v2.0.8)

**Released as v2.0.8** — `src/data/changelog.json` updated; `2.0.7` entry marked `isCurrent: false`.

**Motivation**: `src/pages/index.tsx` had grown to 649 lines by mixing three unrelated concerns: collection ID constants and display name maps, all booster pack generation state and logic, and Excel export state and logic. This refactor extracts each concern into its own dedicated file with zero behavior changes.

#### OAK-9 — Collection constants centralized

**Created `src/constants/collections.ts`** as the single source of truth for all collection-related constants:
- `COLLECTION_IDS` — `as const` object mapping symbolic keys to Firestore collection ID strings
- `BASE_COLLECTION_IDS` — ordered array of the four base pack collection IDs; order controls both pack slot assignment AND Excel export column order — do not reorder
- `COLLECTION_DISPLAY_NAMES` — map from collection ID to human-readable display name
- `COLLECTION_COLORS` — map from collection ID to Tailwind color classes (used by `collection-badge.tsx`)

**Updated consumers**:
- `src/components/collection-badge.tsx` — removed inline `colorMap`; now imports `COLLECTION_COLORS` from constants
- `src/pages/index.tsx` — removed inline `BASE_CATEGORIES` and `BASE_NAME_MAP`; now imports from constants

#### OAK-7 — Pack generation hook extracted

**Created `src/hooks/use-booster-pack-generation.ts`**.

The hook accepts `(cardsData, collections)` and returns `{ boosterPacks, packHistory, lastGenTime, generatePacks }`.

Key design decisions:
- `generateBoosterPack` is a private inner function — it is not part of the return value and is not callable from outside the hook. It exists solely to be called by `generatePacks`.
- `setSelectedKeys` (the UI state that tracks which pack the user is currently viewing) stays in `src/pages/index.tsx`. It is UI state, not generation state, so it belongs in the page component.
- `packHistory` is capped at 10 entries (the last 10 generation runs).

**Updated `src/types/index.ts`** — added `LegacyCollection` and `PackHistoryItem` type definitions (previously inlined in `index.tsx`).

#### OAK-8 — Excel export hook extracted

**Created `src/hooks/use-excel-export.ts`**.

The hook returns `{ exportToExcel, isExporting }`.

Key design decisions:
- `xlsx` is loaded via `await import("xlsx")` inside `exportToExcel` rather than as a top-level static import. This defers the 284 kB xlsx bundle until the user actually triggers an export. Main chunk dropped from 1,700 kB to 1,414 kB as a result.
- `exportToExcel` is therefore `async`. The `handleGenerateAndExport` handler in `src/pages/index.tsx` is correspondingly `async` and `await`s the call.
- `isExporting` state lives inside the hook. `setIsExporting(false)` is called in a `finally` block to guarantee cleanup even when `writeFile` throws.

**Result**: `src/pages/index.tsx` is now 439 lines (down from 649) and contains only UI orchestration — no generation logic and no export logic.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — pack structure, Excel output format, and all UI behavior are identical

---

### March 12, 2026 - Category Cache Fix in Empty-Collection Fallback (OAK-25, v2.0.7)

**Released as v2.0.7** — `src/data/changelog.json` updated; `2.0.6` entry marked `isCurrent: false`.

**Motivation**: When Firestore returned an empty collection, `getCategories()` in `src/utils/categories.ts` called `createDefaultCategories()` and immediately returned its result via an early `return`. This bypassed the `cachedCategories = categories` assignment on the happy path (line 45), leaving `cachedCategories` as `null`. Every subsequent call to `getCategories()` would re-enter the fallback path instead of returning the cached value, causing redundant Firestore work and potential inconsistency.

`createDefaultCategories()` does set `cachedCategories` in its own success path (line 83), but if that function encounters an error internally, it returns `getDefaultCategories()` without setting the cache — so `getCategories()` would return an uncached result with no safety net at all.

**Fix**: In the empty-collection branch of `getCategories()`, replaced `return await createDefaultCategories()` with:

```typescript
cachedCategories = await createDefaultCategories();
return cachedCategories;
```

This ensures `getCategories()` is the authoritative place for caching the fallback result, matching the happy-path pattern. It also provides a defensive safety net: if `createDefaultCategories()` falls back to its own error handler without setting the cache, `getCategories()` will still cache the result before returning.

**Changes**:
- `src/utils/categories.ts` — lines 41–43: replaced early `return await createDefaultCategories()` with the two-statement pattern above.
- `src/data/changelog.json` — added v2.0.7 entry; marked v2.0.6 `isCurrent: false`.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — external behavior of `getCategories()` is identical; only caching correctness was improved

---

### March 12, 2026 - Stale Closure Fix in Firebase Sign-In Effect (OAK-27, v2.0.6)

**Released as v2.0.6** — `src/data/changelog.json` updated; `2.0.5` entry marked `isCurrent: false`.

**Motivation**: The `useEffect` in `src/pages/edit.tsx` (lines 104–118) called `list.reload()` directly. `list` is produced by `useAsyncList` from `@react-stately/data`, which returns a **plain object literal on every render** — both `list` and `list.reload` are new references each render, not stable. Listing `list` or `list.reload` in the dependency array would cause per-render re-subscription (at best) or an infinite re-render loop (at worst). The function was therefore omitted from the deps array, creating a stale closure: the effect captured the `list.reload` reference from the first render and would never see an updated one.

**Fix**: Applied the `useRef` stable-reference pattern:
- Added `useRef` to the React import in `src/pages/edit.tsx`.
- Declared `const reloadRef = useRef(list.reload)` immediately after the `useAsyncList(...)` call, then updated `reloadRef.current = list.reload` on every render so the ref always holds the latest reload function.
- Changed the call site inside the Firebase sign-in `useEffect` from `list.reload()` to `reloadRef.current()`.
- The effect's dependency array is unchanged (`[isLoaded, userId, getToken, isAuthenticated]`). The ref read inside the effect is not a dependency because refs are stable across renders by design.

**Why this matters**: Without this fix, calling `list.reload()` from a stale closure after Firebase sign-in would invoke an outdated function reference — potentially operating on the wrong closure state. The `useRef` pattern is the standard React solution for calling the always-current version of an unstable function reference from inside a `useEffect` without adding it to the dependency array.

**Changes**:
- `src/pages/edit.tsx` — added `useRef` to React import; added `reloadRef` declaration and assignment after `useAsyncList`; changed `list.reload()` → `reloadRef.current()` inside the Firebase sign-in effect.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — behavior is identical for all sign-in paths; only the reference stability was corrected

---

### March 12, 2026 - Dead Code Removal (OAK-31, v2.0.5)

**Released as v2.0.5** — `src/data/changelog.json` updated; `2.0.4` entry marked `isCurrent: false`.

**Motivation**: Two files that were no longer reachable from any import path were removed to reduce surface area and eliminate a now-unused npm dependency.

**Files deleted**:
- `src/components/editcard.tsx` — A legacy card-editing modal component. It had been fully superseded by the full-page implementation at `src/pages/editcard.tsx` and had zero remaining imports anywhere in the codebase.
- `src/components/ui/dialog.tsx` — A Radix UI dialog wrapper created during an early design phase. The project standardized on HeroUI Modal (`@heroui/modal`) before v1.0 shipped; this file was never used in the final design and had zero imports.

**Dependency removed**:
- `@radix-ui/react-dialog` — Was imported only by `src/components/ui/dialog.tsx`. With that file deleted, the dependency served no purpose. Removed from `package.json` and `node_modules`.

**Why this matters**: The project now has no Radix UI dialog dependency. All modal and dialog UI uses HeroUI `@heroui/modal` exclusively. Any future work requiring a dialog/modal should use HeroUI's `<Modal>` component, not introduce Radix UI.

**Note for future agents**: If you see `@radix-ui/react-dialog` mentioned anywhere in old documentation, notes, or AI memory, treat that information as stale. The package no longer exists in this project.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — the deleted files had no active callers

---

### March 11, 2026 - Theme Hook Hardening (v2.0.4)

**Released as v2.0.4** — `src/data/changelog.json` updated; `2.0.3` entry marked `isCurrent: false`.

**Motivation**: The theme hook (`src/hooks/use-theme.ts`) had four correctness and performance issues: an unsafe `localStorage` access that would crash in non-browser environments, an unsafe type cast that allowed arbitrary strings to reach the DOM, a redundant `useEffect` causing an extra re-render on every mount, and unstable function references causing unnecessary re-renders of all theme context consumers.

**Changes**:
- `src/hooks/use-theme.ts` replaced by `src/hooks/use-theme.tsx` (extension change allows JSX in the provider component)
- `src/main.tsx`: Import quote style normalized to double quotes for consistency

#### localStorage SSR guard

**Problem**: The `useState` initializer accessed `localStorage` unconditionally. In any non-browser environment (SSR, server-side rendering pipelines, tests without `jsdom`), this throws a `ReferenceError`.

**Fix**: The initializer now checks `typeof window === "undefined"` first and returns `ThemeProps.light` as the safe fallback before touching `localStorage`.

#### Explicit localStorage value validation

**Problem**: The stored value was cast with `as Theme | null`, meaning any string previously written to `localStorage` under the `"theme"` key — including arbitrary values from third-party scripts or browser extensions — would be applied as a CSS class on `<html>`.

**Fix**: Replaced the unsafe cast with an explicit conditional: `raw === ThemeProps.dark ? ThemeProps.dark : ThemeProps.light`. Only the two known-valid values are accepted; anything else defaults to light.

#### Eliminated redundant mount-time useEffect double-write

**Problem**: A `useEffect(() => { _setTheme(theme); }, [theme])` ran on every render, immediately writing the theme value back to state that was just read from state. This caused a redundant re-render and `localStorage` write on every mount.

**Fix**: Removed the self-referential effect. Each setter (`setLightTheme`, `setDarkTheme`, `toggleTheme`) calls `applyThemeToDOM` directly when it changes the value. A single mount-only effect syncs the DOM class list on initial load (to handle values previously stored in `localStorage` from a prior session).

#### Stabilized context value references

**Problem**: `setLightTheme`, `setDarkTheme`, and `toggleTheme` were plain inline functions — new references on every render. The context `value` object was a new object literal on every render. Every consumer of `ThemeContext` would re-render on any `ThemeProvider` re-render, even if the theme itself had not changed.

**Fix**: All three setters are wrapped in `useCallback`. The context `value` object is wrapped in `useMemo`. Consumers now only re-render when the theme actually changes.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — `useTheme()` API is identical; `ThemeProvider` wrapping pattern in `main.tsx` is unchanged

---

### February 28, 2026 - Pack Generation Bug Fixes (OAK-22, OAK-23, OAK-24)

**Released as v2.0.1** — `src/data/changelog.json` updated; `2.0.0` entry marked `isCurrent: false`.

**Motivation**: Three separate correctness bugs in `src/pages/index.tsx` were producing malformed packs, broken Excel exports, and a silent crash path in wildcard selection.

**All changes are isolated to `src/pages/index.tsx`.**

#### OAK-22 — Short-circuit `||` bug in base-category card loop

**Root cause**: The condition `if (!addCard(col) || !addCard(col))` used JavaScript's short-circuit evaluation: when the first `addCard(col)` returned `false`, the second call was never made. Packs were only receiving one card per base category instead of two, producing 6-card packs instead of the expected 10.

**Fix**: Replaced the single compound `if` with two separate `if (!addCard(col))` statements so both draws always execute regardless of the first result.

**Why this matters**: Every subsequent feature (export, display, count validation) assumed 10-card packs. 6-card packs silently corrupted downstream behavior.

#### OAK-23 — Export trigger state machine race condition

**Root cause**: An `exportTrigger` boolean state was set to `true` inside `handleGenerateAndExport`, then watched by a `useEffect` that called `exportToExcel()`. React batches state updates, so there was no guarantee the effect fired at the right time relative to pack generation, and `isExporting` could be left as `true` permanently if an error occurred before the effect cleaned up.

**Fix**:
- Removed `exportTrigger` state and its `useEffect`.
- `generatePacks()` now returns `any[][]` (the generated pack data) instead of writing only to component state.
- `handleGenerateAndExport` calls `generatePacks()` directly, passes the return value to `exportToExcel()`, and wraps the call in `try/finally` to guarantee `isExporting` resets to `false` even on error.
- Added an early return guard at the top of `handleGenerateAndExport` to prevent double-clicks while export is in progress.

**Why this matters**: The old pattern left the UI in a permanently-disabled state on any export error. The new pattern is deterministic and handles errors cleanly.

#### OAK-24 — Wildcard selection passing `undefined` to `addCard`

**Root cause**: The wildcard slot selected a random category from `eligibleCategories`. When `eligibleCategories` was empty (e.g., all wildcard-eligible collections had no active cards), `eligibleCategories[randomIndex]` evaluated to `undefined`, which was passed directly to `addCard`. This caused a silent failure or runtime error with no warning.

**Fix**: Wrapped the wildcard selection block in an `if (eligibleCategories.length > 0)` guard. When no eligible categories exist, the wildcard slot is skipped and a `console.warn` is emitted so the condition is visible during debugging.

**Why this matters**: Passing `undefined` to `addCard` is a type violation that could produce unpredictable behavior depending on how downstream code handles it. The guard makes the empty-collection case explicit and observable.

**Verification Results**:
- Build: Successful
- Lint: Clean
- Breaking Changes: None — pack structure, UI, and Firebase integration are unchanged

---

### December 7, 2024 - React 19 Upgrade & Security Hardening

**Motivation**: Future-proofing and security improvements for long-term maintainability.

**Changes Made**:
1. **React Ecosystem Upgrade**:
   - Upgraded `react` from 18.3.1 to 19.0.0
   - Upgraded `react-dom` from 18.3.1 to 19.0.0
   - Upgraded `@types/react` from 18.3.3 to 19.0.0
   - Upgraded `@types/react-dom` from 18.3.0 to 19.0.0

2. **Dependency Cleanup**:
   - Removed `next` (15.5.6) - was unused, project uses Vite
   - Removed `next-navigation` (1.0.6) - was unused

3. **Code Updates for React 19**:
   - Updated analytics import in `src/main.tsx`:
     - Changed from `@vercel/analytics/next` to `@vercel/analytics/react`
   - No other code changes required - React 19 is backward compatible with existing patterns

4. **ESLint Configuration Overhaul**:
   - Replaced Next.js-based config with standalone React/TypeScript config
   - Added comprehensive linting rules for React, TypeScript, accessibility, and code quality
   - Configured plugins: react, react-hooks, @typescript-eslint, jsx-a11y, import, unused-imports, prettier
   - Key rules:
     - `unused-imports/no-unused-imports`: error
     - `@typescript-eslint/no-unused-vars`: error (with underscore ignore pattern)
     - `@typescript-eslint/no-explicit-any`: warn
     - `react/react-in-jsx-scope`: off (not needed with new JSX transform)

**Verification Results**:
- ✅ Build: Successful (2.84s production build)
- ✅ Lint: Passing (11 warnings in gtag.ts - pre-existing, non-blocking)
- ✅ Dependencies: All compatible with React 19
- ⚠️ No test suite currently configured (npm test script not present)

**Breaking Changes**: None - application maintains existing look and functionality

**Known Warnings**:
- Bundle size warning for main chunk (1.6MB at time of this entry) — reduced to ~1.4MB in v2.0.8 via dynamic xlsx import; further splitting is a future consideration
- 11 linting warnings in `src/lib/gtag.ts` related to `any` types and `arguments` usage - Google Analytics typing limitations, non-critical

## Tech Stack

- **Frontend**: React 19.0.0 + TypeScript 5.9.3 + Vite 5.4.21
- **UI Framework**: HeroUI v2 (custom component library)
- **Styling**: Tailwind CSS 3.4.18 + tailwind-merge + class-variance-authority
- **Database**: Firebase Firestore 11.10.0
- **Authentication**: Clerk (admin features only)
- **Analytics**: Vercel Analytics + Google Analytics (gtag)
- **Animation**: Framer Motion 12.23.24
- **Excel Export**: xlsx 0.18.5
- **Hosting**: Vercel

## Architecture Patterns

### Component Structure
- UI components in `src/components/ui/` - reusable primitives
- Feature components at `src/components/` level
- Page components in `src/pages/`
- Layouts in `src/layouts/`

### State Management
- React hooks for local state
- Firebase real-time subscriptions for card data
- No global state management library (Redux/Zustand) - kept simple intentionally

### Data Flow
1. Cards stored in Firebase Firestore collections (one per zoo area)
2. Real-time listeners fetch active cards on page load
3. Generation logic uses weighted random selection
4. Export feature uses xlsx library for Excel generation

### Styling Approach
- Tailwind CSS utility-first
- HeroUI components for complex UI patterns
- Dark mode support via HeroUI theme system
- Responsive design mobile-first

## Code Conventions

### TypeScript
- Strict mode enabled
- Explicit return types preferred for public functions
- Use type definitions in `src/types/`
- Avoid `any` where possible (currently used in gtag.ts due to Google Analytics SDK limitations)

### React Patterns
- Functional components only
- Hooks for side effects and state
- Props destructuring in component signatures
- Early returns for loading/error states

### File Naming
- Components: PascalCase (e.g., `EditCard.tsx`)
- Utilities: kebab-case (e.g., `use-analytics.ts`)
- Types: kebab-case (e.g., `changelog.ts`)
- Pages: kebab-case (e.g., `index.tsx`)

### Import Organization
1. External dependencies (React, libraries)
2. Internal components
3. Hooks and utilities
4. Types
5. Styles

## Firebase Collections

Each collection represents a card category:
- `africansavanna`
- `californiatrail`
- `childrenszoo`
- `tropicalrainforest`
- `specialedition`
- `booatthezoo`
- `arcas`
- `newnaturefoundation`
- `disney`
- `spoonbill`

**Card Schema**:
```typescript
{
  name: string;      // Display name
  number: string;    // Card identifier
  active: boolean;   // Whether card appears in generator
}
```

## Booster Pack Generation Logic

**Standard Pack** (10 cards total):
- 2 cards from African Savannah
- 2 cards from California Trail
- 2 cards from Children's Zoo
- 2 cards from Tropical Rainforest
- 1 wildcard (random from any collection)
- 1 Spoonbill card

**Implementation**: See `src/hooks/use-booster-pack-generation.ts` (`generatePacks` is the public entry point; `generateBoosterPack` is a private inner function). The hook is consumed by `src/pages/index.tsx`.

## Build & Deployment

**Development**:
```bash
npm run dev          # Start dev server (Vite)
```

**Production**:
```bash
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build
```

**Linting**:
```bash
npm run lint         # ESLint with auto-fix
```

**Deployment**:
- Automatic via Vercel on push to main branch
- Preview deployments for PRs

## Important Notes

### No Test Suite
- Currently no automated tests configured
- Manual testing required for changes
- Consider adding Vitest + React Testing Library in future

### Analytics
- Dual tracking: Vercel Analytics + Google Analytics
- Analytics code in `src/lib/gtag.ts` and `src/hooks/use-analytics.ts`
- Page views and events tracked for usage insights

### Authentication
- Clerk used ONLY for admin card management
- Public card generation requires no auth
- Admin access controlled by Clerk dashboard

### Environment Variables
See `.env.example` for required Firebase configuration variables.

## Future Considerations

1. **Performance**:
   - Main chunk is now ~1.4MB (xlsx deferred to a separate 284 kB chunk via OAK-8 dynamic import)
   - Further code splitting possible (lazy load admin features)
   - Optimize Firebase queries

2. **Testing**:
   - Add unit tests for generation logic
   - Add integration tests for Firebase operations
   - Add E2E tests for critical user flows

3. **Features**:
   - Consider adding pack history/tracking
   - Bulk card import from CSV
   - Advanced filtering in card management

## Contact & Support

- **Developer**: Albert Shih - ashih@oaklandzoo.org
- **Program Lead**: Patrick Wolff - pwolff@oaklandzoo.org
