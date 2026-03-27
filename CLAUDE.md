# Oakland Zoo Booster Pack Generator - Development Notes

This document contains important development context, patterns, and decisions for AI coding assistants working on this project.

## Project Overview

Web application for generating randomized trading card booster packs for Oakland Zoo's Learning & Engagement program. Built with React, TypeScript, Vite, and Firebase.

**Live URL**: https://ozboosterpacks.albertshih.org

## Recent Changes

### March 27, 2026 - Analytics Post-Review Hardening (OAK-107, OAK-109, OAK-111, OAK-112)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: Post-code-review fixes for the OAK-89/90/91 analytics migration. Four issues caught during review: events firing before their Firestore awaits (phantom GA events on write failure), a missing `login` event in the password reset flow, a dead `useAnalytics` hook, and a semantic mismatch in the `card_status_toggled` event type.

#### OAK-107 — Fix event ordering: fire after Firestore await, not before

**Problem**: In `categories.tsx` and `editcard.tsx`, all `event()` calls fired **before** their corresponding `await`. If the Firestore write threw an error, GA would still record a phantom event for an operation that never completed.

**Fix**: Moved all `event()` calls to after their corresponding `await` in both files:

- `src/pages/editcard.tsx`: `card_created` fires after `await addDoc(...)`, `card_updated` fires after the if/else block containing both `await updateDoc(...)` and `await batch.commit()`, `card_deleted` fires after `await deleteDoc(...)`.
- `src/pages/categories.tsx`: `category_created` fires after `await addDoc(...)`, `category_updated` fires after `await updateDoc(...)`, `category_deleted` fires after `await deleteDoc(...)`.

`card-edit-sheet.tsx` was already correct (events fired after awaits) — this aligns the legacy admin pages with that pattern.

#### OAK-109 — Delete dead useAnalytics() hook

After the OAK-90 GA4 migration, `useAnalytics()` had zero callers. The function — including `trackButtonClick`, `trackFormSubmission`, and `trackUserAction` — was entirely dead code after `navbar.tsx` migrated to import `event` directly from `@/lib/gtag`.

**Fix**:

- Deleted `useAnalytics()` from `src/hooks/use-analytics.ts`.
- Renamed `src/hooks/use-analytics.ts` → `src/hooks/use-page-view.ts` (file now only exports `usePageView`).
- Updated `src/App.tsx` import: `from "@/hooks/use-analytics"` → `from "@/hooks/use-page-view"`.

#### OAK-111 — Fix card_status_toggled semantic event type

**Problem**: The toggle in `src/pages/edit.tsx` fired `event("select_content", { content_type: "button", item_id: "card_status_toggled" })`. `select_content` describes a UI selection action; `card_status_toggled` describes a mutation outcome. These are different semantic classes.

**Fix**: Changed to `event("card_status_toggled", { collection: card.collection, active: newActiveStatus })`. This matches the top-level event naming convention used by all other mutation events and adds the `active` param so GA reports show toggle direction.

#### OAK-112 — Fix: password reset creates session but fires no login event

**Problem**: `handleVerifyCodeAndReset` in `src/pages/sign-in.tsx` calls `resetPassword()` which returns `createdSessionId` — the user is now authenticated. Only `event("password_reset", {})` was firing. No `login` event fired for this path.

**Fix (Option A — fire both)**: Added `event("login", { method: "email_code" })` immediately after `event("password_reset", {})` in `handleVerifyCodeAndReset`. The `login` event is the signal that a session was created; `password_reset` is an additional signal that a password change also happened. Both fire.

**Test update**: Added assertion in `src/test/pages/sign-in.test.tsx` OAK-52 describe block that `event("login", { method: "email_code" })` fires alongside `event("password_reset", {})` in the successful reset test.

#### Updated GA4 Event Taxonomy (as of OAK-112)

