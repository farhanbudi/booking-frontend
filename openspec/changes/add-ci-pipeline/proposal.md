## Why

The booking frontend has no automated CI. Every check (typecheck, unit tests, production build) is currently only run manually on a developer's machine, so a broken build or a failing regression test can be pushed straight to `main` without any signal. Meanwhile the frontend is deployed by Vercel straight from the GitHub branch, meaning whatever lands on `main` is what ships to production. The project already ships a healthy Vitest suite (`npm run test`) and a `tsc -b && vite build` build step, but nothing enforces them.

Adding a GitHub Actions pipeline that runs typecheck + unit tests + build on every pull request and every push to `main` gives the team a single, machine-checkable gate ("`ci-success`") that can be required by branch protection before merge.

## What Changes

- Add a **GitHub Actions workflow** at `.github/workflows/ci.yml` for this repository (frontend only; the sibling `booking-backend` repo is out of scope for this change).
  - Triggers: `pull_request` and `push` to `main`.
  - `permissions: contents: read`, per-workflow/per-ref `concurrency` group with `cancel-in-progress: true`.
  - A single `frontend` job that runs, in order: **typecheck → test → build** (lint is skipped, see Impact).
  - A final aggregate job `ci-success` with `needs: [frontend]` and `if: always()` that fails if the `frontend` job failed or was cancelled. This is the single check name to require in branch protection.
  - CI installs with `npm ci` from the committed `package-lock.json` and uses **dummy** `VITE_*` env values (no real secrets, no network calls to the backend).
- Add a **`typecheck` npm script** (`tsc --noEmit`) to `package.json`. `test` and `build` already exist and are reused unchanged.
- **Untrack `tsconfig.tsbuildinfo`** (it is a machine-generated artifact) and add it to `.gitignore`. While it stays committed, the `tsc -b` inside `npm run build` can consider a fresh CI checkout up to date and skip type checking, producing a false green.
- **Make the one wall-clock-dependent test deterministic.** The pre-existing suite had a failing test (`src/components/CalendarToolbar.test.tsx`): the component sets `minDate={new Date()}` while the fixture date is fixed, so every day of the fixture month became disabled once the wall clock passed it. The clock is now frozen inside that test — no assertion is skipped or weakened.
- Keep E2E (Playwright) **out of scope**: the `e2e/` suite needs a live backend on `:3001` and is not run in CI. The existing Vitest config already excludes `e2e/**`, so `npm run test` stays E2E-free.
- Document the CI setup and the required manual platform steps (branch protection) in the repo docs.
- **No changes to application runtime behavior, no refactors of business logic, no new dependencies.**

## Capabilities

### New Capabilities

- `ci-pipeline`: The repository's continuous-integration behavior — which checks run on pull requests and pushes to `main`, how the workflow is wired (permissions, concurrency, caching, dependency install, env handling), and the aggregate `ci-success` status check that gates merges.

### Modified Capabilities

- `test-suite`: The existing test-suite spec documents the test runner but says nothing about *where* or *how* the unit/component suite is executed in CI (must be `vitest run`, non-watch, no backend required, no E2E). This change adds that CI-execution requirement to the test-suite capability.

## Impact

- **New files**: `.github/workflows/ci.yml`.
- **Modified files**: `package.json` (add `typecheck` script), `.gitignore` (ignore `tsconfig.tsbuildinfo`), `src/components/CalendarToolbar.test.tsx` (freeze the clock so the test no longer depends on the date it runs), `AGENTS.md` (document CI commands and the `ci-success` gate).
- **Untracked**: `tsconfig.tsbuildinfo` (build artifact, removed from version control).
- **No new dependencies**: the repo already has `typescript`, `vitest`, `jsdom`, `@testing-library/*`, and `vite`.
- **No impact** on the production bundle, runtime behavior, or the Vercel build (`vercel.json` untouched).
- **Lint is intentionally absent**: Phase 0 discovery found no ESLint / Biome / Prettier configuration in this repo. Per the working rules, no new linter is introduced or configured, so the CI pipeline contains no `lint` step. This is recorded as an assumption/gap in the final report rather than silently added.
- **Package manager**: CI uses **npm** (`actions/setup-node@v4` + `npm ci`), because the repo commits `package-lock.json` and `vercel.json` declares `installCommand: "npm install"`. Bun is not used for this package.
- **Deployment**: `vercel.json` exists in this repo, so the frontend is deployed by Vercel's Git integration; no Render or deploy-hook workflow is added, and no deploy platform settings are changed.
