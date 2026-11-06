# Maintenance handoff

Running record for the dependency, security, and maintenance pass. Updated per
batch: verification evidence, compatibility exceptions, and manual platform steps.

## Batch A — validation baseline

- Runtime pinned to Node 26 (`.nvmrc`, `engines`, CI). Node 26 LTS is Vercel's default.
- Root cause of the 28 baseline failures: Node 25+ defines an experimental global
  `localStorage` accessor, so Vitest's jsdom environment did not install jsdom's
  storage. `src/test/setup.ts` restores it; no shell flag is required.
- `vercel.json` now builds through `npm run build`, which typechecks app, API, and tests.

## H0 — guided tour freeze and crash

Reproduced on the unmodified dependencies with `e2e/` (real router and animation,
stubbed Clerk/Firebase, no production access).

- **Freeze:** the only Suspense boundary sat above `AdminLayout`. On a cold route
  the shell suspended and React stopped committing updates to the tour, while its
  portaled, pointer-blocking overlay stayed on screen. Observed: URL already
  `/admin/categories`, popover still "Step 5", and Skip wrote `dismissed` to storage
  with no visible effect until the chunk arrived.
- **Crash:** a rejected route chunk reached the app-wide ErrorBoundary and replaced
  the entire admin UI, which is the expected result of a stale chunk after a deploy.
- **Also found:** the analytics toast sat over the mobile tour's Next button for 6s;
  Motion overwrote the popover's centering transform; `<rect>` attributes logged
  errors on first paint.
- **Fix:** route-local Suspense and error boundaries, one shared target resolver,
  a pending/ready/unavailable lifecycle, and step-follows-route handling.

## Batch B — approval and data boundaries

**Decision.** Clerk `publicMetadata.approved` is the single source of truth: only
the Backend API can write it, and Clerk copies invitation metadata to the user on
acceptance, so invited users need no extra step. `/api/auth/firebase-token` mints
the Firebase session with `approved` and `approvedUntil` claims. This also moves
off Clerk's Firebase integration, which Clerk has deprecated.

**Revocation.** Immediate on the API (approval is read on every request). Firestore
writes stop when the lease ends, at most 15 minutes later. The lease is a claim
rather than token lifetime because custom-token claims survive ID-token refresh.

**Production data does not match the original plan's assumptions** (read-only
inventory, 2026-11-05): 20 category documents for 8 categories, all with
auto-generated IDs, some with conflicting wildcard values; `spoonbill` has no
metadata and one card; 5 cards store `number` as an integer; many cards carry legacy
`category`/`collection` fields. `firestore.rules` therefore must not ship before
`scripts/migrate-categories.mjs`, or public catalog reads will fail.

## Batch C — feedback and abuse protection

- Feedback and invitations validate the request envelope before use, and feedback
  only reports success when Resend accepts the message.
- Limits run in Firestore (`rateLimits`, client access denied by rules) rather than a
  new service: 5/hour per client and 100/day overall for feedback (fails closed, so a
  limiter outage cannot run up Resend usage), 20/hour per user for invitations (fails
  open). Keys are hashed. Client IP comes from Vercel's `x-vercel-forwarded-for`.
- A honeypot and a minimum fill time drop obvious bots with a silent success.

## Batch E — generation and export

- Packs are ten explicit slots (`src/utils/pack-generation.ts`). The UI, history, and
  workbook read slot identity directly, so a third card from a base set no longer
  vanishes from the export and a Spoonbill wildcard is not mistaken for the fixed card.
- Category weighting is unchanged (uniform over eligible categories), but only
  categories with cards left are considered, replacing the retry loop.
- The workbook keeps its columns and filename and gains a final `Warnings` column.
- `download` means the browser download started; it cannot confirm a saved file.

## Batch F — category integrity and loading

- Reading categories never writes, and a failed read rejects instead of returning
  cached defaults. `createCategory` refuses to overwrite.