| Event name            | Params                                       | Fired by                                                     |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `generate`            | `content_type: "booster_pack"`, `pack_count` | `use-booster-pack-generation.ts`                             |
| `download`            | `file_name`, `file_extension`, `pack_count`  | `use-excel-export.ts`                                        |
| `select_content`      | `content_type: "button"`, `item_id`          | `index.tsx`, `edit.tsx` (nav/modal buttons only)             |
| `card_created`        | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`                        |
| `card_updated`        | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`                        |
| `card_moved`          | `from_collection`, `to_collection`           | `card-edit-sheet.tsx`                                        |
| `card_deleted`        | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`                        |
| `card_status_toggled` | `collection`, `active`                       | `edit.tsx`                                                   |
| `category_created`    | `category_id`                                | `categories.tsx`                                             |
| `category_updated`    | `category_id`                                | `categories.tsx`                                             |
| `category_deleted`    | `category_id`                                | `categories.tsx`                                             |
| `login`               | `method: "password" \| "email_code"`         | `sign-in.tsx` (password sign-in + password reset completion) |
| `password_reset`      | `{}`                                         | `sign-in.tsx`                                                |
| `user_invited`        | `{}`                                         | `admin/users.tsx`                                            |
| `performance_timing`  | `timing_name`, `duration_ms`, `pack_count`   | `use-booster-pack-generation.ts` via `timing()`              |
| `form_submit`         | `form_name`, `success`                       | via `useAnalytics().trackFormSubmission`                     |

#### Key architectural decisions (additions)

- **Always fire `event()` after `await`, never before**: GA events should only record operations that succeeded. Firing before the await means failed writes produce phantom GA events. `card-edit-sheet.tsx` is the canonical correct implementation.
- **`login` fires for every session creation, regardless of method**: Both direct sign-in and password-reset-sign-in fire `login`. The `method` param distinguishes them. `password_reset` additionally fires to track the reset operation itself.
- **`useAnalytics()` is deleted — import `event` from `@/lib/gtag` directly**: The hook abstraction was removed after OAK-90 eliminated all callers. Call sites import `event`/`timing`/`exception` directly from `@/lib/gtag`. `usePageView` is preserved in `src/hooks/use-page-view.ts`.

#### Verification Results

- TypeScript: 0 errors
- Lint: 0 errors (1 pre-existing warning in `account-panel.tsx` — expected)
- Tests: ≥ 128 passing, 0 failing
- Build: Successful
- Breaking Changes: None

---

### March 27, 2026 - Analytics Audit & Event Standardization (OAK-89, OAK-90, OAK-91)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-89 eliminates duplicate analytics events that were being fired for the same user action. OAK-90 migrates all event calls from the legacy UA-era `{ action, category, label, value }` shape to the GA4 flat-params pattern and replaces the deprecated `timing_complete` hit type with a custom `performance_timing` event. OAK-91 adds missing instrumentation for sign-in and user invite flows.

#### OAK-89 — Duplicate event removal

- Deleted the redundant `event({ action: "page_view", category: "navigation", label: pathname })` call from `usePageView` in `src/hooks/use-analytics.ts`. The `pageview(url)` call (which fires `gtag("config", ...)`) was already sufficient; the second `event()` call was producing a duplicate hit in GA.
- Deleted the duplicate `export` event in `handleGenerateAndExport` in `src/pages/index.tsx`. The `download` event fired inside `use-excel-export.ts` already covered this action.

#### OAK-90 — GA4 event taxonomy standardization

**`src/lib/gtag.ts`** — rewrote two exported function signatures:

- `event(eventName: string, params?: Record<string, unknown>)` — flat params object; no more `{ action, category, label, value }` wrapper. Maps directly to `gtag("event", eventName, params)`.
- `timing(name: string, durationMs: number, extra?: Record<string, unknown>)` — fires `gtag("event", "performance_timing", { timing_name: name, duration_ms: durationMs, ...extra })`. Replaces the deprecated `timing_complete` hit type that the old `timing()` used. The `exception()` signature is unchanged.

**Call site migrations**:

| File                             | Old call                                     | New call                                                                                                             |
| -------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `use-analytics.ts`               | `event({ action: "button_click", ... })`     | `event("select_content", { content_type: "button", item_id })`                                                       |
| `use-analytics.ts`               | `event({ action: "form_submit", ... })`      | `event("form_submit", { form_name, success })`                                                                       |
| `use-analytics.ts`               | `event({ action, label: details })`          | `event(action, details ? { details } : undefined)`                                                                   |
| `use-booster-pack-generation.ts` | `event({ action: "generate", ... })`         | `event("generate", { content_type: "booster_pack", pack_count })`                                                    |
| `use-booster-pack-generation.ts` | `timing({ ... })`                            | `timing("pack_generation", totalDuration, { pack_count })`                                                           |
| `use-excel-export.ts`            | `event({ action: "download", ... })`         | `event("download", { file_name: "BoosterPacks.xlsx", file_extension: "xlsx", pack_count })`                          |
| `index.tsx`                      | `event({ action: "open_modal", ... })`       | `event("select_content", { content_type: "button", item_id: "open_spreadsheet_modal" })`                             |
| `edit.tsx`                       | `event({ action: "edit_card" })` etc.        | `event("select_content", { content_type: "button", item_id: "edit_card"/"new_card"/"card_status_toggled" })`         |
| `editcard.tsx`                   | `event({ action: "card_created" })` etc.     | `event("card_created"/"card_updated"/"card_deleted", { collection })`                                                |
| `categories.tsx`                 | `event({ action: "category_created" })` etc. | `event("category_created"/"category_updated"/"category_deleted", { category_id })`                                   |
| `card-edit-sheet.tsx`            | (no prior analytics)                         | `event("card_created"/"card_updated"/"card_moved"/"card_deleted", { collection / from_collection / to_collection })` |

#### OAK-91 — Missing event instrumentation

**`src/pages/sign-in.tsx`**:

- Added `import { event } from "@/lib/gtag"`.
- Fires `event("login", { method: "password" })` after successful password sign-in.
- Fires `event("login", { method: "email_code" })` after successful email code sign-in (inside the forgot-password flow's `handleVerifyCodeAndReset`, when the user is completing a reset and simultaneously signing in).
- Fires `event("password_reset", {})` after successful password reset (same handler, after confirming the reset itself).

**`src/pages/admin/users.tsx`**:

- Added `import { event } from "@/lib/gtag"`.
- Fires `event("user_invited", {})` after a successful Clerk invitation. No email address or other PII is included in the params.

#### GA4 Event Taxonomy (complete as of OAK-91; superseded by OAK-107/111/112 — see above)

| Event name           | Params                                       | Fired by                                        |
| -------------------- | -------------------------------------------- | ----------------------------------------------- |
| `generate`           | `content_type: "booster_pack"`, `pack_count` | `use-booster-pack-generation.ts`                |
| `download`           | `file_name`, `file_extension`, `pack_count`  | `use-excel-export.ts`                           |
| `select_content`     | `content_type: "button"`, `item_id`          | `index.tsx`, `edit.tsx`                         |
| `card_created`       | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`           |
| `card_updated`       | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`           |
| `card_moved`         | `from_collection`, `to_collection`           | `card-edit-sheet.tsx`                           |
| `card_deleted`       | `collection`                                 | `editcard.tsx`, `card-edit-sheet.tsx`           |
| `category_created`   | `category_id`                                | `categories.tsx`                                |
| `category_updated`   | `category_id`                                | `categories.tsx`                                |
| `category_deleted`   | `category_id`                                | `categories.tsx`                                |
| `login`              | `method: "password" \| "email_code"`         | `sign-in.tsx`                                   |
| `password_reset`     | `{}`                                         | `sign-in.tsx`                                   |
| `user_invited`       | `{}`                                         | `admin/users.tsx`                               |
| `performance_timing` | `timing_name`, `duration_ms`, `pack_count`   | `use-booster-pack-generation.ts` via `timing()` |
| `form_submit`        | `form_name`, `success`                       | via `useAnalytics().trackFormSubmission`        |

#### Key architectural decisions

- **Never use UA-era param shape**: The `{ action, category, label, value }` wrapper was the Universal Analytics pattern. GA4 expects a flat params object. The new `event()` signature enforces this — the first argument is the event name, the second is a plain flat object.
- **`performance_timing` replaces `timing_complete`**: The `timing_complete` hit type was deprecated in GA4. Custom events with a `timing_name` + `duration_ms` structure are the GA4-idiomatic replacement.
- **No PII in event params**: `user_invited` fires with an empty params object — the invitee's email address is not included. `collection` and `category_id` are Firestore path identifiers, not PII.
- **Single `download` event per export**: The event fires inside `useExcelExport` before the xlsx dynamic import, so it fires even if the export fails after the import resolves. The duplicate call in `index.tsx` was removed.

#### Test updates

- `src/test/pages/sign-in.test.tsx`: Added `vi.mock("@/lib/gtag", () => ({ event: vi.fn() }))`. Added assertions that `event("login", { method: "password" })` fires on successful password sign-in, `event("login", { method: "email_code" })` fires on successful code verification, and `event("password_reset", {})` fires on successful reset.
- `src/test/pages/admin/users.test.tsx`: Added `vi.mock("@/lib/gtag", () => ({ event: vi.fn() }))`. Added assertion that `event("user_invited", {})` fires on successful invite.
- `src/test/hooks/use-booster-pack-generation.test.ts`: No changes needed — existing tests check call counts, not event shapes.

#### Verification Results

- TypeScript: 0 errors (both `tsconfig.json` and `tsconfig.api.json`)
- Lint: 0 errors (1 pre-existing warning in `account-panel.tsx` — expected)
- Tests: 128 passing, 0 failing (count unchanged)
- Build: Successful
- Breaking Changes: None

---

### March 25, 2026 - Changelog Page M3 Redesign (OAK-86, OAK-87, OAK-88)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-86 ports the changelog page to M3 design tokens and motion variants. OAK-87 adds visual distinction to the current version entry and a recency badge for recently-shipped versions. OAK-88 collapses older entries behind a "Show older" toggle.

#### Changes — `src/pages/changelog.tsx` (only file modified)

**OAK-86 — M3 token migration**:

- Replaced all hardcoded Tailwind color classes (`text-blue-500`, `bg-blue-50`, `bg-card`, `text-muted-foreground`, `border-border`, etc.) with M3 CSS custom properties via inline `style` props.
- Replaced `getSectionColor(type)` (returned Tailwind class string) with `getSectionStyle(type): React.CSSProperties` — returns `{ background, color }` using `var(--md-sys-color-*)` tokens. Section type mapping: `feat` → primary-container, `fix` → tertiary-container, `chore` → secondary-container, `init`/default → surface-variant.
- Removed color modifier classes from `getSectionIcon` icons — icons now inherit `currentColor` from the styled parent `<span>`.
- Applied M3 typography scale: `text-headline-large` (h1), `text-title-large` (h2 version), `text-body-large` (subtitle), `text-body-medium` (date row, list items), `text-label-large` (section h3, toggle button), `text-label-medium` (badge chips).
- Replaced per-entry `initial/animate/transition` inline props with `listContainerVariants` (outer `motion.div`) + `listItemVariants` (per-entry `motion.div`) from `@/lib/motion` — same stagger pattern as `card-panel.tsx`.
- Accordion `ease` changed from `"easeInOut"` to `[0.2, 0, 0, 1]` (M3 Standard curve, copied by value — not imported — because easing constants in `motion.ts` are not exported).
- Content panel border-t moved from `className="border-t border-border/50"` to `style={{ borderTop: "1px solid var(--md-sys-color-outline-variant)" }}`.
- Timeline line and bullet dot backgrounds changed from `bg-border` to `style={{ background: "var(--md-sys-color-outline-variant)" }}`.

**OAK-87 — Current version highlight + recency badge**:

- Current version entry (`isCurrent: true`) gets a `2px solid var(--md-sys-color-primary)` border and `shadow-elevation-1` — visually distinct without a colored background fill (user feedback: no purple card fill).
- "Current" badge replaced with M3 chip: `text-label-medium`, `background: var(--md-sys-color-primary)`, `color: var(--md-sys-color-on-primary)`.
- GitCommit avatar circle on current entry uses `primary` background + `on-primary` color.
- Added `isRecentEntry(dateStr)` module-scope helper: strips ordinal suffixes (`2nd` → `2`), parses with `new Date()`, returns `true` if within 30 days of now. Returns `false` on any parse failure (defensive).
- "New" badge added (`tertiary-container` background) on non-current entries where `isRecentEntry(entry.date)` is true.

**OAK-88 — Show-all toggle**:

- `RECENT_COUNT = 3` constant — first N entries always visible.
- `showAll` state (default `false`).
- `visibleEntries = showAll ? entries : entries.slice(0, RECENT_COUNT)`.
- `hiddenCount = entries.length - RECENT_COUNT`.
- Toggle button: M3 outlined chip style (transparent fill, `primary` text, `outline` border, rounded-full). Shows "Show X older versions" (with `ChevronDown` icon) or "Show less".
- Button wrapped in `AnimatePresence mode="wait"` + `motion.div` with `key={showAll ? "show-less" : "show-more"}` and `variants={pageVariants}` from `@/lib/motion`.

#### Key decisions

- **No `primary-container` card fill**: The current version entry uses a white (`surface`) background with a `2px primary` border for distinction. A full `primary-container` fill (purple) was removed based on user feedback — it was too visually heavy.
- **Accordion `ease` copied by value**: `[0.2, 0, 0, 1]` (M3 Standard) is written inline on the accordion `motion.div` because `height: auto` animations cannot use shared named variants, and the easing constants in `motion.ts` are not exported.
- **`isRecentEntry` uses `<=` not `<`**: Exactly 30 days ago is considered "recent". `now` is evaluated at render time, so badges expire naturally as calendar time passes.

#### Post-review fixes (applied during same session)

- Added `aria-expanded` + `aria-controls` on each accordion `<button>`; matching `id` on each content grid `<div>` — WCAG 4.1.2 compliance for screen readers.
- Added `focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2` to accordion button — keyboard focus ring restored while keeping `focus:outline-none` for pointer users.
- Guarded the show-more `AnimatePresence` block behind `entries.length > RECENT_COUNT` — prevents "Show 0 older versions" button when changelog has ≤ 3 entries.
- Replaced `pageVariants` (16px slide) on show-more button with inline opacity-only fade (150ms) — page-level slide transition was semantically wrong for a label-swap toggle.
- Fixed indentation misalignment of accordion inner `overflow-hidden` and `px-6` divs — structural clarity, no runtime change.

#### Verification Results

- TypeScript: 0 errors
- Lint: 0 errors (1 pre-existing warning in `account-panel.tsx` — expected)
- Tests: 128 passing, 0 failing (no changelog tests exist)
- Build: Successful
- Breaking Changes: None

---

### March 25, 2026 - M3 Motion System + Typography Scale (OAK-60, OAK-61)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-60 centralizes all Framer Motion variant definitions into a single module so animation parameters are not scattered across component files. OAK-61 formalizes the Material Design 3 typography scale as Tailwind utility classes so heading and body text sizes are semantically named rather than ad-hoc `text-lg font-medium` combinations.

#### New file

**`src/lib/motion.ts`**:

- Exports: `pageVariants`, `listContainerVariants`, `listItemVariants`, `surfaceVariants`, `drawerVariants`, `backdropVariants`, `accordionVariants`.
- Module-scope easing constants: `EMPHASIZED_DECELERATE = [0.05, 0.7, 0.1, 1.0]`, `EMPHASIZED_ACCELERATE = [0.3, 0, 1, 1]`, `STANDARD = [0.2, 0, 0, 1]`.
- Each variant has JSDoc noting enter/exit behavior, easing curve used, and M3 duration token equivalent.
- No default export. Named exports only.
- **All future Framer Motion variants for admin UI must be defined here, not inline in component files.**

#### Modified files

**`src/styles/globals.css`**:

- Added M3 Typography Scale as `@layer utilities` at end of file.
- Classes: `text-display-large` (57px/400), `text-display-medium` (45px/400), `text-headline-large` (32px/400), `text-title-large` (22px/400), `text-title-medium` (16px/500), `text-body-large` (16px/400), `text-body-medium` (14px/400), `text-label-large` (14px/500), `text-label-medium` (12px/500).
- Use these classes instead of ad-hoc `text-lg font-medium` combinations wherever M3 spec sizes apply.

**`src/layouts/admin.tsx`**:

- Imports `pageVariants` from `@/lib/motion`.
- Wraps `<Outlet />` in `<AnimatePresence mode="wait" initial={false}>` + `<motion.div key={locationKey} variants={pageVariants} ...>`.
- `locationKey` comes from `useLocation().key` — unique per navigation event, causing the exit + enter animation to fire on every route change.
- `p-6` padding moved from `<main>` onto the `motion.div` so it is part of the animated surface.

**`src/components/admin/nav-drawer.tsx`**:

- Replaced hardcoded `animate={{ x: 0 }}` / `initial={{ x: -280 }}` / `exit={{ x: -280 }}` props with `variants={drawerVariants}` from `@/lib/motion`.
- Replaced hardcoded backdrop `animate={{ opacity: 1 }}` / `initial={{ opacity: 0 }}` props with `variants={backdropVariants}`.

**`src/components/m3/bottom-sheet.tsx`**:

- Replaced spring transition (`type: "spring", damping: 30, stiffness: 300`) with M3 easing.
- Enter: `emphasized-decelerate`, 400ms. Exit: `emphasized-accelerate`, 250ms.
- Defined as inline variants on the component (not in `motion.ts`) because bottom-sheet uses `drag` + `dragConstraints` which conflicts with the named `hidden`/`visible`/`exit` pattern.

**`src/components/admin/card-panel.tsx`**:

- Added `AnimatePresence mode="wait"` around the view-mode conditional block.
- Grid and list items use `listContainerVariants` (container) + `listItemVariants` (per-item) for stagger.
- Table view uses `pageVariants` fade on the outer `<div>` only — HeroUI `<Table>` rows must NOT be wrapped in `motion.tr` or `motion.div` because HeroUI's react-aria collection internals block Framer Motion ref access.
- Card count `<p>` uses `text-body-medium` class.

**`src/components/admin/top-app-bar.tsx`**:

- `<h1>` changed from `text-lg font-medium` to `text-title-large`.

**`src/pages/admin/users.tsx`**:

- Both `<h2>` section headings changed to `text-headline-large`.
- Removed inline CSS variable fallback hex values from status badge `style` props (unnecessary — custom properties are always defined).

**`src/components/admin/card-edit-sheet.tsx`**:

- Bottom sheet `<h2>` uses `text-title-large`.
- Delete confirm `<p>` uses `text-label-large`.
- Delete button changed from `variant="light"` to `variant="bordered"` for better visibility.

**`src/components/admin/account-panel.tsx`**:

- Both `<h3>` section headings use `text-title-medium`.

**`src/test/layouts/admin.test.tsx`**:

- Added `key: "default"` to `useLocation` mock return value to match the `locationKey` destructuring in `admin.tsx`.
- Added `framer-motion` mock (renders children synchronously) and `@/lib/motion` mock.

#### Key architectural decisions

- **Decision A — Central variant registry**: All Framer Motion variants for the admin shell live in `src/lib/motion.ts`. Component files import variants; they do not define them inline. This ensures animation timing is tunable in one file.
- **Decision B — HeroUI table rows are not animatable individually**: Wrapping HeroUI `<Table>` row components in `motion.*` causes a Framer Motion ref error because react-aria manages DOM refs internally. Only wrap the outer container.
- **Decision C — Bottom sheet stays inline**: The bottom sheet's `drag` + `dragConstraints` pattern requires inline transition config on the `motion.div` — it cannot use the shared `hidden`/`visible`/`exit` variant pattern cleanly. Its transitions are defined inline with M3 easing values.
- **Decision D — `locationKey` not `pathname` for page transitions**: Using `pathname` as the animation key would suppress transitions when navigating to the same route with different state. `useLocation().key` is unique per navigation event and is the correct key for `AnimatePresence`.
- **Decision E — `initial={false}` on `AnimatePresence`**: Prevents the enter animation from firing on the very first render (page load). Only subsequent route changes animate.
- **Decision F — Typography as `@layer utilities`**: Defining M3 type scale classes in `@layer utilities` makes them available as Tailwind utility classes while respecting Tailwind's cascade layer priority. They override base styles without needing `!important`.

#### Verification Results

- TypeScript: 0 errors
- Lint: 0 errors (1 pre-existing warning in `account-panel.tsx` for intentional `[user?.id]` dep — expected)
- Tests: **128 passing, 0 failing** (count unchanged)
- Build: Successful
- Breaking Changes: None

---

### March 24, 2026 - Post-Review Hardening

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry. All changes are confined to already-touched files; no new files were created.

#### `api/_auth.ts`

- Removed duplicate standalone `verifyToken` import from `@clerk/backend`.
- Changed token verification from `verifyToken(token, { secretKey: ... })` to `clerkClient.verifyToken(token)` — uses the already-instantiated module-scope client rather than re-passing the secret key.

#### `api/users/invite.ts`

- `redirectUrl` now falls through three sources in priority order: `process.env.APP_URL` (server-side, Vercel project setting) → `process.env.VITE_APP_URL` (Vite build-time variable, unreliable in Node serverless runtime on preview deployments) → hardcoded production URL. **Set `APP_URL` in Vercel project settings for preview/staging deployments.**
- Added `res.setHeader("Allow", "POST")` on the 405 response (RFC 7231 compliance).
- Added basic email format regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) validation before calling Clerk — fast 400 for clearly malformed addresses.

#### `api/users/list.ts`

- Added `res.setHeader("Allow", "GET")` on the 405 response.

#### `src/components/admin/account-panel.tsx`

- Added `extractClerkError(err: unknown): string` helper — same structural duck-type pattern as `sign-in.tsx` — to extract `err.errors[0].longMessage` from Clerk structured errors before passing to the snackbar. Both catch blocks (profile save and password change) now use it. This prevents raw Clerk SDK internals from reaching the user.
- Changed `useEffect` dependency from `[user]` to `[user?.id]` — prevents form fields from resetting mid-edit when Clerk's SDK produces new `user` object references during background polling.
- Avatar section now always renders. When `user.imageUrl` is absent, a `<div>` with `var(--md-sys-color-primary-container)` background displays the user's initials (first letter of `firstName` + first letter of `lastName`, falling back to first letter of email).

#### `src/utils/admin-api.ts`

- `listUsers` now performs runtime shape validation: `Array.isArray(body)` check before returning; throws `"Unexpected response format from /api/users/list"` if the server returns a non-array body on HTTP 200.

#### `src/pages/admin/users.tsx`

- Null `getToken()` handling: when `getToken()` returns `null` in `fetchUsers`, sets `loadError` to `"Session expired. Please refresh the page."` before returning (previously showed a silent empty state).
- Same null guard in `handleInvite`: sets `inviteError` to the same message.
- Added inline comment on the fire-and-forget `fetchUsers()` call after a successful invite.

#### `tsconfig.api.json`

- `"moduleResolution"` changed from `"node"` to `"node16"`, `"module"` changed from `"CommonJS"` to `"Node16"` — enables `exports` map resolution for modern packages like `@clerk/backend`.

#### Test changes

- `src/test/components/admin/account-panel.test.tsx`: Added 1 new test: "shows snackbar with error message when password change fails".
- `src/test/utils/admin-api.test.ts`: Added `expect(result).toBeUndefined()` assertion to the `inviteUser` success test to verify the function returns void.

#### Key new patterns established

- **`APP_URL` vs `VITE_APP_URL`**: Use `APP_URL` (plain server env var) for redirect URLs in serverless functions. `VITE_APP_URL` is a Vite build-time substitution that is not reliably available in the Node runtime on preview deployments.
- **`extractClerkError` pattern**: Both `sign-in.tsx` and `account-panel.tsx` now use the same structural guard to extract human-readable messages from Clerk API errors. Apply this pattern in any future component that handles Clerk errors — do not surface raw SDK error objects.
- **`[user?.id]` not `[user]` for Clerk user effects**: Clerk's SDK may produce new `user` object references during background polling without changing any actual user data. Using `[user?.id]` as the `useEffect` dependency prevents spurious form field resets mid-edit.

#### Verification Results

- Build: Successful
- Lint: Clean
- Tests: **128 passing, 0 failing** (127 → 128; +1 test)
- Breaking Changes: None

---

### March 24, 2026 - Post-Ship Fixes: Custom Account Panel + Dev Error UX (OAK-81, OAK-82)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

#### OAK-82 — Fix "Failed to load users" in dev + improve load-error UX

**Root cause**: `npm run dev` runs Vite only. The `/api/users/list` serverless function does not exist in that context. The fetch returns a 404 HTML page; `res.json()` throws; the error reached a transient `<M3Snackbar>` that auto-dismissed after 4 seconds, leaving an empty table with no explanation.

**Fix 1 — `dev:full` script**: Added `"dev:full": "vercel dev"` to `package.json` scripts. `vercel dev` runs both the Vite frontend and serverless functions on a single port. Use this when developing features that call `/api/*` endpoints.

**Fix 2 — Inline error state**: Replaced the snackbar pattern for load failures with a persistent inline error block in `src/pages/admin/users.tsx`. New `loadError: string | null` state. When set, renders: "Could not load team members" heading (error color), the error message, and a "Retry" button that re-calls `fetchUsers()`. The `<M3Snackbar>` is now reserved exclusively for invite operation feedback.

**All changes confined to `src/pages/admin/users.tsx` and `package.json`.**

#### OAK-81 — Custom account management panel (replaces `<UserProfile />`)

**Why**: `<UserProfile />` renders an iframe to Clerk's hosted UI — it ignores M3 design tokens, renders inconsistently in dark mode, and cannot be tested without an iframe mock.

**New file: `src/components/admin/account-panel.tsx`** (named export: `AccountPanel`):

- `useUser()` from `@clerk/clerk-react` (no subpath imports).
- Avatar display: `user.imageUrl` in a 16×16 rounded-full `<img>`.
- Section 1 — Profile Information: email (read-only, description "Email changes require verification — contact support."), first name (required), last name (optional). Save → `user.update({ firstName, lastName })`.
- Section 2 — Change Password: current password, new password (min 8 chars), confirm password. Save → `user.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: false })`. On success: clears all three fields.
- Validate-on-submit, clear-on-change (lesson #15). Own `<M3Snackbar>` for success/error feedback.
- Returns `null` when `!isLoaded` (avoids flash with undefined user).

**Modified `src/pages/admin/users.tsx`**:

- Removed `UserProfile` from `@clerk/clerk-react` import.
- Added `import { AccountPanel } from "@/components/admin/account-panel"`.
- Replaced `<UserProfile appearance={...} />` with `<AccountPanel />`.

**New test file: `src/test/components/admin/account-panel.test.tsx`** — 5 tests: email is read-only, profile saves via `user.update`, empty first name shows validation error, password mismatch shows error, success snackbar + field clearing after password change.

**Updated `src/test/pages/admin/users.test.tsx`**: Added `useUser` to `@clerk/clerk-react` mock, removed `UserProfile` from mock, added `@/components/admin/account-panel` mock, added 1 new test ("shows inline error with retry button when load fails").

#### Verification Results

- Build: Successful
- Lint: Clean
- Tests: **127 passing, 0 failing** (121 → 127; +6 tests across 2 modified + 1 new test file)
- Breaking Changes: `/admin/users` "My Account" section now shows a custom panel instead of the Clerk iframe. The `dev:full` script is new; existing `dev` script is unchanged.

---

### March 24, 2026 - Vercel API Layer + Admin Users Page (OAK-58, OAK-59)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-58 stands up the Vercel serverless API layer needed to proxy Clerk's user management endpoints without exposing the Clerk Secret Key to the browser. OAK-59 replaces the 10-line `/admin/users` stub with a full users management page.

#### New files

**`api/_auth.ts`**:

- Exports: `requireAuth(req, res): Promise<AuthPayload>` and `clerkClient`.
- `clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })` at module scope — reused across warm-starts.
- `requireAuth` extracts `Authorization: Bearer <token>`, calls `clerkClient.verifyToken(token)`, returns `{ userId: payload.sub }`. Sends 401 and throws on failure — callers must `try/catch` and `return` immediately.
- `@clerk/backend` is Node-only; never import it from any `src/` file.

**`api/users/list.ts`** (`GET /api/users/list`):

- 405 guard → auth → `clerkClient.users.getUserList({ limit: 100 })` → sanitized `{ id, email, firstName, lastName, lastSignInAt }` array.
- Does NOT expose `emailAddresses` array, password hashes, or internal Clerk metadata.

**`api/users/invite.ts`** (`POST /api/users/invite`):

- 405 guard → auth → email validation (400 if missing/empty) → `clerkClient.invitations.createInvitation({ emailAddress, redirectUrl })`.
- `redirectUrl` = `${process.env.VITE_APP_URL ?? "https://ozboosterpacks.albertshih.org"}/sign-in`.
- Surfaces Clerk's `errors[0].message` on failure.

**`tsconfig.api.json`** (project root):

- IDE support only; Vercel uses esbuild at deploy time.
- `"module": "CommonJS"`, `"moduleResolution": "node"` — different from the Vite tsconfig.
- `"include": ["api/**/*.ts"]`.
- Pre-commit `tsc --noEmit` uses `tsconfig.json` which excludes `api/` — run `tsc -p tsconfig.api.json --noEmit` manually to check API types.

