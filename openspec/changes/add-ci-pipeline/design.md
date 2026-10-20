## Context

Current state discovered by read-only inspection of this repository (Phase 0):

- **Repo shape**: single-package repo — the frontend *is* the repository root. `package.json` lives at the root; there is no `backend/` folder here. The Bun/Elysia backend is a **separate sibling repository** (`../booking-backend`), so it cannot be a job in this repo's workflow.
- **Stack**: React 18 + Vite 5 + TypeScript 5.6 + Tailwind v3 + React Router v6.
- **Package manager**: **npm**. `package-lock.json` is committed; `vercel.json` declares `"installCommand": "npm install"`. There is no `bun.lock`/`bun.lockb` in this repo.
- **Existing scripts**: `dev`, `dev:e2e`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `test:e2e` (`playwright test`). **No `lint` script and no ESLint/Biome/Prettier config exists.**
- **Existing test tooling**: Vitest 4 + jsdom + React Testing Library, configured inline in `vite.config.ts` (`environment: "jsdom"`, `globals: true`, `setupFiles: "./src/vitest-setup.ts"`, `exclude: [..., "e2e/**"]`). A large unit/component suite already exists next to the source (`src/**/*.test.ts(x)`).
- **Existing CI**: none — `.github/` does not exist in the repo.
- **Deployment**: `vercel.json` present (`framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, SPA rewrite). The frontend is deployed by **Vercel's Git integration**; the backend is hosted by Render in the sibling repo. No `render.yaml`, `Dockerfile`, or `Procfile` in this repo.
- **Env vars**: `.env.example` declares `VITE_BASE_URL` and `VITE_API_BASE_URL` (both `VITE_`-prefixed, i.e. baked into the client bundle). `src/api/client.ts` reads `import.meta.env.VITE_API_BASE_URL` with a `http://localhost:3000` fallback. No server-side secret is required to build or unit-test the frontend.
- **Hazard found**: `tsconfig.tsbuildinfo` is **tracked in git** (it appears in the history of `tsconfig.tsbuildinfo`) and is *not* in `.gitignore`. `npm run build` runs `tsc -b`, and build mode consults that file: on a fresh CI checkout the committed build info can make `tsc -b` consider the project up to date and skip type checking entirely, producing a false green.

## Goals / Non-Goals

**Goals:**

- One CI workflow in this repo that runs **typecheck → unit test → build** on every pull request and every push to `main`, and that exposes a single required status check named `ci-success`.
- Zero real secrets, zero network calls to a backend, and zero new npm dependencies in the pipeline.
- Reuse the existing `test` and `build` scripts verbatim; add only what is missing (`typecheck`).
- Type checking in CI must actually type check (no stale build-info shortcut).

**Non-Goals:**

- **Backend CI.** The Bun/Elysia backend lives in `../booking-backend`; it needs its own repository/workflow. This change does not touch it.
- **E2E in CI.** The Playwright suite needs a live backend on `:3001` and browser binaries; it stays a local, manual step.
- **Introducing a linter.** No ESLint/Biome config exists, and configuring one is explicitly out of scope. The pipeline has no `lint` step; this is reported as a gap, not silently patched.
- **Changing deployment.** `vercel.json` and any Render/Vercel dashboard settings stay untouched. No deploy hook workflow, no Vercel/Render CLI, no deploy tokens.
- **Refactoring application code.** No changes under `src/` except (if needed) nothing — the typecheck script is a `package.json` change only.

## Decisions

### D1 — CI runs on npm + `actions/setup-node@v4`, not Bun

**Choice:** `actions/checkout@v4` + `actions/setup-node@v4` (Node 22 LTS, `cache: npm`) + `npm ci`.

**Why:** this package is committed with `package-lock.json` and its own deploy target (`vercel.json`) installs with `npm install`. `npm ci` is the lockfile-faithful, reproducible install that matches the artifact the deployment actually builds.

**Alternative considered:** `oven-sh/setup-bun@v2` + `bun install --frozen-lockfile` (as the generic task template suggests). Rejected for this package: there is no `bun.lock` here, so `--frozen-lockfile` would fail; switching to Bun would introduce a second lockfile and drift from the Vercel build. Bun remains the right choice for the *backend* repo.

### D2 — `typecheck` script uses `tsc --noEmit`

**Choice:** add `"typecheck": "tsc --noEmit"` to `package.json`.

**Why:** the root `tsconfig.json` already has `noEmit: true` and `include: ["src"]`. Plain `tsc --noEmit` performs a full, unconditional type check and **never reads or writes `tsconfig.tsbuildinfo`**, so it cannot be short-circuited by a stale committed build-info file.

**Alternative considered:** `tsc -b --noEmit` (build mode). Rejected: build mode is incremental by design and is precisely the mechanism that the committed `tsconfig.tsbuildinfo` would poison.

### D3 — Untrack `tsconfig.tsbuildinfo` and ignore it

**Choice:** `git rm --cached tsconfig.tsbuildinfo` + add it to `.gitignore`.

**Why:** the file is a machine-generated build artifact; it should not be in version control. While it stays tracked, the `tsc -b` inside `npm run build` (and therefore the CI **build** step) may skip type checking on a fresh checkout — the pipeline would report success without having checked anything. Untracking it makes both the `typecheck` step and the `build` step honest.

**Alternative considered:** leave it tracked and only rely on the `typecheck` step. Rejected: the build step would still be able to skip work, and a stale artifact in the tree is a latent trap for local `npm run build` too.

**Trade-off:** this is the only repo-state change beyond the workflow and `package.json`. It is a tooling-artifact fix, not a business-logic change, and it is safe to revert independently.

### D4 — One `frontend` job plus an aggregate `ci-success` job

**Choice:**

```yaml
jobs:
  frontend:            # typecheck → test → build
  ci-success:          # needs: [frontend], if: always()
```

**Why:** this repo is a single package, so there is nothing to parallelize; splitting per-package jobs would add noise without benefit. The aggregate job exists because branch protection requires exactly one status check name, and because a `needs:` job that always runs gives a stable, predictable check name even when the upstream job is cancelled (a cancelled upstream job otherwise leaves the required check in a non-terminal state and blocks the PR forever).

**Alternative considered:** multiple per-package jobs (frontend/backend). Rejected — there is no backend package in this repository.

### D5 — Steps are guarded by "script exists", and the order is fixed

**Choice:** the job runs `npm run typecheck`, `npm run test`, `npm run build` in that order. A step whose script is absent from `package.json` is skipped rather than replaced by an inline command.

**Why:** the pipeline must not invent commands that the repo does not define (today: no `lint`). The fixed order gives the cheapest, most-likely-to-fail check first (typecheck), so a type error is reported before a slow build.

### D6 — Dummy env at job scope, no secrets

**Choice:** set `VITE_BASE_URL` and `VITE_API_BASE_URL` to dummy values in the job's `env:` block, e.g. `http://localhost:5173` and `http://localhost:3000`.

**Why:** `vite.config.ts` calls `loadEnv(mode, cwd, "")` and logs the resolved values; `client.ts` reads `import.meta.env.VITE_API_BASE_URL` with a localhost fallback. Supplying the variables explicitly makes the build deterministic and self-documenting, while the values point at nothing — no network traffic occurs during `vite build` or `vitest run` because every test mocks `fetch`.

**Alternative considered:** reading real values from repository secrets. Rejected — the frontend build needs no secret, and committing/using real URLs would violate the "no secrets in CI" constraint.

### D7 — Node version pinned via `actions/setup-node`, cache enabled

**Choice:** `node-version: 22` and `cache: npm`.

**Why:** the repo has no `engines` field and no `.nvmrc`, so a currently supported LTS line is the safest default; `cache: npm` uses the committed `package-lock.json` as the cache key and speeds up installs without adding a manual cache step.

### D8 — No path filters

**Choice:** the workflow runs on every pull request and every push to `main`, with no `paths:` filter.

**Why:** path filters can cause a required status check to never be reported on a PR that only touches, say, `docs/`, which leaves the PR permanently blocked and the required check permanently "expected". Simplicity wins for a single-package repo.

### D9 — Make the one wall-clock-dependent test deterministic

**Discovered during implementation:** the pre-existing suite had one failing test, `src/components/CalendarToolbar.test.tsx` → "memanggil onNavigate dengan Navigate.DATE dan tanggal baru saat tanggal dipilih". It failed on a clean checkout *before* any CI change, so it was not introduced by this work.

**Root cause:** `CustomToolbar` renders `<DatePicker minDate={new Date()} />` (real clock) while the test fixture pins `date` to `2026-09-02`. Once the wall clock passed that date, every day cell in the rendered September 2026 month got `react-datepicker__day--disabled`, so the selector `.react-datepicker__day:not(--outside):not(--disabled)` matched **zero** elements and the assertion `expect(day15).not.toBeNull()` failed. The test is a wall-clock time bomb, and it would have made the new CI test step red on its very first run.

**Choice:** freeze the clock inside that single test with `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.setSystemTime(new Date("2026-09-01T08:00:00.000Z"))`, restoring real timers in a `finally` block.

**Why:** the test's intent is "clicking an enabled day calls `onNavigate(Navigate.DATE, date)`". Freezing the clock makes the fixture date reachable again and removes the dependence on the day the suite runs — it strengthens determinism without touching a single assertion, without skipping the test, and without changing any application code. The alternative (moving the fixture to a future date) would only postpone the same failure to that future year.

**Alternative considered:** leave the failure and let CI be red. Rejected — a permanently red pipeline gets ignored, which defeats the purpose of the gate. Weakening the test (skip/delete) was explicitly ruled out.

## Risks / Trade-offs

- **[The pipeline is advisory until branch protection is configured]** → Mitigation: the final report lists the exact manual step (Settings → Branches → rule for `main` → require status check `ci-success`).
- **`npm ci` fails if `package.json` and `package-lock.json` drift]** → Mitigation: run `npm ci` locally before pushing; the install step uses `npm ci` (never `npm install`) so drift fails loudly instead of silently rewriting the lockfile.
- **`tsc --noEmit` does not cover `e2e/`** (root `tsconfig.json` has `include: ["src"]`) → Mitigation: accepted; the E2E suite has its own `e2e/tsconfig.json` and is out of CI scope. Recorded as a known gap.
- **[No lint step means style regressions are not caught]** → Mitigation: reported as a gap for the user to address separately (adding ESLint/Biome is explicitly out of scope for this change).
- **[A committed `tsconfig.tsbuildinfo` could make `tsc -b` skip work]** → Mitigation: D3 untracks and ignores it; D2's `typecheck` step never consults build info.
- **[The Vitest suite must stay backend-free]** → Mitigation: the existing suite already mocks `fetch`; the `vite.config.ts` `exclude` keeps `e2e/**` out of the unit run; CI passes no real API URL.
- **[A test that depends on the wall clock will break CI at an arbitrary future date]** → Mitigation: D9 freezes the clock in the one affected test; any future test that reads `new Date()` must do the same (a "time bomb" test would otherwise turn the required check red without any code change).
- **[Vercel builds the same `npm run build` on merge]** → Mitigation: no change to `vercel.json` or the `build` script, so CI and production build identically; `typecheck` is additive and does not alter the bundle.

