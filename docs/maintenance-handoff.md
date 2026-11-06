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
