## 1. Branch & preparation

- [x] 1.1 Create branch `ci/e2e-setup` from the current `main` in the frontend repository and verify with `git branch --show-current` that `main` is not the active branch; do not push
- [x] 1.2 Re-read `design.md` → "BACKEND_CONTRACT" and `proposal.md` before editing, and confirm the contract values still match the backend's `main` branch (`GET /health`, `bun run test:server`, `bun.lock` present) with `git -C ../booking-backend show main:src/run-test-server.ts` and `git -C ../booking-backend ls-tree -r --name-only main bun.lock`

## 2. Make the existing E2E suite CI-configurable (no assertion changes)

- [x] 2.1 In `playwright.config.ts`, make the report and result output locations read from environment variables with today's paths as defaults (e.g. `PLAYWRIGHT_HTML_REPORT_DIR` → `playwright-report`, `PLAYWRIGHT_OUTPUT_DIR` → `test-results`) and verify that running `npm run test:e2e` without those variables still writes to `playwright-report/` and `test-results/`
- [x] 2.2 In `playwright.config.ts`, add CI-only execution settings: `workers: 1` and `fullyParallel: false` when `process.env.CI` is set, `retries: 1` in CI (and `0` locally), `forbidOnly: !!process.env.CI`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, and an HTML reporter with `open: "never"`; verify by running `CI=1 npx playwright test --list` that the suite is collected and by inspecting the resolved config
- [x] 2.3 In `e2e/debug.spec.ts`, replace the hardcoded absolute Windows output path with `process.env.E2E_DEBUG_OUTPUT_DIR` falling back to today's value, and verify that `E2E_DEBUG_OUTPUT_DIR=<temp> npx playwright test e2e/debug.spec.ts` writes the screenshot and HTML dump into that directory
- [x] 2.4 Confirm that no assertion, timeout, expected message, `skip` or `only` was added, removed or altered in any file under `e2e/` (review the diff of `e2e/`) and that `git diff --stat` shows only `playwright.config.ts` and `e2e/debug.spec.ts`
- [x] 2.5 Add `playwright-report/` to `.gitignore` (keep `test-results/`) and verify with `git check-ignore -v playwright-report/index.html test-results/.last-run.json` that both paths are ignored

## 3. Add the dedicated E2E workflow

- [x] 3.1 Create `.github/workflows/e2e.yml` with `name: E2E`, triggers `pull_request`, `push` to `main`, `workflow_dispatch`, `permissions: contents: read`, concurrency group `e2e-${{ github.ref }}` with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`, and a single job `e2e` on `ubuntu-latest` with `timeout-minutes: 20`; verify by parsing the file as YAML
- [x] 3.2 Add the `services` block: `postgres:16` with user/password `postgres`, `POSTGRES_DB: booking_e2e_test`, port `5432:5432` and a `pg_isready` health check, plus `redis:7` with port `6379:6379` and a `redis-cli ping` health check; verify the service names, images and health-check commands in the file
- [x] 3.3 Add the job-level `env:` block with exactly the dummy values from `design.md` → "BACKEND_CONTRACT" (`DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, `RUN_MODE=api`, `CORS_ALLOWED_ORIGINS=http://localhost:5173`, `REDIS_URL=redis://127.0.0.1:6379/15`, `MAIL_*`, `STRIPE_*` dummies, `VITE_BASE_URL=http://localhost:5173`, `VITE_API_BASE_URL=http://127.0.0.1:3001`) and verify that no real secret or production URL appears in the file
- [x] 3.4 Add the backend preparation steps: `actions/checkout@v4` for `farhanbudi/booking-backend` (`ref: main`, `path: backend`, no token because the repository is public), `oven-sh/setup-bun@v2` with the contract's Bun version, `actions/setup-node@v4` with the same Node major version and npm cache as the existing `ci.yml`, `bun install --frozen-lockfile` in `backend/`, and a step that writes `backend/.env.test` from the job-level environment variables; verify the file content of the workflow step
- [x] 3.5 Add the backend start step (`bun run test:server` in `backend/`, output redirected to `backend.log`, running in the background) and the readiness step that polls `http://127.0.0.1:3001/health` with `curl --retry`/`--retry-delay`/`--retry-connrefused`, printing `backend.log` and failing the job when the backend does not become ready; verify both steps exist and reference the contract's health URL
- [x] 3.6 Add the dataset step that runs `UPDATE resources SET price_per_hour = 0` against the throwaway `booking_e2e_test` database via a throwaway `postgres:16` container, so the specs never reach Stripe; verify the statement, the database name and that it targets `127.0.0.1`
- [x] 3.7 Add the frontend steps: `npm ci`, `npx playwright install --with-deps chromium`, and the E2E run through the existing `npm run test:e2e` script; verify the script name matches `package.json`
- [x] 3.8 Add the `actions/upload-artifact@v4` step with `if: always()`, uploading the Playwright report, the test-results directory and `backend.log` with `retention-days: 7`; verify the step exists and that `backend.log` is uploaded even when the suite fails
- [x] 3.9 Verify that `.github/workflows/ci.yml` is byte-identical to its previous version and that the new workflow contains no `ci-success` job and is not referenced by the existing workflow; verify with `git diff --name-only` and a search for `ci-success` in the new file

## 4. Verification

- [x] 4.1 Run `npm run typecheck`, `npm run test` and `npm run build` and confirm all three still pass
- [x] 4.2 Parse `.github/workflows/e2e.yml` (e.g. with a YAML parser available in the environment) and confirm it is valid YAML with the expected top-level keys, job name, triggers, permissions and concurrency settings
- [x] 4.3 Cross-check every command used in the workflow against reality: `bun install --frozen-lockfile`, `bun run test:server`, `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e` all exist as scripts/commands, and the health URL matches the backend's `GET /health`
- [x] 4.4 If Docker and a local backend checkout are available: start throwaway `postgres:16` and `redis:7` containers, write a local `.env.test` with the contract's dummy values, boot the backend with `bun run test:server`, apply the `price_per_hour = 0` statement, run `npm run test:e2e`, then tear the containers down; record which specs passed and which failed. If this is not possible, state explicitly which parts were NOT verified — never claim a pass that was not observed
- [x] 4.5 Confirm the known pre-existing failures are only the admin-navigation drift (`e2e/admin-panel.spec.ts` and `e2e/helpers/auth.ts` expecting an `Admin` link while the app renders a dropdown button) and that no other spec fails for a CI-setup reason; list any other failure for the report instead of weakening the spec

## 5. Commit & hand-off

- [ ] 5.1 Commit in small logical commits, e.g. `test: make e2e env-configurable for CI` (playwright config, `e2e/debug.spec.ts`, `.gitignore`) and `ci: add e2e workflow` (`.github/workflows/e2e.yml`); verify with `git log --oneline -5` and confirm nothing was pushed
- [ ] 5.2 Write the final report in Indonesian with the sections: Temuan repo, Pemeriksaan email/Mailpit, Perubahan, Hasil verifikasi, Asumsi & hal yang dilewati, Kontrak backend, and Langkah manual untuk saya (push branch + PR, `BACKEND_REPO_TOKEN` only if the backend repo becomes private, and the note that the `e2e` check stays non-required until the owner makes it required)
