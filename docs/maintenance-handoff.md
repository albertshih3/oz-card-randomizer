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