## Migration Plan

1. Work on a new branch `ci/setup` (never `main`, never force push).
2. Commit 1 — `chore: add typecheck script and untrack build artifact`: add the `typecheck` script to `package.json`, `git rm --cached tsconfig.tsbuildinfo`, add it to `.gitignore`.
3. Commit 2 — `ci: add GitHub Actions workflow for frontend`: add `.github/workflows/ci.yml`.
4. Commit 3 — `docs: document CI pipeline`: update `AGENTS.md` with the CI commands and the `ci-success` gate.
5. Verify locally before pushing: `npm ci`, `npm run typecheck`, `npm run test`, `npm run build`, plus a YAML parse of the workflow.
6. Push `ci/setup` and open a PR (the user performs the push; the assistant does not push unless asked).
7. Rollback: revert the workflow file and the `package.json`/`.gitignore` commits. The only externally visible state is the branch-protection rule, which the user can remove in GitHub settings.

## Open Questions

- **Which platform hosts the backend?** Not determinable from this repository (the backend is a separate repo). It does not affect this change — no Render deploy-hook workflow is created here. If the backend's Render Auto-Deploy is set to "After CI Checks Pass", a matching workflow and a `RENDER_DEPLOY_HOOK` secret must be added **in the backend repository**, not here.
- **Should a linter be introduced later?** Deferred deliberately; it would be a separate change (`add-eslint-config`) once a linter is chosen, because it would also require new npm dependencies and a lint script.
