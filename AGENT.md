# AGENT.md — Oakland Zoo Booster Pack Generator

Instruction manual for AI agents working in this repository. Read this file at the start of every session. Update it when new patterns or lessons are discovered.

---

## Current Context

**As of 2026-02-28**: All three bug fixes for OAK-22, OAK-23, OAK-24 are complete and merged into the `development` branch. These changes are isolated to `src/pages/index.tsx` and released as v2.0.1. `CLAUDE.md` has been updated to correctly identify `src/pages/index.tsx` (not `src/utils/categories.ts`) as the home of pack generation logic. Documentation files (`AGENT.md`, `SESSIONS.md`) have been created for the first time.

**Active branch**: `development` (PR to `main` pending)

---

## Learned Lessons

### Always run a code review before committing

During the OAK-22/23/24 fix session (2026-02-28), a code review pass caught an additional bug — `setShowModal(false)` was placed after the `try/finally` block in `handleGenerateAndExport`, meaning the modal would stay open permanently if `exportToExcel` threw. The initial implementation looked correct at a glance. Code review before commit caught this. Make reviewing diffs a required step before committing any changes to generation or export logic.

### Pack generation logic lives in `src/pages/index.tsx`, NOT `src/utils/categories.ts`

`src/utils/categories.ts` only fetches and caches category metadata from Firestore. It does not contain `generateBoosterPack`, `generatePacks`, `handleGenerateAndExport`, or `exportToExcel`. All of those live in `src/pages/index.tsx`. This distinction has caused documentation errors before.

### `setShowModal(false)` must be inside `finally`

In `handleGenerateAndExport`, both `setIsExporting(false)` and `setShowModal(false)` must be inside the `finally` block. Placing either of them after the `try/finally` block means they will not execute on error paths, leaving the UI in a permanently disabled or stuck state.

### Short-circuit `||` silently skips side-effectful function calls

`if (!fn() || !fn())` will never execute the second `fn()` call when the first returns `false`. When a function has side effects (like pushing to an array), always use two separate `if (!fn())` statements. This was the root cause of OAK-22: packs got 6 cards instead of 10.

### Do not use state + `useEffect` as a trigger for async sequences

Using a boolean state flag (`exportTrigger`) toggled to `true` and watched by a `useEffect` to trigger an async operation is unreliable. React batches state updates and there is no guaranteed timing relationship. Use direct function calls with `try/finally` instead. This was the root cause of OAK-23.

### Guard against random index access on empty arrays

`arr[Math.floor(Math.random() * arr.length)]` returns `undefined` when `arr.length === 0`. Always check `arr.length > 0` before accessing a random element. Passing `undefined` to a typed function is a silent type violation that produces unpredictable behavior. This was the root cause of OAK-24.

---

## Key Conventions

### File Naming
- Components: PascalCase (`EditCard.tsx`)
- Utilities and hooks: kebab-case (`use-analytics.ts`, `categories.ts`)
- Types: kebab-case (`changelog.ts`)
- Pages: kebab-case (`index.tsx`)

### TypeScript
- Strict mode enabled
- Explicit return types preferred on public functions
- `any` is allowed only where SDK limitations force it (e.g., `gtag.ts`); elsewhere use typed interfaces
- New types go in `src/types/`

### React
- Functional components only
- Props destructuring in component signatures
- Early returns for loading/error states
- No global state library (Redux/Zustand) — intentionally kept simple

### Styling
- Tailwind CSS utility-first; do not write raw CSS
- HeroUI components for complex UI patterns (modals, tables, inputs, buttons)
- Dark mode handled by HeroUI theme system

### Import Order
1. External dependencies (React, libraries)
2. Internal components
3. Hooks and utilities
4. Types
5. Styles

---

## Tool Preferences

- `npm run dev` — local development server (Vite)
- `npm run build` — production build (TypeScript + Vite)
- `npm run lint` — ESLint with auto-fix
- No `npm test` script exists — manual testing only
- Vercel auto-deploys on push to `main`

---

## Architecture Snapshot

```
src/
  pages/index.tsx         — Main page: all pack generation + export logic
  components/             — Feature and UI components
  utils/categories.ts     — Category metadata fetch/cache (Firestore `categories` collection)
  lib/firebase.ts         — Firebase init
  lib/gtag.ts             — Google Analytics helpers
  hooks/use-analytics.ts  — Analytics page view tracking
  types/                  — Shared TypeScript interfaces
  data/changelog.json     — In-app version changelog
```

**Firebase collections** (one per card set): `africansavanna`, `californiatrail`, `childrenszoo`, `tropicalrainforest`, `specialedition`, `booatthezoo`, `arcas`, `newnaturefoundation`, `disney`, `spoonbill`

**Firestore `categories` collection**: Metadata about each collection — `displayName`, `isWildcardEligible`. Managed via admin UI (Clerk-protected).

---

## Known Warnings (Pre-existing, Non-blocking)

- 11 ESLint warnings in `src/lib/gtag.ts` — Google Analytics SDK typing limitations, intentionally left in place
- Main bundle ~1.6MB — code splitting is a future improvement, not an active blocker
