# Maintenance handoff

Running record for the dependency, security, and maintenance pass. Updated per
batch: verification evidence, compatibility exceptions, and manual platform steps.

## Batch A — validation baseline

- Runtime pinned to Node 26 (`.nvmrc`, `engines`, CI). Node 26 LTS is Vercel's default.
- Root cause of the 28 baseline failures: Node 25+ defines an experimental global
  `localStorage` accessor, so Vitest's jsdom environment did not install jsdom's
  storage. `src/test/setup.ts` restores it; no shell flag is required.
- `vercel.json` now builds through `npm run build`, which typechecks app, API, and tests.