- Deleting a category runs on the server. It marks the category `deleting`, which
  rules treat as closed to card writes, then counts, then deletes. This closes the
  race a client-side count cannot.
- Cards are parsed in one place with identity taken from the snapshot, which also
  fixes editing the 5 cards whose `number` is stored as an integer.
- Stale card reads are discarded, and each card or category allows one write at a
  time. Failed loads show a persistent, retryable error.

## Batch G — analytics

- Users and sessions now cover all app usage. Period totals come from their own
  query, every day appears in the series, and dates use the GA property's timezone
  (America/Los_Angeles).
- `generate` counts actions, not packs, so the dashboard label is "Generation Runs".
- **GA stream.** Production has been sending to `G-Q4K84LKR3M` through
  vite-plugin-radar, which set `window.gtag` first and so stopped `initGtag` from
  ever running. `.env.local`'s `VITE_GA_ID` is a different ID (`G-ZV5VFQ9H7P`). A
  read-only query confirmed the property behind `GA4_PROPERTY_ID` receives live
  production traffic, so `G-Q4K84LKR3M` is the correct stream and is now the default.
  `VITE_GA_ID` is no longer read and can be removed.
- `initGtag` had never run in production, and it pushed arrays, which gtag.js ignores.
  It now pushes Arguments objects, as the real snippet does.

## Batch D — dependencies

Every upgrade is its own commit where the lockfile allowed it. Current targets and
the exceptions that remain:

| Area                          | Now                         | Exception and revisit trigger                                                                                                                               |
| ----------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite, Vitest, React plugin    | 8, 5, 6                     | None                                                                                                                                                        |
| Clerk                         | `@clerk/react` 6 (Core 3)   | Sign-in uses `@clerk/react/legacy`, the supported path for existing custom flows. Revisit if Clerk retires it.                                              |
| Firebase                      | 13                          | None                                                                                                                                                        |
| Router, React, Motion, Lucide | 7, 19.3, 14, 1              | None                                                                                                                                                        |
| ESLint                        | 9                           | Latest is 10, but eslint-plugin-react and jsx-a11y peer ranges stop at 9. Revisit when they add 10.                                                         |
| TypeScript                    | 6.0.3                       | Latest is 7, but typescript-eslint requires `<6.1.0`. Revisit when it widens.                                                                               |
| Tailwind                      | 4                           | None                                                                                                                                                        |
| HeroUI                        | v2 line, latest             | v3 (`@heroui/react`) is a component rewrite. v2 now works on Tailwind 4, so a rewrite is not justified for this pass. Revisit if v2 stops getting releases. |
| `tailwind.config.js`          | Kept via `@config`          | Needed for the HeroUI plugin.                                                                                                                               |
| SheetJS                       | 0.20.3 from cdn.sheetjs.com | Off npm by design: SheetJS no longer publishes there. Lockfile pins integrity. Check the CDN for new releases.                                              |

Tailwind 4 was checked with 32 before/after screenshots (8 pages, light and dark,
desktop and mobile). It raises the browser floor to Safari 16.4, Chrome 111, and
Firefox 128. Two intended visual changes remain: slightly different orange badges
(OKLCH palette), and the banner icon's translucent chip now renders, which Tailwind
3 dropped because it could not apply opacity to a CSS variable.

`legacy-peer-deps=true` stays: `npm ci` without it has not been proven clean.

## Batch H — UI maintenance

- Bottom sheets and the mobile drawer share `ModalSurface`: focus trap and return,
  Escape, scroll lock, and hidden background, built on React Aria. Sheets cannot be
  dismissed while saving.
- Switches, search, and view toggles have accessible names. Grid and list edit
  buttons have larger hit areas.
- `MotionConfig reducedMotion="user"` covers every Motion surface; the button morph
  and ripple respect it too.
- Preferences survive denied storage (`src/lib/safe-storage.ts`).
- About and Changelog are lazy-loaded. The entry chunk is 155 kB (47 kB gzip); the
  audit measured 1,178 kB in one chunk.
