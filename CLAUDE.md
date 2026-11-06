## Oakland Zoo Booster Pack Generator — Development Context

**Project Overview**
Web application for generating randomized trading card booster packs for the Oakland Zoo Learning & Engagement program. Built with **React 19, TypeScript, and Vite 8 on Node 26**, utilizing **Firebase** for data and **Clerk** for admin authentication.
**Live URL**: [ozboosterpacks.albertshih.org](https://ozboosterpacks.albertshih.org)

---

### Technical Stack & Architecture

- **Frontend**: React 19, Framer Motion (M3 System), HeroUI v2 (table/modal/form primitives only — buttons replaced by M3Button), Tailwind CSS 4.
- **Backend/API**: Vercel Serverless Functions (Node.js) proxying Clerk and GA4 Data API, issuing Firebase sessions, and deleting categories.
- **Database**: Firebase Firestore (10+ collections for zoo areas).
- **Design System**: Material Design 3 (M3) tokens for color, typography, and motion.
- **Layouts**: Separate **AdminLayout** (auth-gated, M3 Nav Drawer) and **DefaultLayout**.

---

### Core Functionality

- **Booster Pack Logic**: Generates 10-card packs:
  - **2 cards** each from 4 base collections (African Savanna, CA Trail, Children's Zoo, Tropical Rainforest).
  - **1 wildcard** from any wildcard-eligible category, including base sets and Spoonbill.
  - **1 Spoonbill card** (fixed slot, drawn before the wildcard so it cannot be taken).
  - Incomplete packs are allowed and flagged in the UI and the workbook's `Warnings` column.
- **Excel Export**: Dynamic `xlsx` import (SheetJS CE from cdn.sheetjs.com, not npm); generates spreadsheets for printing.
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

- **Testing Strategy**: Vitest unit tests (`npm run test:run`), Playwright browser tests with stubbed services (`npm run test:e2e`), and Firestore rules tests in the emulator (`npm run test:rules`).
- **CI/CD Hygiene**: Husky/lint-staged pre-commit hooks enforcing ESLint, all TypeScript projects, and the unit suite. CI also runs e2e and rules tests.
- **State Management**: React hooks/context for UI state; Firestore reads through `src/utils/cards.ts`; preferences through `src/lib/safe-storage.ts`.
- **Error Handling**: Global **ErrorBoundary**; centralized `extractClerkError` helper; tiered logging (Console vs. GA4 `exception`).
- **Typography Enforcement**: All admin UI must use M3 named type utilities (`text-label-large`, `text-body-medium`, etc.). Raw Tailwind type classes (`text-xs`, `text-sm`, `font-semibold`) are not permitted in admin components. See `memory/m3_typography.md`.
- **Button Standard**: Use `M3Button` from `src/components/m3/button.tsx` for all buttons. `@heroui/button` is no longer used anywhere in the codebase (fully migrated — 43 instances across 15 files replaced). HeroUI variant → M3Button mapping: `color="primary"` → `variant="filled"`; `variant="flat"` → `variant="tonal"`; `variant="bordered"` → `variant="outlined"`; `variant="shadow"` → `variant="elevated"`; `variant="light"` → `variant="text"`; append `color="error"` to any of the above when the original used `color="danger"`. `color="success"` maps to `variant="filled"` (no M3 success token). The `spinner` prop is accepted but ignored — `M3Button` always renders `M3Spinner` when `isLoading` is true.

---

### Key Architectural Rules

- **Normalization**: Always use `normalizeCategoryId` in `src/utils/validation.ts` for ID derivation.
- **Events**: GA4 events must fire **after** Firestore `awaits` to prevent "phantom" success records.
- **Immutability**: Category IDs are immutable after creation to prevent orphaning associated cards.
- **Authorization**: Approval is Clerk `publicMetadata.approved`, written only server-side. Use `requireApproved` in every privileged API route. Firestore writes need the `approved` and `approvedUntil` claims from `/api/auth/firebase-token`; never loosen `firestore.rules` as a rollback.
- **Catalog data**: Read cards through `parseCard`, which assigns identity from the snapshot. Legacy cards have integer `number` values and extra fields.
- **Category deletion**: Server-only (`api/categories/delete.ts`). Required sets cannot be deleted, and populated categories are refused.
- **Performance**: Use `React.lazy()` for all admin routes; defer heavy libraries (`xlsx`) via dynamic imports.

---

### Dependency Exceptions (reviewed November 2026)

See `docs/maintenance-handoff.md` for the full record. The production dependency tree has no high or critical advisories.

| Exception                         | Reason                                                                         | Revisit trigger             |
| --------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| ESLint 9, not 10                  | `eslint-plugin-react` and `jsx-a11y` peer ranges stop at 9                     | Those plugins support 10    |
| TypeScript 6.0, not 7             | `typescript-eslint` requires `<6.1.0`                                          | Its peer range widens       |
| HeroUI v2, not v3                 | v3 is a component rewrite; v2 works on Tailwind 4                              | v2 stops receiving releases |
| `@clerk/react/legacy` for sign-in | Supported path for existing custom flows                                       | Clerk retires it            |
| Dev-only audit findings           | Vercel CLI and firebase-tools chains; not deployed to the browser or functions | Upstream releases           |

**Notes:**

- `legacy-peer-deps=true` in `.npmrc` stays until a clean install without it is proven. Do not remove it casually.
- `zod` is a direct devDependency because `eslint-plugin-react-hooks` needs v4 and `legacy-peer-deps` will not install it.
