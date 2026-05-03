# AGENT.md — Oakland Zoo Booster Pack Generator

Instruction manual for AI agents working in this repository. Read this file at the start of every session. Update it when new patterns or lessons are discovered.

---

## Current Context

**As of 2026-03-24**: OAK-58/59/81/82 and post-review hardening are complete on the `development` branch. The Vercel serverless API layer (`api/_auth.ts`, `api/users/list.ts`, `api/users/invite.ts`) proxies Clerk user management endpoints. The `/admin/users` route now shows a full users management page with a user list table, invite modal/bottom sheet, and a custom `AccountPanel` (replaces the Clerk `<UserProfile />` iframe). Post-review hardening tightened the API layer (Allow headers, email regex, `APP_URL` env var priority, runtime shape validation in `listUsers`) and the frontend (`extractClerkError` helper in `account-panel.tsx`, `[user?.id]` effect dependency, initials fallback avatar, null `getToken()` handling, `tsconfig.api.json` updated to Node16 module resolution). Test count is **128, all passing**.

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

- `npm run dev` — Vite-only dev server (no `/api/*` serverless functions)
- `npm run dev:full` — `vercel dev`; runs Vite + serverless functions together. **Requires `vercel env pull .env.local` first** (see CLAUDE.md "Local Full-Stack Development").
- `npm run build` — production build (TypeScript + Vite)
- `npm run lint` — ESLint with auto-fix
- `npm run test` — Vitest in watch mode (development)
- `npm run test:run` — Vitest single-pass (CI / pre-commit); runs automatically in `.husky/pre-commit`
- Vercel auto-deploys on push to `main`

---

## Architecture Snapshot

```
api/
  _auth.ts                      — Shared auth helper: requireAuth() + clerkClient (Node-only; never import in src/)
  users/list.ts                 — GET /api/users/list — sanitized Clerk user list
  users/invite.ts               — POST /api/users/invite — Clerk invitation creation

src/
  pages/index.tsx               — Main page: UI orchestration; consumes useBoosterPackGeneration + useExcelExport
  pages/sign-in.tsx             — Custom sign-in page with inline forgot-password flow (Clerk v5)
  pages/admin/index.tsx         — Admin cards page: renders <CardPanel />
  pages/admin/users.tsx         — Admin users page: user list, invite modal, AccountPanel; persistent loadError state
  layouts/admin.tsx             — AdminLayout: auth-gated shell for /admin/*; wraps AdminFiltersProvider
  components/admin/             — TopAppBar, NavDrawer, CardPanel, CardEditSheet, AccountPanel
  components/m3/                — M3Spinner, LinearProgress, BottomSheet, M3Snackbar
  components/navbar.tsx         — Public navbar with Clerk-gated Admin link
  components/error-boundary.tsx — Catches render + lazy-load errors
  contexts/admin-filters-context.tsx — AdminFiltersProvider + useAdminFiltersContext()
  hooks/use-booster-pack-generation.ts — All pack generation logic
  hooks/use-excel-export.ts     — Excel export (dynamic xlsx import)
  hooks/use-admin-filters.ts    — localStorage-backed admin filter state
  hooks/use-media-query.ts      — SSR-safe media query hook (shared)
  hooks/use-theme.tsx           — Theme context provider
  utils/categories.ts           — Category fetch/cache + CRUD mutations
  utils/admin-api.ts            — Browser fetch client for /api/users/*; exports AdminUser, listUsers, inviteUser
  utils/validation.ts           — Form validation for card + category forms
  constants/collections.ts      — Collection IDs, display names, colors, BASE_COLLECTION_IDS
  constants/generation.ts       — Pack generation tuning constants
  lib/firebase.ts               — Firebase init
  lib/gtag.ts                   — Google Analytics helpers
  types/                        — Shared TypeScript interfaces
  data/changelog.json           — In-app version changelog
  styles/globals.css            — M3 CSS custom properties + keyframes
```

**Firebase collections** (one per card set): `africansavanna`, `californiatrail`, `childrenszoo`, `tropicalrainforest`, `specialedition`, `booatthezoo`, `arcas`, `newnaturefoundation`, `disney`, `spoonbill`

**Firestore `categories` collection**: Metadata about each collection — `displayName`, `isWildcardEligible`. Managed via admin UI (Clerk-protected).

---

## Known Warnings (Pre-existing, Non-blocking)

- 11 ESLint warnings in `src/lib/gtag.ts` — Google Analytics SDK typing limitations, intentionally left in place
- Main bundle ~1.3MB — xlsx is deferred (OAK-8); admin pages are lazy-loaded (OAK-13); further splitting is a future consideration