**`src/utils/admin-api.ts`**:

- Exports: `AdminUser` interface, `listUsers(token)`, `inviteUser(token, email)`.
- Both functions throw `Error` with human-readable message on non-ok responses.
- `inviteUser` returns `void`. No default export. Named exports only.
- Never import `@clerk/backend` here — this is a browser-side fetch client.

**`src/pages/admin/users.tsx`** (replaced stub):

- Three sections: User list table, Invite modal/bottom-sheet, My Account.
- `InviteFormContentProps` interface + `InviteFormContent` function (props-based, non-exported) — same pattern as `FormContent` in `card-edit-sheet.tsx`.
- `getToken()` called with NO arguments — returns Clerk JWT for `/api/users/*`. Different from `getToken({ template: "integration_firebase" })` used in card management.
- `UserProfile` from `@clerk/clerk-react` — styled via Appearance API with M3 color tokens.
- Status badge: `lastSignInAt !== null` → "Active" (primary-container), else → "Invited" (surface-variant).

#### Modified files

**`vercel.json`**:

- Rewrite source changed from `/(.*)` to `/((?!api/.*).*)` — the negative lookahead prevents `/api/*` requests from being rewritten to `/`, allowing Vercel to route them to serverless functions.

**`package.json`**:

- Added `@clerk/backend` to `dependencies` (not devDependencies — runs in Vercel production).
- Added `@vercel/node` to `devDependencies`.

#### New test files

**`src/test/utils/admin-api.test.ts`** — 5 tests: GET header, parsed array, non-ok throw, POST header+body, POST non-ok throw.

**`src/test/api/users.test.ts`** — 8 tests: list 405, list 401 (no header), list 401 (bad token), list 200 sanitized; invite 405, invite 401, invite 400 (no email), invite 200.

- Uses `vi.hoisted()` to declare mock functions before `vi.mock()` hoisting for stable `clerkClient` instance.

**`src/test/pages/admin/users.test.tsx`** — 5 tests: renders list, opens modal, submits invite, success snackbar, error stays in modal.

- Mocks: `@clerk/clerk-react` (UserProfile as stub div), `@/utils/admin-api`, `@/hooks/use-media-query`, `framer-motion`, `@heroui/modal`, `@heroui/button`, `@heroui/input`, `@heroui/table`, `@/components/m3/linear-progress`, `@/components/m3/snackbar`, `@/components/m3/bottom-sheet`.

#### Verification Results

- Build: Successful (new `users-DpxnC0l0.js` chunk, 5.28 kB)
- Lint: Clean (0 errors, pre-existing gtag.ts warnings only)
- Tests: **121 passing, 0 failing** (100 → 121; 21 new tests across 3 new test files)
- API type-check: `tsc -p tsconfig.api.json --noEmit` — 0 errors
- Breaking Changes: `/admin/users` no longer shows stub — shows full users management page.

---

### March 23, 2026 - Consolidated Card Management: Card Panel, Edit Sheet, Snackbar, Filter Persistence (OAK-54, OAK-55, OAK-56, OAK-57)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: The `/admin` route previously showed a stub "Card management coming soon." page. OAK-54 builds the full card management panel with table/grid/list views and localStorage filter persistence. OAK-55 adds an in-place card edit form (modal on desktop, bottom sheet on mobile) replacing the full-page `/editcard` flow. OAK-56 adds LinearProgress feedback and M3Snackbar error messages. OAK-57 provides CRUD audit tests and adds category mutation utilities.

#### New files

**`src/hooks/use-media-query.ts`** (named export: `useMediaQuery`):

- Extracted from `src/layouts/admin.tsx` (was inline there; now shared).
- SSR-safe: `typeof window !== "undefined"` guard in both `useState` initializer and `useEffect`.
- Uses `mql.addEventListener("change", handler)` pattern with cleanup.
- Second consumer: `card-edit-sheet.tsx` uses `useMediaQuery("(max-width: 768px)")`.

**`src/hooks/use-admin-filters.ts`** (named export: `useAdminFilters`):

- localStorage keys: `oz-admin.selectedCategory`, `oz-admin.viewMode`, `oz-admin.searchQuery`, `oz-admin.statusFilter`.
- Exports: `ViewMode = "table" | "grid" | "list"`, `StatusFilter = "all" | "active" | "inactive"`, `AdminFilters` interface.
- `readStorage` / `writeStorage` helpers with try/catch for private browsing / quota errors.
- Each setter calls the `State` setter and `writeStorage` immediately.
- `useState` initializers call `readStorage` lazily (not at module scope) for SSR safety.

**`src/contexts/admin-filters-context.tsx`** (named exports: `AdminFiltersProvider`, `useAdminFiltersContext`):

- `AdminFiltersProvider` instantiates `useAdminFilters()` and provides the result via context.
- `useAdminFiltersContext()` throws if called outside the provider.
- Consumed by both `NavDrawer` and `CardPanel` — single source of truth for filter state.

**`src/components/m3/snackbar.tsx`** (named export: `M3Snackbar`):

