## Oakland Zoo Booster Pack Generator — Development Context

**Project Overview**
Web application for generating randomized trading card booster packs for the Oakland Zoo Learning & Engagement program. Built with **React 19, TypeScript, and Vite**, utilizing **Firebase** for data and **Clerk** for admin authentication.
**Live URL**: [ozboosterpacks.albertshih.org](https://ozboosterpacks.albertshih.org)

---

### Technical Stack & Architecture

- **Frontend**: React 19, Framer Motion (M3 System), HeroUI v2 (table/modal/form primitives only — buttons replaced by M3Button), Tailwind CSS.
- **Backend/API**: Vercel Serverless Functions (Node.js) proxying Clerk and GA4 Data API.
- **Database**: Firebase Firestore (10+ collections for zoo areas).
- **Design System**: Material Design 3 (M3) tokens for color, typography, and motion.
- **Layouts**: Separate **AdminLayout** (auth-gated, M3 Nav Drawer) and **DefaultLayout**.

---

### Core Functionality

- **Booster Pack Logic**: Generates 10-card packs:
  - **2 cards** each from 4 base collections (African Savanna, CA Trail, Children's Zoo, Tropical Rainforest).
  - **1 wildcard** from eligible non-base collections.
  - **1 Spoonbill card** (fixed slot).
- **Excel Export**: Dynamic `xlsx` import to minimize bundle size (~1.4MB); generates formatted spreadsheets for printing.
- **Admin Management**: Full CRUD for cards and categories; responsive sheets (Modal/BottomSheet) for mobile-first editing.

---

### Recent Milestones (March 2026)

- **First-Run Admin Tutorial (OAK-119–126)**: Cross-page guided spotlight tour; `TutorialContext` + `useTutorial` hook; SVG mask overlay with Framer Motion spring transitions; M3 popover step card (desktop floating / mobile bottom-sheet); 10 steps covering all 4 admin pages; keyboard nav (Escape/ArrowLeft/ArrowRight); localStorage persistence (`oz-admin-tutorial-v1`); `?` help button in TopAppBar. See `memory/tutorial_system.md`.
- **Analytics Dashboard (OAK-92–95)**: Native SVG charts (no heavy libraries); serverless proxy for GA4 data using Base64-encoded service account credentials.
- **Category Management (OAK-103–116)**: Centralized normalization logic; optimistic UI updates for wildcard eligibility; GA4 event hardening.
- **Typography & Design Consistency Pass (OAK-117–118)**: All admin UI type classes migrated from raw Tailwind (`text-xs`, `text-sm`, `font-semibold`) to M3 named utilities (`text-label-large`, `text-body-medium`, etc.); page headers, status badges, error alerts, and empty states standardized across all four admin routes.
- **M3 Redesign**: Formalized M3 typography scale, motion variants (staggered lists), and color tokens across the Admin shell and Changelog.
- **User Management**: Custom Clerk-integrated account panels replacing hosted iframes for consistent styling and testing.

---

### Engineering Standards & Quality

- **Testing Strategy**: **172 Vitest unit tests** covering hooks, utilities, and API handlers; `jsdom` and React Testing Library for UI components.
- **CI/CD Hygiene**: Husky/lint-staged pre-commit hooks enforcing ESLint, TypeScript `noEmit`, and the full test suite.
- **State Management**: React hooks/context for UI state; Firestore listeners for real-time card data; localStorage for filter persistence.
- **Error Handling**: Global **ErrorBoundary**; centralized `extractClerkError` helper; tiered logging (Console vs. GA4 `exception`).
- **Typography Enforcement**: All admin UI must use M3 named type utilities (`text-label-large`, `text-body-medium`, etc.). Raw Tailwind type classes (`text-xs`, `text-sm`, `font-semibold`) are not permitted in admin components. See `memory/m3_typography.md`.
- **Button Standard**: Use `M3Button` from `src/components/m3/button.tsx` for all buttons. `@heroui/button` is no longer used anywhere in the codebase (fully migrated — 43 instances across 15 files replaced). HeroUI variant → M3Button mapping: `color="primary"` → `variant="filled"`; `variant="flat"` → `variant="tonal"`; `variant="bordered"` → `variant="outlined"`; `variant="shadow"` → `variant="elevated"`; `variant="light"` → `variant="text"`; append `color="error"` to any of the above when the original used `color="danger"`. `color="success"` maps to `variant="filled"` (no M3 success token). The `spinner` prop is accepted but ignored — `M3Button` always renders `M3Spinner` when `isLoading` is true.

---

### Key Architectural Rules

- **Normalization**: Always use `normalizeCategoryId` in `src/utils/validation.ts` for ID derivation.
- **Events**: GA4 events must fire **after** Firestore `awaits` to prevent "phantom" success records.
- **Immutability**: Category IDs are immutable after creation to prevent orphaning associated cards.
- **Performance**: Use `React.lazy()` for all admin routes; defer heavy libraries (`xlsx`) via dynamic imports.

---

### Known Accepted Risks (last reviewed June 2026)

Packages with vulnerabilities that cannot be resolved without a breaking major-version upgrade. All are dev/build tooling — none affect the production runtime bundle deployed to Vercel.

| Package            | Severity | Reason no fix available                                                                                                                  | Revisit trigger                  |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `xlsx@0.18.5`      | High     | No patch from SheetJS; used in admin-only Excel export, no public-facing attack surface                                                  | SheetJS releases a patched build |
| `vite@5.x`         | High     | Fix requires v8 major bump; vulnerabilities are dev-server only (path traversal, `server.fs.deny` bypass) — not in the production bundle | Next major maintenance pass      |
| `vercel@50.x`      | High     | Fix requires v54 major bump; CLI/build tooling only, not the production runtime                                                          | Next major maintenance pass      |
| `@vercel/node@5.x` | High     | Same chain as `vercel` above                                                                                                             | Next major maintenance pass      |

**Notes:**

- `vercel` is listed under `dependencies` (not `devDependencies`). No source file imports it directly — this may be a historical artifact. Do not move it without confirming no deploy hook depends on it.
- `legacy-peer-deps=true` in `.npmrc` accommodates React 19 peer range mismatches with HeroUI. Do not remove.
