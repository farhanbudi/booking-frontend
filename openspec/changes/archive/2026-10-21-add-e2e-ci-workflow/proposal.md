## Why

The Playwright end-to-end suite in this repository only ever ran manually, on a developer machine, against a manually started backend. Nothing in the repository proves that the real user journeys (register → browse rooms → book → double-book conflict → cancel, plus the admin panel) still work after a change lands, so regressions in the booking flow can reach `main` unnoticed. We want the existing E2E suite to run automatically on every pull request and push to `main`, against a real PostgreSQL and a real backend process, using throwaway services and dummy credentials only.

## What Changes

- Add a **separate** GitHub Actions workflow file `.github/workflows/e2e.yml` (`name: E2E`, triggers `pull_request`, `push` to `main`, `workflow_dispatch`) with a single job `e2e` on `ubuntu-latest`. The existing `.github/workflows/ci.yml` is **not** modified, and the E2E job is **not** added to the `ci-success` aggregate job.
- The E2E job provides real infrastructure as service containers: `postgres:16` (database `booking_e2e_test`, `pg_isready` healthcheck) and `redis:7` (`redis-cli ping` healthcheck). No mail container: no E2E spec reads email and the backend runs API-only, so nothing ever talks to a real SMTP server.
- The job checks out the **backend repository** (`farhanbudi/booking-backend`, ref `main`, public) into the `backend/` subfolder of the runner, installs it with `bun install --frozen-lockfile`, writes a throwaway `backend/.env.test` with dummy values, and boots it with `bun run test:server` (API only, port `3001`, database name containing `test` so the backend's own test-database guard passes). The job waits for `http://127.0.0.1:3001/health` before touching the browser suite, and dumps `backend.log` when the backend does not become ready.
- The job adjusts the freshly seeded throwaway dataset with a single SQL statement so that every seeded resource is free (`price_per_hour = 0`). This keeps the existing booking specs on the free/confirmed path and guarantees that no request ever reaches Stripe. No reset/seed HTTP endpoint is added to the backend.
- The frontend is installed with `npm ci`, Chromium is installed with `npx playwright install --with-deps chromium`, and the existing suite is executed with the existing `npm run test:e2e` script. The run uses a local Vite dev server (the mode the current Playwright config already uses) on `http://localhost:5173`; that exact origin is what the backend's CORS allow-list is set to.
- Make the Playwright configuration CI-friendly and environment-overridable, without touching any test assertion: single worker and no parallel files in CI, at most one retry in CI, `forbidOnly` in CI, an HTML report that does not auto-open, trace/screenshot captured on failure, and a report/result output path that can be redirected through an environment variable.
- Make the machine-specific output path of the existing `e2e/debug.spec.ts` helper overridable through an environment variable while keeping today's Windows path as the default, so the file does not crash on a Linux runner.
- Add the Playwright report folder to `.gitignore`.
- **Reported, not fixed in this change:** `e2e/admin-panel.spec.ts` and `e2e/helpers/auth.ts` expect an `Admin` **link**, while the shipped navbar renders an `Admin` **dropdown button** (asserted on purpose by the unit test `src/components/Navbar.test.tsx`). These specs therefore fail for a real, pre-existing reason that is unrelated to CI. The E2E check is intentionally **not** a required status check yet; the drift needs its own follow-up change before the check can gate merges.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `ci-pipeline`: the requirement "End-to-end tests are excluded from CI" is replaced by the contract of the new dedicated E2E workflow (separate workflow file, service containers, backend checkout, dummy environment, readiness gate, artifact upload, and the fact that the E2E check is not part of the merge gate).
- `test-suite`: adds the contract for running the existing E2E suite in CI — environment-overridable configuration and output paths, deterministic CI execution settings (single worker, bounded retries, failure traces/screenshots, non-auto-opening report), and the rule that the unit test runner keeps ignoring the `e2e` directory.

## Impact

- **New files:** `.github/workflows/e2e.yml` (frontend repo only).
- **Modified files (frontend):** `playwright.config.ts` (CI-only settings and env-overridable paths), `e2e/debug.spec.ts` (output path made overridable — no assertion changed), `.gitignore` (add `playwright-report/`).
- **Untouched:** `.github/workflows/ci.yml`, every E2E assertion, the unit test suite, the backend source code (no backend change is required: the health endpoint, the migration/seed scripts and `bun run test:server` already exist on the backend's `main` branch), and the deployment configuration.
- **External systems:** none. The workflow talks only to service containers and to the public backend repository over HTTPS; no Neon, Render, Vercel, Stripe or live SMTP endpoint is contacted.
- **Secrets:** none required. The backend repository is public, so no `BACKEND_REPO_TOKEN` is needed. If it ever becomes private, the workflow reads a read-only token from repository secrets.