- Props: `message: string | null`, `onDismiss: () => void`, `actionLabel?: string`, `onAction?: () => void`, `durationMs?: number` (default 4000).
- When `message` is null: returns `null` (no DOM node).
- Auto-dismiss: `useEffect` fires `setTimeout(onDismiss, durationMs)` on non-null message; cleanup clears the timer.
- Uses CSS class `m3-snackbar-enter` (keyframe in `globals.css`) — no Framer Motion.
- `role="status"` + `aria-live="polite"` for screen reader announcement.
- Colors: `var(--md-sys-color-inverse-surface)` background, `var(--md-sys-color-inverse-on-surface)` text.
- Fixed position: `bottom-4 left-1/2 -translate-x-1/2`.

**`src/components/admin/card-edit-sheet.tsx`** (named export: `CardEditSheet`):

- Props: `mode: "create" | "edit"`, `card?: Card`, `categories: Category[]`, `isOpen`, `onClose`, `onSaved`, `onError: (message: string) => void`.
- Module-scope `ensureFirebaseAuth(getToken)` — same pattern as `editcard.tsx`.
- Internal `FormContent` function (non-exported) renders form fields; shared between desktop Modal and mobile BottomSheet.
- Desktop (`useMediaQuery("(max-width: 768px)") === false`): HeroUI `<Modal size="lg">`.
- Mobile: `<BottomSheet>` from `src/components/m3/bottom-sheet.tsx`.
- `useEffect([isOpen, mode, card])`: populates form from `card` prop on open; resets to blank for create mode; clears errors and delete confirm on close.
- Validate-on-submit, clear-on-change (CLAUDE.md lesson #15).
- Operations: `addDoc` (create), `updateDoc` (update same collection), `writeBatch` set+delete (move), `deleteDoc` (delete).
- Write payloads: `{ name, number, active }` only — NO `collection` field (CLAUDE.md lesson #29).
- Inline delete confirmation: sets `showDeleteConfirm = true`; renders inline section (not a nested modal).
- `onError` callback called from catch blocks; `onSaved()` + `onClose()` called only on success.

**`src/components/admin/card-panel.tsx`** (named export: `CardPanel`):

- No props — reads all state from `useAdminFiltersContext()`.
- `fetchCards`: `useCallback([filters.selectedCategory])` — re-fetches only on category change.
- When `selectedCategory === "all"`: fetches `BASE_COLLECTION_IDS` + `COLLECTION_IDS.SPOONBILL` + wildcard-eligible categories not already in base set. Deduplication via `Set<string>` keyed on `colId:docId`.
- `collection: colId` placed before spread (CLAUDE.md lesson #28); `active: data.active !== false` (lesson #6).
- `filteredCards`: `useMemo` over `cards` — client-side search + status filter (never triggers re-fetch).
- `handleToggleActive`: optimistic local update + `fetchCards()` to confirm server state.
- View modes: Table (HeroUI `<Table>`), Grid (CSS grid), List (divide-y rows).
- View toggle: custom segmented button (3 `<button>` in flex row) — NOT HeroUI Tabs.
- FAB: `fixed bottom-6 right-6 lg:hidden` on mobile; inline `<Button className="hidden lg:flex">` on desktop.
- `<LinearProgress visible={isPending} />` at top of panel.
- `<M3Snackbar>` at bottom for errors.
- `<CardEditSheet>` receives `onSaved={fetchCards}` and `onError={setSnackbarMessage}`.

#### Modified files

**`src/layouts/admin.tsx`**:

- Removed inline `useMediaQuery` function; imports from `@/hooks/use-media-query`.
- Wraps the entire return JSX with `<AdminFiltersProvider>` from `@/contexts/admin-filters-context`.

**`src/components/admin/nav-drawer.tsx`**:

- Imports `useAdminFiltersContext` from `@/contexts/admin-filters-context`.
- `DrawerContentProps` gains `selectedCategory: string` and `onCategorySelect: (id: string) => void`.
- "Cards" header button: active when `selectedCategory === "all"` AND `pathname === "/admin"`; click calls `onCategorySelect("all")`.
- Category subitems: active when `selectedCategory === cat.name` AND `pathname === "/admin"`; click calls `onCategorySelect(cat.name)`.
- Navigation items (`/admin/users`, `/`): still call `navigate(href)`.
- Mobile: `onCategorySelect` also calls `onClose()` via the `handleItemClick` wrapper.

**`src/pages/admin/index.tsx`**:

- Replaced stub with `return <CardPanel />;` (single import from `@/components/admin/card-panel`).

**`src/utils/categories.ts`**:

- Added `updateDoc`, `deleteDoc` to firestore imports.
- Added 4 new exported async functions: `createCategory(displayName, categoryId)`, `updateCategoryDisplayName(categoryId, displayName)`, `toggleWildcardEligible(categoryId, value)`, `deleteCategory(categoryId)`.
- All four call `clearCategoriesCache()` after the Firestore write.
- Write payloads for `createCategory`: `{ name: categoryId, displayName, isWildcardEligible: false }`.

**`src/styles/globals.css`**:

- Added `--md-sys-color-inverse-surface` and `--md-sys-color-inverse-on-surface` tokens to both `:root` (light) and `.dark`.
- Added `@keyframes m3-snackbar-slide-up` and `.m3-snackbar-enter` class at end of file.

#### New test files

**`src/test/hooks/use-admin-filters.test.ts`** — 8 tests: default values, localStorage read on mount, and each setter (selectedCategory, viewMode, searchQuery, statusFilter) updating both state and localStorage, plus error handling.

**`src/test/components/m3/snackbar.test.tsx`** — 4 tests: null render, message display, auto-dismiss with fake timers, action button rendering.

**`src/test/components/admin/card-edit-sheet.test.tsx`** — 5 tests: validation error on empty save, addDoc payload (no `collection` field), onSaved callback, deleteDoc on confirmation, error clearing on field change.

**`src/test/pages/admin/card-crud.test.tsx`** — 4 tests: create payload audit, update payload audit, batch move (set+delete), delete confirmation.

**`src/test/pages/admin/category-crud.test.ts`** — 4 tests: createCategory → setDoc, updateCategoryDisplayName → updateDoc, toggleWildcardEligible → updateDoc, deleteCategory → deleteDoc.

**Modified `src/test/layouts/admin.test.tsx`**: Added `vi.mock("@/contexts/admin-filters-context", ...)` mock to prevent context errors in existing tests.

#### Verification Results

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 100 passing, 0 failing (75 → 100; 25 new tests across 5 new test files)
- Breaking Changes: `/admin` no longer shows stub page — shows full card management panel. Old `/edit`, `/editcard`, `/categories` routes still redirect to `/admin`.

---

### March 23, 2026 - Post-Ship Fixes for Card Panel (OAK-70, OAK-71, OAK-72)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**All changes are confined to `src/components/admin/card-panel.tsx`.**

#### OAK-70 — LinearProgress spacing

Added `className="mb-3"` to the `<LinearProgress>` component at the top of `CardPanel`. This adds visual breathing room between the loading bar and the toolbar row below it.

#### OAK-71 — Search crash fix for numeric `card.number` fields

**Problem**: `card.number` may be stored as a numeric type in Firestore (not always a string). The search filter called `card.number.toLowerCase()` directly, which throws `TypeError: card.number.toLowerCase is not a function` when the field is a number.

**Fix**: Changed both search field lookups in the `filteredCards` `useMemo` from:

```ts
card.name.toLowerCase();
card.number.toLowerCase();
```

to:

```ts
String(card.name ?? "").toLowerCase();
String(card.number ?? "").toLowerCase();
```

`String(value ?? "")` handles three cases: a string (pass-through), a number (converts to string), and `null`/`undefined` (returns `""`). This prevents the TypeError regardless of how the field was written to Firestore.

#### OAK-72 — Table column sorting

**What was added**:

- Local `SortDescriptor` interface: `{ column: "name" | "number" | "collection" | "active"; direction: "ascending" | "descending" }`.
- `sortDescriptor` state, default `{ column: "name", direction: "ascending" }`.
- Sort step appended to the `filteredCards` `useMemo`, applied after the existing search and status filters. Sorting does not replace or interfere with the existing filters.
- Sort logic: `name` and `collection` use `localeCompare`; `number` uses `parseInt` for numeric order (e.g., card `#9` sorts before `#10`); `active` sorts active-first by default.
- HeroUI `<Table>` receives `sortDescriptor` and `onSortChange` props.
- Sortable columns (`Name`, `Number`, `Collection`, `Active`) have `allowsSorting` and explicit `key` props. The `Actions` column is not sortable.

The sort step in `filteredCards` uses a direction-aware multiplier: `direction === "descending" ? -1 : 1` applied to the raw comparator result.

---

### March 23, 2026 - Admin Layout Shell with M3 Top App Bar and Navigation Drawer (OAK-53)

**Pre-release quality fix on the `development` branch** — no version bump, no changelog entry.

**Motivation**: Admin routes (`/edit`, `/editcard`, `/categories`) previously rendered inside the public `DefaultLayout`. OAK-53 creates a completely separate admin shell with a permanent M3 Navigation Drawer (desktop) and overlay drawer (mobile), with auth gating at the layout level. Old routes redirect to `/admin`.

#### New files

**`src/layouts/admin.tsx`** (default export: `AdminLayout`):

- Module-level `useMediaQuery(query: string): boolean` hook — SSR-safe (`typeof window !== "undefined"` guard), uses `mql.addEventListener("change", handler)` pattern.
- `ROUTE_TITLES: Record<string, string>` — `{ "/admin": "Cards", "/admin/users": "Users" }`.
- Auth guard: `useAuth()` from Clerk v5; `useEffect` watches `isLoaded + userId`; navigates to `/sign-in` with `replace: true` when `isLoaded && !userId`.
- While `!isLoaded`: returns centered `<M3Spinner size="lg">` on `var(--md-sys-color-surface)` background.
- While `!userId` (after loaded): returns `null` — prevents flash of admin UI while navigation is pending.
- State: `drawerOpen` (boolean), `isDesktop` (from `useMediaQuery("(min-width: 1024px)")`).
- Three `useEffect`s: (1) close drawer on resize to desktop, (2) auth guard, (3) body scroll lock (`document.body.style.overflow`).
- `useCallback` on `handleMenuToggle` and `handleDrawerClose` — both defined BEFORE early returns (Rules of Hooks compliance).
- Layout: `flex h-screen overflow-hidden` root → `<NavDrawer>` (left) + `<div className="flex flex-col flex-1 min-w-0 overflow-hidden">` (right) → `<TopAppBar>` + `<main className="flex-1 overflow-y-auto p-6"><Outlet /></main>`.
- Uses `<Outlet />` from react-router-dom (NOT `{children}` like `DefaultLayout`).
- Does NOT use `DefaultLayout` — completely independent shell.

**`src/components/admin/top-app-bar.tsx`** (named export: `TopAppBar`):

- Props: `{ title: string; onMenuToggle: () => void; isDrawerOpen: boolean }`.
- `h-16`, `sticky top-0 z-30`, `shadow-elevation-1`, `background: var(--md-sys-color-surface)`.
- Left: `<button>` with `Menu` icon (lucide-react), `lg:hidden`, full ARIA attrs (`aria-label`, `aria-expanded`, `aria-controls="admin-nav-drawer"`) + `/csclogo.svg` logo (`lg:hidden` — logo appears in nav drawer on desktop).
- Center: `<h1>` with title prop, `flex-1`, `color: var(--md-sys-color-on-surface)`.
- Right: `<UserButton>` from `@clerk/clerk-react` + `<a href="/">` with `ArrowLeft` icon, "Back to site" text, `color: var(--md-sys-color-primary)`.

**`src/components/admin/nav-drawer.tsx`** (named export: `NavDrawer`):

- Props: `{ isOpen: boolean; onClose: () => void }`.
- Internal state: `categories: Category[]`, `isLoading: boolean`.
- Category fetch: `getCategories()` with cancellation flag pattern (`let cancelled = false`).
- Active item detection: `useLocation()` internally; active → `background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container)`; `aria-current="page"` on active item.
- `DrawerContent` inner function (non-exported) takes `{ onClose, categories, isLoading, pathname, onItemClick }` props.
- Loading skeleton: 3x `<Skeleton className="h-10 w-full rounded-xl my-1" />` from `@heroui/skeleton`.
- Nav items: "Cards" header → `/admin`; category subitems from Firestore → `/admin`; divider; "Users" → `/admin/users`; divider; "Public Site" → `/`.
- Desktop: `<aside className="hidden lg:flex flex-col w-64 h-full shrink-0">` with `borderRight: 1px solid var(--md-sys-color-outline-variant)` — always in DOM. No `id` attribute (only the mobile dialog panel carries `id="admin-nav-drawer"` for `aria-controls` targeting).
- Mobile: `AnimatePresence` wrapping backdrop (`motion.div`, z-40) + panel (`motion.aside`, z-50); panel slides `x: -280 → 0`, duration 350ms, ease `[0.05, 0.7, 0.1, 1.0]` (M3 emphasized-decelerate); `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation menu"`.

**`src/pages/admin/index.tsx`** (default export: `AdminCardsPage`):

- Stub page — "Cards" heading, "Card management coming soon." placeholder.
- No auth guard — handled by `AdminLayout`.

**`src/pages/admin/users.tsx`** (default export: `AdminUsersPage`):

- Stub page — "Users" heading, "User management coming soon." placeholder.

#### Modified files

**`src/styles/globals.css`**:

- Updated `--md-sys-color-background` in `:root` from `#fef7ff` to `#ffffff` — pure white background for the admin shell in light mode.

**`src/App.tsx`**:

- Removed lazy imports for `EditPage`, `EditCardPage`, `CategoriesPage`.
- Added: `const AdminLayout = React.lazy(() => import("@/layouts/admin"))`.
- Added: `const AdminCardsPage = React.lazy(() => import("@/pages/admin/index"))`.
- Added: `const AdminUsersPage = React.lazy(() => import("@/pages/admin/users"))`.
- Replaced the `/admin` redirect with a nested layout route:
  ```tsx
  <Route element={<AdminLayout />}>
    <Route path="/admin" element={<AdminCardsPage />} />
    <Route path="/admin/users" element={<AdminUsersPage />} />
  </Route>
  ```
- Added redirects: `/edit` → `/admin`, `/editcard` → `/admin`, `/categories` → `/admin`.

#### New test file

**`src/test/layouts/admin.test.tsx`** — 2 tests in `describe("AdminLayout — OAK-53")`:

- "redirects to /sign-in when userId is null" — verifies auth guard fires.
- "renders children when authenticated" — verifies Outlet, TopAppBar, NavDrawer all render.
- Mock strategy: `@clerk/clerk-react` (`useAuth`), `react-router-dom` (`useNavigate`, `useLocation`, `Outlet`), `@/components/admin/top-app-bar`, `@/components/admin/nav-drawer`, `@/components/m3/spinner`.
- `matchMedia` shim required in `beforeEach` — `useMediaQuery` calls `window.matchMedia`, which jsdom does not implement.
- No Firebase mock needed — `AdminLayout` does not import Firebase; `NavDrawer` is fully mocked.

**Verification Results:**

- Build: Successful — new chunks: `admin-Crkfvc6o.js` (7.09 kB), `index-Cp3kIxJM.js` (0.34 kB), `users-TEH0h3h6.js` (0.34 kB); old `/edit`, `/editcard`, `/categories` chunks eliminated.
- Lint: Clean (same pre-existing baseline — no new warnings introduced).
- Tests: 75 passing, 0 failing (73 → 75; 2 new tests in `src/test/layouts/admin.test.tsx`).
- Breaking Changes: `/edit`, `/editcard`, `/categories` now redirect to `/admin`; behavior at those routes is preserved at `/admin` for future phases.

---

### March 16, 2026 - Custom Sign-In Page and Inline Forgot-Password Flow (OAK-51, OAK-52)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-50 wired the navbar to navigate to `/sign-in` via `useNavigate`, but that route did not exist — it fell through to `NotFoundPage`. OAK-51 implements the actual sign-in page at `/sign-in` using Clerk v5 hooks. OAK-52 extends it with an inline forgot-password flow that completes the full password-reset cycle without leaving the page.

#### OAK-51 — Custom sign-in page at `/sign-in`

**New file: `src/pages/sign-in.tsx`**:

- Default export: `SignInPage`
- Auth-guard: `useEffect` watches `isLoaded` + `isSignedIn` from `useAuth`; redirects to `/admin` (with `replace: true`) when already authenticated.
- Uses `useAuth` and `useSignIn` from `@clerk/clerk-react` (Clerk v5 — no subpath imports).
- Sign-in flow: `signIn.create({ strategy: "password", identifier, password })` → on `status === "complete"`, calls `setActive({ session: result.createdSessionId })` then `navigate("/admin")`.
- `extractClerkError(err: unknown): string` — structural type-guard at module scope. Checks for `err.errors[0].longMessage` via duck-typing. Does NOT import `isClerkAPIResponseError` from `@clerk/clerk-react/errors` because that subpath import has not been verified to work with this Vite config.
- Lazy-loaded via `React.lazy()` in `App.tsx`.

**New file: `src/test/pages/sign-in.test.tsx`** — 9 tests across two describe blocks:

- `"SignInPage — OAK-51"` (4 tests): renders fields, redirects when already authenticated, shows Clerk error on failure, navigates to `/admin` on success.
- `"SignInPage — OAK-52"` (5 tests): forgot-password panel transition, email submit transitions to code view, correct code + new password completes reset, "Back to Sign In" from forgot-email view, "Back to Sign In" from forgot-code view.

**Test mock strategy**:

- `framer-motion` IS mocked — `AnimatePresence` renders children synchronously; `motion.div` strips animation props and renders a plain `<div>`. This is required because jsdom has no animation engine.
- `@heroui/button` and `@heroui/input` ARE mocked as plain HTML elements (`<button>` and `<input>`) to avoid HeroUI's react-aria internals in tests.
- `@clerk/clerk-react`, `react-router-dom`, and `@/components/m3/spinner` are also mocked.
- `vi.clearAllMocks()` is called in `beforeEach` alongside manual mock reset to prevent state leakage between tests.

**Modified `src/App.tsx`**:

- Added `const SignInPage = React.lazy(() => import("@/pages/sign-in"))`.
- Added `<Route path="/sign-in" element={<SignInPage />} />` between the `/admin` redirect and the catch-all `*` route.
- The `/sign-in` route is no longer served by `NotFoundPage` via the catch-all.

**Modified `src/main.tsx`**:

- Added `signInUrl="/sign-in"` prop to `<ClerkProvider>`. This tells Clerk's SDK to redirect to the custom sign-in page instead of Clerk's hosted UI when unauthenticated access is detected.

**Test count**: 71 total (was 62; 9 new tests added).

#### OAK-52 — Inline forgot-password flow

All changes are inside `src/pages/sign-in.tsx`.

**`ViewState` discriminated union** (8 variants):

- `{ view: "idle" }` — initial state, sign-in form shown
- `{ view: "loading" }` — async operation in progress
- `{ view: "error"; message: string }` — sign-in failure
- `{ view: "forgot-email" }` — forgot-password email input panel
- `{ view: "forgot-email-error"; message: string }` — reset code send failure
- `{ view: "forgot-code" }` — verification code + new password panel
- `{ view: "forgot-code-error"; message: string }` — code verification or reset failure
- `{ view: "forgot-success" }` — success state; auto-transitions to `idle` after 3 seconds

**`PanelKey`** (4 variants): `"sign-in"` | `"forgot-email"` | `"forgot-code"` | `"forgot-success"`

**`getPanelKey(view)`**: Maps view states to panel keys. The `"loading"` state never changes the panel — it inherits the key of the panel that was active when the async operation started.

**Animation**: `xDirection` state (`1 | -1`) tracks the slide direction. Forward navigation sets `xDirection = 1`; "Back to Sign In" sets `xDirection = -1`. `AnimatePresence mode="wait" initial={false}` with `custom={xDirection}` on both `AnimatePresence` and `motion.div`; variants use `custom` to compute `x: dir * 40` (enter) and `x: dir * -40` (exit).

**Clerk forgot-password API sequence**:

1. `signIn.create({ strategy: "reset_password_email_code", identifier: forgotEmail })` — triggers the reset email
2. `signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code })` — validates the code
3. `signIn.resetPassword({ password: newPassword, signOutOfOtherSessions: true })` — sets the new password and signs out other sessions

**`forgot-success` auto-transition**: `setTimeout(() => setState({ view: "idle" }), 3000)` is set immediately after `setActive` resolves. In practice, the auth guard fires first (because `isSignedIn` becomes `true` after `setActive`) and redirects to `/admin` before the 3-second timer fires.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 71 passing, 0 failing
- Breaking Changes: None — `/sign-in` previously hit `NotFoundPage`; it now serves the sign-in form. All other routes unchanged.

**Note**: `unauthorized.tsx` still uses `<SignInButton>` from `@clerk/clerk-react` for its own modal sign-in. Migrating it to navigate to `/sign-in` instead is a future follow-up task.

---

### March 16, 2026 - Sign-In Page Post-Code-Review Hardening (OAK-51/52 follow-up)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: Six bugs were identified during a code review of the OAK-51/52 sign-in page implementation. All changes are confined to `src/pages/sign-in.tsx` and `src/test/pages/sign-in.test.tsx`.

#### Fix 1 — `setTimeout` race condition in `handleVerifyCodeAndReset`

**Problem**: `setActive()` was called before showing the `"forgot-success"` panel. Because `setActive` resolves the Clerk session immediately, the auth-guard `useEffect` (which watches `isSignedIn`) fired and redirected to `/admin` before the success panel ever rendered. Users never saw the confirmation screen.

**Fix**: Show the `"forgot-success"` panel first via `setState({ view: "forgot-success" })`, then call `setActive` and `navigate("/admin")` inside a `setTimeout` with a 3-second delay:

```typescript
setState({ view: "forgot-success" });
const id = setTimeout(async () => {
  await setActive({ session: result.createdSessionId });
  navigate("/admin");
}, 3000);
successTimeoutRef.current = id;
```

The timeout ID is stored in `successTimeoutRef` (a `useRef<ReturnType<typeof setTimeout> | null>`) so it can be cleared on unmount. A `useEffect` return function calls `clearTimeout(successTimeoutRef.current)` to prevent a state update on an unmounted component if the user navigates away before 3 seconds elapse.

**Why `useRef` for the timeout ID**: State would cause an extra re-render on assignment. A ref is the correct container for a mutable value that does not affect rendering.

#### Fix 2 — Misleading loading text on Sign In button

**Problem**: The Sign In button displayed "Signing in…" while loading, even when loading was triggered by clicking "Send me a sign-in code" (a different action). The conditional text was based on `isLoading` state, which is shared across all async operations on the page.

**Fix**: Removed the conditional text. The button always displays "Sign In". The `isLoading` spinner next to the button already communicates the loading state without needing a text change.

#### Fix 3 — `role="alert"` added to `ErrorBanner`

**Problem**: Error messages appeared dynamically in the DOM but were not announced by screen readers because the container lacked an ARIA live region.

**Fix**: Added `role="alert"` to the `ErrorBanner` component's root element. `role="alert"` implies `aria-live="assertive"` and `aria-atomic="true"`, so screen readers announce the error text immediately when it appears.

#### Fix 4 — Sub-flow state cleared on "Back to Sign In"

**Problem**: `handleBackToSignIn` only reset the `ViewState` to `{ view: "idle" }`. The sub-flow field values (`emailCode`, `code`, `newPassword`, `showNewPassword`) were not cleared. Re-entering a sub-flow would show stale values from the previous attempt.

**Fix**: `handleBackToSignIn` now also resets all four sub-flow state fields:

```typescript
setEmailCode("");
setCode("");
setNewPassword("");
setShowNewPassword(false);
```

#### Fix 5 — "or" divider visual bug on glassmorphic card

**Problem**: The previous implementation used an absolutely-positioned element overlaying the border line with a background color to "mask" the line behind the "or" text. On the glassmorphic card, the transparent/translucent background caused the border line to bleed through the text regardless of what color was used for the mask.

**Fix**: Replaced the overlay approach with a flex-row layout:

```tsx
<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-current opacity-20" />
  <span className="text-sm opacity-50">or</span>
  <div className="h-px flex-1 bg-current opacity-20" />
</div>
```

Two `<div>` elements act as the border lines and grow to fill available space via `flex-1`. No masking or absolute positioning required. Works correctly on any background, including glassmorphic surfaces.

#### Fix 6 — Test updated for async success flow

**Problem**: The `"submitting correct code and new password completes reset"` test asserted synchronous behavior but `setActive` is now called inside a `setTimeout`. The test would pass before `setActive` was called, making the assertion vacuous.

**Fix**: The test now uses Vitest's fake timer API:

```typescript
vi.useFakeTimers();
try {
  // ... trigger the form submission ...
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  expect(mockSetActive).toHaveBeenCalledWith({ session: "test-session" });
} finally {
  vi.useRealTimers();
}
```

`vi.useFakeTimers()` + `vi.runAllTimersAsync()` inside `act()` flushes both the `setTimeout` callback and its internal `await setActive(...)` call before the assertion runs. See `memory/feedback_testing_timers.md` for the canonical pattern.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 71 passing, 0 failing (test count unchanged — existing test updated, no new tests added)
- Breaking Changes: None

---

### March 16, 2026 - Code Review Fixes (OAK-63–OAK-68)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: Six targeted fixes identified during a post-OAK-50 code review. OAK-63 adds a `label` prop to `M3Spinner`. OAK-64 moves component keyframes into `globals.css` to eliminate inline `<style>` tags. OAK-65 adds the `/admin` redirect so authenticated users are sent to `/edit` when they click the Admin nav link. OAK-66 completes the M3 duration token scale in Tailwind. OAK-67 delivers an M3-styled 404 page and wires the catch-all route. OAK-68 fixes a React key anti-pattern in the mobile navbar.

#### OAK-63 — M3Spinner `label` prop

**Modified `src/components/m3/spinner.tsx`**:

- Added optional `label?: string` prop to `M3Spinner`.
- When `label` is provided, the SVG is wrapped in a flex column `<div>` with a `<p>` element below it rendering the label text.
- When `label` is absent, the component renders the SVG alone (unchanged behavior).

**Updated consumers**:

- `src/pages/categories.tsx` — now uses `<M3Spinner label="Loading categories..." />`.
- `src/pages/edit.tsx` — both spinner instances now use `<M3Spinner label="Loading" />`.

**Modified `src/test/components/m3/spinner.test.tsx`**: Added 1 test — "renders label text when label prop is provided". Test count is now **62** (was 61).

#### OAK-64 — Keyframes moved to globals.css

**Modified `src/styles/globals.css`**:

- `@keyframes m3-spinner-rotate`, `@keyframes m3-spinner-arc`, `@keyframes m3-linear-1`, `@keyframes m3-linear-2`, and their associated class rules are now defined here, not inside component files.

**Modified `src/components/m3/spinner.tsx`** and **`src/components/m3/linear-progress.tsx`**:

- Removed the inline `<style>` JSX tags from both files. Animation styles are now sourced from `globals.css`.

**Why this matters**: Inline `<style>` tags inside component JSX create one style block per mounted component instance. Moving keyframes to `globals.css` ensures they are declared exactly once, avoids specificity surprises, and keeps component files free of style strings.

#### OAK-65 — `/admin` redirect

**Modified `src/App.tsx`**:

- Added `<Route path="/admin" element={<Navigate to="/edit" replace />} />` so authenticated users who click the "Admin" nav link (which points to `/admin`) are immediately redirected to `/edit`.
- The `Navigate` component is imported from `react-router-dom`.

#### OAK-66 — Complete M3 duration token scale

**Modified `tailwind.config.js`**:

- `transitionDuration` in `theme.extend` now has the full M3 duration scale: `short1`–`short4`, `medium1`–`medium4`, `long1`–`long4`, `extra-long1`–`extra-long4`.
- The `emphasized` easing entry has a comment explaining it is a CSS approximation of M3's compound easing curve (which cannot be expressed as a single cubic-bezier).

#### OAK-67 — M3 expressive 404 page

**New file: `src/pages/not-found.tsx`**:

- Named export: `NotFoundPage`
- Framer Motion entrance animation: fade + translate-up with `emphasized-decelerate` easing.
- Large "404" numeral styled with `var(--md-sys-color-primary)`.
- "Page not found" heading, body copy, and a HeroUI `<Button>` that navigates to `/` via `useNavigate`.

**Modified `src/App.tsx`**:

- Added `<Route path="*" element={<NotFoundPage />} />` as the last route (catch-all). This handles all undefined paths, including `/sign-in` pending OAK-53.
- Removed the note about `/sign-in` hitting the 404 page — it now hits `NotFoundPage` intentionally via this catch-all.

#### OAK-68 — Mobile nav key fix

**Modified `src/components/navbar.tsx`**:

- Mobile menu items now use `key={item.href}` instead of `key={\`${item}-${index}\`}`. Using a stable, unique value (`href`) as the key is correct React practice. The previous pattern stringified the object reference and appended an index, producing unstable keys.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 62 passing, 0 failing
- Breaking Changes: None — `/admin` now redirects to `/edit` (previously hit the old 404); all other routes unchanged

---

### March 16, 2026 - M3 Design Tokens, Primitive Components, and Navbar Auth-Gating (OAK-48, OAK-49, OAK-50, v3.0.0)

**Released as v3.0.0** — `src/data/changelog.json` updated; `2.0.10` entry marked `isCurrent: false`.

**Motivation**: Three coordinated changes that begin the Material Design 3 (M3) migration. OAK-48 lays the token foundation (color, motion, elevation) in CSS and Tailwind. OAK-49 introduces the first M3 primitive components and replaces `@heroui/spinner` usage across the app. OAK-50 restructures the navbar to hide admin links behind Clerk auth and replaces the `SignInButton` modal pattern with direct navigation.

#### OAK-48 — M3 color tokens, elevation system, and motion tokens

**Modified `src/styles/globals.css`**:

- Added M3 CSS custom properties (`--md-sys-color-*`) under `:root` (light theme) and `.dark` (dark theme). These token names follow the Material Design 3 spec exactly and are consumed by M3 components via `var(--md-sys-color-*)`.

**Modified `tailwind.config.js`**:

- Added `transitionTimingFunction` to `theme.extend` with M3 easing curve tokens (e.g., `emphasized`, `emphasized-decelerate`, `emphasized-accelerate`, `standard`, `standard-decelerate`, `standard-accelerate`).
- Added `transitionDuration` to `theme.extend` with the complete M3 duration scale: `short1`–`short4`, `medium1`–`medium4`, `long1`–`long4`, `extra-long1`–`extra-long4` (completed in OAK-66).
- Added `boxShadow` to `theme.extend` with M3 elevation tokens (`elevation-1` through `elevation-5`).
- `theme.extend` now has 5 keys: `borderRadius`, `colors`, `transitionTimingFunction`, `transitionDuration`, `boxShadow`.

**Why this matters**: M3 tokens must be defined in one place (CSS custom properties) and surfaced via Tailwind utilities. Components reference the tokens, not hardcoded values, so theme changes propagate automatically.

#### OAK-49 — M3 primitive components

**New file: `src/components/m3/spinner.tsx`**:

- Named export: `M3Spinner`
- SVG-based spinner. Keyframes (`m3-spinner-rotate`, `m3-spinner-arc`) are defined in `src/styles/globals.css` (moved from inline `<style>` in OAK-64).
- Props: `size` (`"sm"` | `"md"` | `"lg"`, defaults to `"md"`), `className` (string, optional), `label` (string, optional). When `label` is provided, the SVG is wrapped in a flex column `<div>` with a `<p>` below it. Color defaults to `var(--md-sys-color-primary)` via the SVG `stroke` attribute.
- No runtime dependency on `@heroui/spinner`.

**New file: `src/components/m3/linear-progress.tsx`**:

- Named export: `LinearProgress`
- Props: `visible: boolean` controls opacity (never unmounts — avoids layout shift). Uses a CSS opacity transition so the indicator fades in/out rather than appearing/disappearing abruptly.
- Keyframes (`m3-linear-1`, `m3-linear-2`) and their class rules are defined in `src/styles/globals.css` (moved from inline `<style>` in OAK-64). The component file no longer contains a `<style>` tag.

**New file: `src/components/m3/bottom-sheet.tsx`**:

- Named export: `BottomSheet`
- Framer Motion drag-to-dismiss: dragging down by 100px or more dismisses the sheet. Uses `dragConstraints`, `dragElastic`, and `onDragEnd` to implement the threshold.

**Modified `src/App.tsx`, `src/pages/edit.tsx`, `src/pages/editcard.tsx`, `src/pages/categories.tsx`**:

- Replaced `@heroui/spinner` `<Spinner>` import and usage with `<M3Spinner>` from `src/components/m3/spinner.tsx` in all four files.
- Do NOT re-introduce `@heroui/spinner` imports in these files.

**New file: `src/test/components/m3/spinner.test.tsx`** — 5 unit tests for `M3Spinner` (renders without crashing, applies size classes, accepts className override, renders SVG element, renders label text when label prop is provided). The 5th test was added in OAK-63.

**Test count**: 62 total (52 original + 5 M3Spinner + 5 Navbar from OAK-50).

#### OAK-50 — Navbar auth-gating

**Modified `src/config/site.ts`**:

- Removed `Edit Cards` and `Categories` from both `siteConfig.navItems` and `siteConfig.navMenuItems`. These links are now rendered conditionally in the navbar component, not statically in the site config.

**Modified `src/components/navbar.tsx`** (desktop + mobile nav):

- Added an auth-gated `Admin` link using Clerk's `<SignedIn>` wrapper — the link is only rendered when a user is authenticated. Points to `/admin`.
- Replaced the `<SignInButton>` modal pattern with `navigate("/sign-in")` via `useNavigate`. `SignInButton` is no longer imported from `@clerk/clerk-react` in this file.

**New file: `src/test/components/navbar.test.tsx`** — 5 unit tests for navbar auth-gating behavior.

**Important**: The `/sign-in` route does not exist yet. It is planned for OAK-53. Until OAK-53 ships, navigating to `/sign-in` will hit `NotFoundPage` via the catch-all route added in OAK-67.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 62 passing, 0 failing (62nd test added in OAK-63)
- Breaking Changes: None for authenticated users; unauthenticated users will no longer see `Edit Cards` or `Categories` nav links (they were inaccessible behind Clerk auth anyway)

---

### March 15, 2026 - First Automated Test Suite (OAK-16, OAK-17, OAK-18)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: The project had no automated test coverage. All verification was manual. OAK-16 installs and configures Vitest + React Testing Library. OAK-17 adds 28 unit tests for the pack generation hook. OAK-18 adds 23 unit tests for the categories utility. The pre-commit hook is extended to run the full test suite before every commit.

#### OAK-16 — Vitest + React Testing Library setup

**New devDependencies** (added to `package.json`):

- `vitest` — test runner
- `@vitest/coverage-v8` — code coverage via V8
- `jsdom` — browser environment simulation for React component tests
- `@testing-library/react` — `renderHook` and `act()` for hook testing
- `@testing-library/user-event` — user interaction simulation
- `@testing-library/jest-dom` — custom DOM matchers (e.g., `toBeInTheDocument`)
- `@testing-library/dom` — underlying DOM testing utilities

**New file: `vitest.config.ts`** (project root):

- Separate from `vite.config.ts` intentionally — `VitePluginRadar` (Google Analytics) must not run in the test environment.
- Includes `react()` and `tsconfigPaths()` plugins.
- `globals: true` — `describe`, `it`, `expect`, `vi` are available in every test file without per-file imports.
- `environment: "jsdom"` — simulates a browser DOM.
- `setupFiles: ["src/test/setup.ts"]` — runs before each test suite.
- Coverage provider: `v8`; covers `src/hooks/**` and `src/utils/**`, excludes `src/test/**`.

**New file: `src/test/setup.ts`** — imports `@testing-library/jest-dom` to register its matchers globally.

**New file: `src/test/smoke.test.tsx`** — 1 smoke test verifying React + jsdom + jest-dom render correctly together.

**Modified `tsconfig.json`**: Added `"types": ["vitest/globals"]` to `compilerOptions` so TypeScript recognizes `describe`/`it`/`expect`/`vi` as globals without per-file type imports.

**Modified `package.json` scripts**:

- `"test": "vitest"` — watch mode for development
- `"test:run": "vitest run"` — single-pass run for CI and pre-commit

**Modified `.husky/pre-commit`**: Added `npm run test:run` as a second step after `npx lint-staged`. Both must pass for a commit to proceed.

#### OAK-17 — Unit tests for `use-booster-pack-generation.ts`

**New file: `src/test/hooks/use-booster-pack-generation.test.ts`** — 28 tests.

**Coverage areas**:

- Pack structure: 10 cards total per pack, 2 cards from each base collection, 1 wildcard, 1 spoonbill
- No-duplicate invariant: no card appears twice within a single pack
- Wildcard selection: drawn from an eligible (non-base, non-spoonbill) collection; skipped with `console.warn` + `exception()` when no eligible categories exist; `exception()` called on slot failures
- Edge cases: empty collections, undersized collections
- Multi-pack generation: correct count and structure across N packs
- Pack history: starts empty, archives previous packs, capped at `PACK_HISTORY_LIMIT`, unique IDs per run, timestamps present
- State updates: `boosterPacks` and `lastGenTime` reflect each `generatePacks` call
- Analytics: `event()` and `timing()` call counts per generation run

**Mocking pattern**: `vi.mock("@/lib/gtag", ...)` stubs all analytics functions. `renderHook` + `act()` from `@testing-library/react` drive hook state transitions.

#### OAK-18 — Unit tests for `utils/categories.ts`

**New file: `src/test/utils/categories.test.ts`** — 23 tests.

**Coverage areas**:

- `getCategories()`: Firestore data mapping, `name`/`displayName` field fallbacks, deduplication, `isWildcardEligible` defaulting to `false`
- Cache behavior: second call returns cached result without hitting Firestore; `clearCategoriesCache()` forces a fresh fetch
- Empty-Firestore fallback: `setDoc` called 9 times (one per default category); returned categories match defaults
- Error handling: `getDocs` throws → returns defaults without re-throwing
- `getDefaultCategories()`: returns 9 categories, expected IDs, all `isWildcardEligible: false`, pure function (no side effects)
- `categoriesToLegacyFormat()`: correctly maps `Category[]` to `Collection[]`
- `clearCategoriesCache()`: confirmed to force a fresh Firestore call on next `getCategories()` invocation

**Mocking pattern**: `vi.mock("firebase/firestore", ...)` and `vi.mock("@/lib/firebase", () => ({ db: {} }))` prevent `initializeApp` from running during test import. Always include the firebase mock when importing any module that transitively touches `@/lib/firebase`.

**Total: 52 tests across all three files, all passing.**

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Tests: 52 passing, 0 failing
- Breaking Changes: None — test infrastructure does not affect production bundle or runtime behavior

---

### March 15, 2026 - Firebase Data Connect Scaffold Removal + Pre-commit Hook (OAK-19, OAK-20)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: OAK-19 removes two never-developed Firebase Data Connect scaffold directories that were entirely commented-out boilerplate referencing a Cloud SQL instance that does not exist for this application. OAK-20 adds an automated pre-commit quality gate so ESLint and TypeScript errors are caught locally before code reaches CI.

#### OAK-19 — Remove Firebase Data Connect scaffold directories

**Deleted**:

- `dataconnect/` — Firebase Data Connect directory created by the Firebase CLI during initial project setup. All GQL schema and mutation files inside were entirely commented out. No files in `src/` imported anything from it.
- `dataconnect-generated/` — Auto-generated TypeScript SDK for the above connector. Never imported anywhere in `src/`.

**Modified `package.json`**:

- Removed `"@firebasegen/default-connector": "file:dataconnect-generated/js/default-connector"` from `dependencies`. This was the only reference to the generated SDK.
- `package-lock.json` was regenerated to reflect the removal.

**Why**: The Data Connect scaffold referenced a PostgreSQL Cloud SQL instance that does not exist for this application. Retaining the directories created the impression that Firebase Data Connect was an active data source, when the actual data layer is plain Firestore. Zero `src/` files were touched.

#### OAK-20 — Add Husky v9 + lint-staged pre-commit hook

**New devDependencies** (added to `package.json`):

- `husky ^9.x`
- `lint-staged ^16.x`

**Modified `package.json`**:

- Added `"prepare": "husky"` to the `scripts` block. This script runs automatically on `npm install` in a fresh checkout, ensuring the hook is wired without a separate manual step.
- Added `"lint-staged"` config block:
  ```json
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint -c .eslintrc.json --fix",
      "bash -c 'tsc --noEmit'"
    ]
  }
  ```

**New file**: `.husky/pre-commit` — contains only `npx lint-staged`. No shebang line (Husky v9 does not require one). File is executable.

**Husky v9 wiring**: Husky v9 uses `git config core.hooksPath .husky/_` instead of symlinking into `.git/hooks/`. The `.husky/_/` directory is created by `npm run prepare` (or `npm install`) and must not be manually edited.

**Why `bash -c 'tsc --noEmit'`**: lint-staged appends staged file paths as arguments to each command it runs. Wrapping the `tsc` invocation in `bash -c '...'` prevents lint-staged from injecting file paths into the `tsc` call. Without the wrapper, `tsc path/to/file.ts` would run a per-file type-check without `tsconfig.json`, producing misleading errors. The wrapper ensures `tsc --noEmit` always runs as a full-project type-check driven by `tsconfig.json`.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Breaking Changes: None — no `src/` files were modified

---

### March 15, 2026 - Magic Number Extraction + Three-Tier Logging Strategy (OAK-14, OAK-15)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: Two related hardening passes on the generation pipeline. OAK-14 completes the constant extraction work begun in OAK-40 by moving the remaining magic numbers and hardcoded collection ID strings out of `use-booster-pack-generation.ts` and `index.tsx` into a new dedicated constants file. OAK-15 formalizes an explicit three-tier logging strategy for generation failures so that recoverable slot warnings stay out of analytics while true pack-level failures surface in Google Analytics via `exception()`.

#### OAK-14 — Extract magic numbers and collection ID strings in generation pipeline

**New file created**: `src/constants/generation.ts`

- `MIN_WILDCARD_ATTEMPTS = 10` — minimum draw attempts before the wildcard slot gives up
- `RETRY_MULTIPLIER = 2` — multiplier applied to scale retry attempts relative to pool size
- `PACK_HISTORY_LIMIT = 10` — maximum number of generation runs retained in pack history
- `MAX_PACKS_PER_EXPORT = 1000` — upper bound on packs per export, enforced as the `max` attribute on the packs input

No default export. All four are named exports, matching the pattern in `src/constants/collections.ts`.

**Modified `src/hooks/use-booster-pack-generation.ts`**:

- Replaced the two module-level `const` declarations (`MIN_WILDCARD_ATTEMPTS`, `RETRY_MULTIPLIER`) with imports from `@/constants/generation`
- Added `COLLECTION_IDS` to the `@/constants/collections` import
- Added `PACK_HISTORY_LIMIT` import from `@/constants/generation`
- Replaced hardcoded `"spoonbill"` with `COLLECTION_IDS.SPOONBILL`
- Replaced `.slice(0, 10)` with `.slice(0, PACK_HISTORY_LIMIT)`

**Modified `src/pages/index.tsx`**:

- Added `COLLECTION_IDS` to the collections import
- Added new `@/constants/generation` import for `MAX_PACKS_PER_EXPORT` and `PACK_HISTORY_LIMIT`
- Replaced hardcoded `"spoonbill"` in the `categoryIds` set with `COLLECTION_IDS.SPOONBILL`
- Removed the redundant `if (id === "spoonbill") return "Spoonbill";` special-case from `getCollectionName` — already covered by the `COLLECTION_DISPLAY_NAMES` map
- Updated Pack History heading to use `PACK_HISTORY_LIMIT`
- Updated `max` attribute on packs input to `MAX_PACKS_PER_EXPORT.toString()`

**Why this matters**: After OAK-40 extracted `MIN_WILDCARD_ATTEMPTS` and `RETRY_MULTIPLIER` into module-level constants, those constants were still defined inline in the hook file rather than in the shared constants layer. Centralizing them in `src/constants/generation.ts` gives every consumer a single import path and makes tuning values discoverable without reading hook internals. The `"spoonbill"` string literals were the last remaining hardcoded collection ID references — now eliminated in alignment with OAK-46.

#### OAK-15 — Three-tier logging strategy in `generateBoosterPack`

**Modified `src/hooks/use-booster-pack-generation.ts`**:

- Added a JSDoc comment block before `generateBoosterPack` documenting the three-tier logging strategy:
  - **Tier 1** — slot-draw-level warnings: `console.warn` only. These are too granular and too recoverable to report to GA (e.g., a single draw attempt failing before a successful retry).
  - **Tier 2** — pack-level slot failures: `console.warn` + `exception({ fatal: false })`. The pack completes but a slot was left unfilled or filled via fallback. Surfaced in GA so patterns are detectable over time.
  - **Tier 3** — unexpected errors in `generatePacks` try/catch: `console.error` + `exception({ fatal: false })`. Indicates a programming error or unhandled edge case.
- Added `exception({ fatal: false })` calls to the two Tier-2 warning sites that previously had only `console.warn`:
  1. Wildcard slot unfilled after `maxAttempts` attempts
  2. No wildcard-eligible categories found (wildcard slot skipped entirely)
- The spoonbill slot failure site also received an `exception()` call under the same Tier-2 classification.

**Why this matters**: Before OAK-15, all generation warnings went only to `console.warn`, making pack-level failures invisible in production analytics. The three-tier model is now explicit in code comments so future contributors understand exactly which failure severity warrants GA reporting versus local logging only.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Breaking Changes: None — pack structure, Excel output, and all UI behavior are identical

---

### March 15, 2026 - Error Boundary + Admin Page Lazy Loading (OAK-12, OAK-13)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry.

**Motivation**: The application had no error boundary, meaning any uncaught render error or lazy-load failure would produce a blank white screen with no recovery path. Separately, the three admin pages (`edit.tsx`, `editcard.tsx`, `categories.tsx`) were statically imported in `App.tsx`, adding their full weight to the main bundle even for users who never visit the admin routes.

#### OAK-12 — Created `src/components/error-boundary.tsx`

**What was created**: A reusable React Error Boundary class component (`ErrorBoundary`) that catches uncaught JavaScript errors during rendering and displays a recovery UI instead of a blank screen.

**Implementation details**:

- `ErrorBoundary` is a class component — React requires class components for error boundaries; functional components cannot implement `getDerivedStateFromError` or `componentDidCatch`.
- `getDerivedStateFromError` sets `{ hasError: true, error }` on the class state, triggering a re-render to the fallback UI.
- `componentDidCatch` logs the error and `componentStack` to `console.error` with an `[ErrorBoundary]` prefix for easy filtering.
- `handleReset` is defined as an arrow function class field rather than a bound method, avoiding the `this` binding footgun.
- `ErrorFallback` (private functional component, not exported) renders: `AlertTriangle` icon (HeroUI warning color), "Something went wrong" heading, error message in `<code>`, and a "Reload page" `<Button>` that calls `onReset()` then `window.location.reload()`.
- Only `ErrorBoundary` is exported (named export). `ErrorFallback` is file-private.

**Why this matters**: Without an error boundary, a single render error in any route — including a failed lazy `import()` — crashes the entire React tree and leaves the user with a blank page and no recovery option. The boundary catches the error, shows a useful message, and gives the user a reload path.

#### OAK-13 — Converted admin page imports to `React.lazy()` in `App.tsx`

**What changed in `src/App.tsx`**:

- Converted `EditPage`, `EditCardPage`, and `CategoriesPage` from static imports to `React.lazy()` calls.
- Added `Suspense` with a full-screen centered `Spinner` fallback (extracted as `SuspenseFallback` constant above the component to avoid recreating the JSX on every render).
- Wrapped `<Routes>` in `<ErrorBoundary>` (outer) then `<Suspense>` (inner). `<Toaster />` remains outside both wrappers so toast notifications are never blocked by boundary or suspension state.

**Bundle impact**: Main chunk reduced from ~1,414 kB to ~1,289 kB. The three admin pages now load in separate chunks fetched only when a user first navigates to an admin route.

**Nesting order matters**: `ErrorBoundary` must be the outer wrapper, `Suspense` must be inner. A `Suspense` that has not yet resolved its lazy import throws a Promise; if the `ErrorBoundary` were inside `Suspense`, it could not catch lazy-load failures.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Breaking Changes: None — all routes behave identically; admin pages load on first navigation

---

### March 15, 2026 - Code Quality: Firestore Type Boundary, Sort Stability, and Constant Consistency (OAK-41–OAK-47)

**Pre-release quality fixes on the `development` branch** — no version bump, no changelog entry. These are code smell corrections identified before the next release.

**Motivation**: A post-v2.0.10 review identified seven code smells: a missing `collection` field at the Firestore data boundary, a silent no-op on cleared/zero pack count input, a sort comparator with a falsy-zero bug, a redundant O(N) lookup inside a load loop, collection being written as a document field rather than used only as a path, one remaining hardcoded collection ID string, and a stale reference to that same string in the OAK-39 CLAUDE.md entry.

#### OAK-41 (CS-01) — Set `collection` field before spread at the Firestore boundary

**Problem**: `src/pages/index.tsx` constructed card objects as `{ id: doc.id, ...doc.data() }` before adding `as Card`. If a Firestore document happened to store a `collection` field, the spread would set it to whatever the document contained. If no `collection` field existed in the document, the object would have `collection: undefined` — an invisible type violation since TypeScript would accept the `as Card` cast regardless.

**Fix**: Changed the map call to `{ id: doc.id, collection: col, ...doc.data() }`. Placing `collection: col` before the spread ensures the authoritative value (the Firestore collection path used to fetch the document) is always present and cannot be overwritten by document content.

**Why this matters**: `collection` is used downstream by the generation hook and the export hook to determine pack slot assignment and Excel column placement. An undefined or stale `collection` value would silently corrupt pack structure.

#### OAK-42 (CS-02) — Guard against zero/empty pack count in `handleGenerateAndExport`

**Problem**: `handleGenerateAndExport` in `src/pages/index.tsx` had no guard on the `numPacks` value. If the user cleared the input field (leaving `numPacks` as `NaN` or `0`), the function would call `generatePacks(0)` and `exportToExcel([])` — a silent no-op that produced an empty file with no user feedback.

**Fix**: Added `if (!numPacks || numPacks < 1) return;` at the top of `handleGenerateAndExport`, immediately after the `isExporting` guard. This short-circuits before any analytics events or async calls are made.

#### OAK-43 (CS-03) — Fix sort comparator falsy-zero bug in `edit.tsx`

**Problem**: The `async sort` comparator in `src/pages/edit.tsx` used `parseInt(first) || first` to normalize values. When a card had number `"0"`, `parseInt("0")` returns `0`, which is falsy — so the expression fell back to the raw string `"0"` instead of the parsed integer `0`. This caused card `#0` to sort as a string rather than a number.

**Fix**: Replaced the falsy-coalescing pattern with an explicit `isNaN` check: `!isNaN(parsedFirst) ? parsedFirst : (first as string)`. Also replaced the ternary `normFirst < normSecond ? -1 : normFirst > normSecond ? 1 : /* missing 0 */` with an explicit three-branch form that returns `0` for equal values, preventing the comparator from returning `undefined` on ties.

#### OAK-44 (CS-04) — Eliminate O(N) `legacyCollections.find(...)` inside load loop

**Problem**: The card load loop in `src/pages/edit.tsx` called `legacyCollections.find(c => c.id === colObj.id)` for every card in every collection to obtain the collection's display name. Since the loop iterates over `colObj` — the collection object itself — the `.find()` was redundant: `colObj.name` holds the display name directly.

**Fix**: Replaced `legacyCollections.find(c => c.id === colObj.id)?.name` with `colObj.name`. This is O(1) rather than O(N) and reads the value from the variable already in scope.

#### OAK-45 (CS-05) — Do not write `collection` as a Firestore document field

**Problem**: `src/pages/editcard.tsx` included `collection: updatedCard.collection` in the data objects passed to `addDoc` (new card path) and `updateDoc`/`batch.set` (edit and move paths). The collection identifier is the Firestore collection path — it is not a field that belongs inside the document. Writing it as a field would cause Firestore documents to contain a redundant `collection` property that could diverge from the actual path over time.

**Fix**: Removed `collection: updatedCard.collection` from all three write payloads. The write payloads now contain only `{ name, number, active }`. The collection path is encoded in the document reference (`doc(db, collectionId, cardId)`), not in the document body.

**Why this matters**: The `collection` field on the `Card` type is a client-side concern — it is populated by the fetch layer from the query path (OAK-41) and used for display and routing. It should never round-trip into Firestore.

#### OAK-46 (CS-06) — Replace hardcoded `"spoonbill"` string in `use-excel-export.ts`

**Problem**: `src/hooks/use-excel-export.ts` used the string literal `"spoonbill"` in one place — the `pack.find()` call for locating the Spoonbill card — while the rest of the file already used `COLLECTION_IDS.SPOONBILL`.

**Fix**: Replaced the hardcoded `"spoonbill"` with `COLLECTION_IDS.SPOONBILL`. All collection ID references in the file now go through the constants object.

#### OAK-47 (CS-07) — Correct `COLLECTION_IDS.spoonbill` → `COLLECTION_IDS.SPOONBILL` in CLAUDE.md

**Problem**: The OAK-39 section of this file referenced `COLLECTION_IDS.spoonbill` (lowercase). The actual key in `src/constants/collections.ts` is `COLLECTION_IDS.SPOONBILL` (uppercase).

**Fix**: Updated the reference in the OAK-39 section above.

**Verification Results**:

- Build: Successful
- Lint: Clean (same pre-existing baseline — no new warnings introduced)
- Breaking Changes: None — all fixes are correctness or clarity improvements with identical runtime behavior for valid inputs

---

### March 15, 2026 - Type Consolidation: Duplicate Interface Removal + any→Card[] Migration (OAK-10, OAK-11, v2.0.10)

**Released as v2.0.10** — `src/data/changelog.json` updated; `2.0.9` entry marked `isCurrent: false`.

**Motivation**: Two admin pages (`edit.tsx` and `editcard.tsx`) each defined a local `Card` interface that duplicated the canonical one in `src/types/index.ts`. Separately, `src/pages/index.tsx` still used `{ [key: string]: any }` for its `cardsData` state even after the hooks it feeds were fully typed in v2.0.9. These two issues were resolved together as a clean-up pass.

#### OAK-10 — Remove duplicate local Card interfaces

**Problem**: `src/pages/edit.tsx` (lines 31–38) and `src/pages/editcard.tsx` (lines 34–41) each defined their own `Card` interface locally. These duplicates were structurally identical to the canonical `Card` in `src/types/index.ts` but did not include `collectionName?`, creating a silent divergence risk as the type evolves.

**Fix**:

- Added `collectionName?: string` to the canonical `Card` interface in `src/types/index.ts`. This optional field is used by the admin pages to display which collection a card belongs to alongside the card data.
- Removed the local `Card` interface from `src/pages/edit.tsx`; added `import type { Card } from "@/types/index"` after the `clsx` import.
- Removed the local `Card` interface from `src/pages/editcard.tsx`; added `import type { Card } from "@/types/index"` after the `lucide-react` import.

**Why this matters**: Having three definitions of `Card` — one canonical, two local — means a field added to the canonical type (like `collectionName?`) is invisible to files using their own local copy. A single authoritative definition in `src/types/index.ts` ensures every consumer sees every field.

#### OAK-11 — Replace remaining `any` types in index.tsx

**Problem**: `src/pages/index.tsx` used `useState<{ [key: string]: any }>({})` for `cardsData` and `const data: { [key: string]: any } = {}` in `fetchData`. These were holdovers from before the hooks were typed; the hooks themselves now accept `Card[][]` (v2.0.9), but the page-level state feeding them remained untyped.

**Fix**:

- Updated import in `src/pages/index.tsx`: `import type { Collection }` → `import type { Card, Collection }`.
- Changed `useState<{ [key: string]: any }>({})` → `useState<{ [key: string]: Card[] }>({})`.
- Changed `const data: { [key: string]: any } = {}` → `const data: { [key: string]: Card[] } = {}`.
- Added `as Card` assertion in the `.map()` call that constructs card objects from Firestore snapshots; removed a redundant inline filter type annotation that was no longer needed.

**Why this matters**: `cardsData` is the data source passed into `useBoosterPackGeneration`. With `{ [key: string]: Card[] }`, TypeScript can now verify the entire data flow from Firestore fetch through pack generation end-to-end. The last meaningful `any` in the primary data path is eliminated.

**Verification Results**:

- Build: Successful
- Lint: Clean
- Breaking Changes: None — pack structure, Excel output, and all UI behavior are identical

---

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

**Fix**: Replaced `pack[8]` with `pack.find(card => !BASE_COLLECTION_IDS.includes(card.collection) && card.collection !== COLLECTION_IDS.SPOONBILL)`. This lookup is semantic: it finds the card that is neither a base-slot card nor the Spoonbill slot, regardless of its position in the array.

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

**Removed dead `./src/hooks/**`Tailwind content path** from`tailwind.config.js`. Hook files contain no Tailwind class strings and never did; this entry was adding unnecessary glob scanning on every build.

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
- ⚠️ No test suite configured at this point (added in OAK-16)

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
  name: string;             // Display name
  number: string;           // Card identifier
  active: boolean;          // Whether card appears in generator
  collectionName?: string;  // Human-readable collection name (populated by admin pages)
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
npm run dev          # Vite-only dev server — no /api/* serverless functions
npm run dev:full     # vercel dev — runs Vite + serverless functions on one port
```

Use `npm run dev` for UI-only work. Use `npm run dev:full` any time you need `/api/*` endpoints (e.g., `/admin/users`). See "Local Full-Stack Development" below for setup steps.

### Local Full-Stack Development (`vercel dev`)

`npm run dev:full` runs `vercel dev`, which serves both the Vite frontend and the Vercel serverless functions (`api/`) on a single port. It requires a one-time env pull and has several important behavioral details:

**Setup — run once per machine (or after Vercel env changes)**:

```bash
vercel env pull .env.local
```

`vercel dev` reads serverless function environment variables from `.env.local`, not from `.env`. If `.env.local` is absent or stale, serverless functions will fail with missing-key errors. Always pull from Vercel before first use.

**Why `.env` may have mismatched Clerk keys**: If `CLERK_SECRET_KEY` in `.env` was set manually (or copied from a different Clerk instance than `VITE_CLERK_PUBLISHABLE_KEY`), the JWT token issued by the frontend will not pass `clerkClient.verifyToken()` in the serverless functions — you will see a KID mismatch error. `vercel env pull` ensures both keys come from the same Clerk instance.

**`vercel.json` rewrite pattern**: The rewrite source is `/((?!api/|@)[^.]*)`. The two key exclusions are:

- `api/` — prevents Vercel from rewriting `/api/*` requests to `/`, so they reach serverless functions.
- `@` — prevents Vite virtual modules (`@react-refresh`, `@vite/client`) from being rewritten to `/` and returning 404s.
- `[^.]*` — matches only extensionless paths (SPA routes); files with extensions (`.tsx`, `.js`, `.css`) are served directly.

**`vite.config.ts` `api-dev-interceptor` plugin**: When running `npm run dev` (Vite-only), this plugin intercepts all `/api/*` requests and returns a `503 Service Unavailable` response with a JSON body explaining that `npm run dev:full` is required. This prevents the cryptic "Unexpected token '<'" JSON parse error that would otherwise appear when a 404 HTML page is returned.

**Dynamic port**: `vite.config.ts` reads `process.env.PORT` so `vercel dev` can assign the Vite dev server a port without conflicting with the Vercel port. Do not hardcode the port in the config.

**Production**:

```bash
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build
```

**Linting**:

```bash
npm run lint         # ESLint with auto-fix
```

**Testing**:

```bash
npm run test         # Vitest in watch mode (development)
npm run test:run     # Vitest run-once (CI / pre-commit)
```

Test files live under `src/test/`:

- `src/test/setup.ts` — global setup (jest-dom matchers)
- `src/test/smoke.test.tsx` — smoke test (1 test)
- `src/test/hooks/use-booster-pack-generation.test.ts` — hook tests (28 tests)
- `src/test/hooks/use-admin-filters.test.ts` — filter hook tests (8 tests)
- `src/test/utils/categories.test.ts` — utility tests (23 tests)
- `src/test/utils/admin-api.test.ts` — admin API client tests (5 tests)
- `src/test/components/m3/spinner.test.tsx` — M3Spinner component tests (5 tests)
- `src/test/components/m3/snackbar.test.tsx` — snackbar tests (4 tests)
- `src/test/components/navbar.test.tsx` — navbar auth-gating tests (5 tests)
- `src/test/components/admin/card-edit-sheet.test.tsx` — card edit sheet tests (5 tests)
- `src/test/components/admin/account-panel.test.tsx` — account panel tests (6 tests; 5 original + 1 added in post-review hardening)
- `src/test/layouts/admin.test.tsx` — admin layout tests (2 tests)
- `src/test/pages/sign-in.test.tsx` — sign-in page tests (9 tests)
- `src/test/pages/admin/card-crud.test.tsx` — card CRUD audit tests (4 tests)
- `src/test/pages/admin/category-crud.test.ts` — category CRUD audit tests (4 tests)
- `src/test/pages/admin/users.test.tsx` — users management page tests (6 tests)
- `src/test/api/users.test.ts` — Vercel handler tests for list + invite (8 tests)

**Deployment**:

- Automatic via Vercel on push to main branch
- Preview deployments for PRs

## Important Notes

### Test Suite

Automated tests were added in OAK-16/OAK-17/OAK-18 (March 15, 2026) and extended through OAK-82 + post-review hardening. **128 tests, all passing.**

- **Runner**: Vitest with jsdom + React Testing Library (`@testing-library/react`)
- **Config**: `vitest.config.ts` at project root — separate from `vite.config.ts` so `VitePluginRadar` (GA) never runs in test env
- **Globals**: `globals: true` in vitest config + `"types": ["vitest/globals"]` in `tsconfig.json` — no per-file imports needed for `describe`/`it`/`expect`/`vi`
- **Pre-commit**: `.husky/pre-commit` runs `npm run test:run` after `npx lint-staged`; both must pass for a commit to proceed
- **Firebase mocking**: Any test file that transitively imports `@/lib/firebase` must use `vi.mock("@/lib/firebase", () => ({ db: {} }))` at the top level to prevent `initializeApp` from running
- **Coverage**: `@vitest/coverage-v8` is installed but no coverage thresholds are enforced yet

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
   - Main chunk is now ~1.3MB (xlsx deferred via OAK-8; admin pages lazy-loaded via OAK-13)
   - ~~Further code splitting possible (lazy load admin features)~~ — Done in OAK-13
   - Optimize Firebase queries

2. **Testing**:
   - ~~Add unit tests for generation logic~~ — Done in OAK-17
   - ~~Add integration tests for Firebase operations~~ — Unit tests with Firebase mocking done in OAK-18
   - Add E2E tests for critical user flows (not yet done)
   - Enforce coverage thresholds via `@vitest/coverage-v8`

3. **Features**:
   - Consider adding pack history/tracking
   - Bulk card import from CSV
   - Advanced filtering in card management

## Contact & Support

- **Developer**: Albert Shih - ashih@oaklandzoo.org
- **Program Lead**: Patrick Wolff - pwolff@oaklandzoo.org
