## Context

See `proposal.md` — Why. Facts that shape the approach:

**Frontend repository (this repo).** Playwright 1.62 + Vite 5 + React 18, npm (committed `package-lock.json`), Node 24 in the existing `ci.yml`. The E2E suite already exists in `e2e/` (`admin-panel.spec.ts`, `auth.spec.ts`, `booking.spec.ts`, `my-bookings.spec.ts`, `debug.spec.ts`, plus `helpers.ts` and `helpers/auth.ts`) and is run locally with `npm run test:e2e`. `playwright.config.ts` loads `.env.e2e` through `dotenv`, derives `baseURL` from `VITE_BASE_URL` (default `http://localhost:5173`), starts the app itself through a `webServer` entry (`npx vite --mode e2e`), and defines a single `chromium` project. `vite.config.ts` already excludes `e2e/**` from Vitest, so the unit runner never collects the E2E specs.

**Backend repository (`farhanbudi/booking-backend`, public, default branch `main`).** Bun + ElysiaJS + Drizzle + PostgreSQL. On `main` the backend already exposes everything the E2E runner needs, so the backend needs **no source change**:
- `GET /health` → `200 ok`, unauthenticated, no external calls (`src/server.ts`), server listens on `process.env.PORT ?? 3000`.
- `bun run test:server` → `src/run-test-server.ts`: load `.env.test` → assert the database name matches `/test/i` → reset the test database (create it if missing, `CREATE EXTENSION btree_gist`, drizzle migrate, add the `no_overlapping_bookings` exclusion constraint, truncate) → seed 4 resources + 1 admin account → start the HTTP server. It starts the API only, not the BullMQ worker, so no mail is ever sent.
- `bun.lock` is committed, so `bun install --frozen-lockfile` works.
- `src/queue.ts` opens a BullMQ queue over `IORedis` with `maxRetriesPerRequest: null` at import time, so **Redis must be reachable** — otherwise `queue.add()` inside the booking flow hangs instead of failing fast.
- `src/utils/test-env.ts` **overwrites** `process.env` with the values from `.env.test`; Bun's first-wins rule means the file is authoritative, so every backend variable the server needs must be inside that file.

**Why the E2E flow must not touch Stripe.** `bookings.service.createBooking` calls the real Stripe SDK (`api.stripe.com`) for any resource whose `pricePerHour > 0`. The frontend then redirects to the checkout URL instead of showing the success toast the specs assert. Three of the four seeded resources are paid, and the specs click the *first* resource card, so the paid path is the default. The CI dataset must therefore be free-only, and nothing may reach a live payment, mail, hosting or database endpoint.

## Goals / Non-Goals

**Goals:**
- One command (`npm run test:e2e`) that a developer can run locally and that CI runs identically.
- A green, deterministic, self-contained E2E run on a GitHub runner: local PostgreSQL + Redis containers, the backend booted from its own repository, the app served by Vite, Chromium installed by the workflow.
- Zero live dependencies: no Neon, Render, Vercel, Stripe, SMTP, and no repository secret.
- Failure evidence that a developer can act on without re-running anything locally.

**Non-Goals:**
- Writing, changing or strengthening any E2E assertion. No `skip`, no `only`, no fixed sleeps, no blanket retries.
- Fixing the pre-existing app-vs-spec drift in the admin navigation (see Risks) — that is a separate change.
- Touching the existing `ci.yml` workflow, the `ci-success` aggregate job, the unit test suite, the deployment configuration, or any backend source file.
- Making the E2E check a required status check (the repository owner does that manually once the check is stable).

## Decisions

**D1 — A separate workflow file, not a second job in `ci.yml`.**
The task requires `.github/workflows/e2e.yml` with its own triggers, timeout, concurrency group and service containers; it also keeps the existing unit/build pipeline untouched and short. The E2E job is deliberately **not** added to `ci-success`, so a slow or red E2E run never blocks the existing merge gate until the owner opts in. *Alternative considered:* add an `e2e` job to `ci.yml` and extend the aggregate job — rejected, it would couple E2E runtime to the unit pipeline and change an existing, already-approved workflow.

**D2 — The backend is booted with `bun run test:server`, not with hand-assembled migrate/seed steps.**
`test:server` already performs, in the right order: database creation, `btree_gist`, drizzle migrations, the exclusion constraint, truncate, seed, and server start — and it refuses to run unless the database name identifies a test database. Composing the same thing from `bun run db:migrate` + `bun run db:seed` would need the manual `psql -f manual_0001_exclusion_constraint.sql` step (not tracked by Drizzle), would duplicate the reset logic, and `db:seed` is not idempotent. *Alternative considered:* `bun run src/index.ts` with `RUN_MODE=all` — rejected: it starts the worker, which would require a live SMTP sink and adds nothing to the E2E flows.

**D3 — The backend's environment lives in a `backend/.env.test` file written by the workflow; the values are defined once.**
`loadTestEnvFile()` overwrites `process.env` with the file's values, so a job-level `env:` block alone would be silently ignored by the backend. The workflow therefore materialises `backend/.env.test` in a `heredoc` whose values are the *same* job-level environment variables — the values are declared exactly once in the workflow and reused. Nothing is read from a committed file and no real secret is used.

**D4 — PostgreSQL 16 and Redis 7 as service containers.**
PostgreSQL 16 matches the backend's own CI. Redis is not optional: the queue is created at import time with `maxRetriesPerRequest: null`, so without Redis a booking request would hang instead of failing, and the suite would time out instead of reporting a real error. Both containers get a health check (`pg_isready`, `redis-cli ping`) so the job starts the backend only after the services accept connections. The database is named `booking_e2e_test` so the backend's own guard (`/test/i`) accepts it.

**D5 — No mail service container.**
Classification of the existing E2E suite: **case (e)** — no spec reads email (no Mailpit/MailHog/MailDev API call, no mailbox helper, no `waitForEmail`/`getLastEmail`, no reset-password or verify-email flow anywhere in `e2e/`), and the exercised flows send no mail because the backend runs API-only (`test:server` never starts the BullMQ worker, so `src/jobs/processors.ts` — the only place that sends mail — never runs). The backend's mailer has no "log/console" provider, but that does not matter here because no SMTP connection is ever opened. The workflow still sets dummy `MAIL_PROVIDER=smtp`, `MAIL_HOST`/`MAIL_PORT` pointing at `127.0.0.1:1025` so that nothing could ever resolve to a real mail server.

**D6 — The CI dataset is made free with one SQL statement against the throwaway database.**
After the backend reports healthy, the workflow runs
`docker run --rm --network host -e PGPASSWORD=postgres postgres:16 psql -h 127.0.0.1 -U postgres -d booking_e2e_test -c "UPDATE resources SET price_per_hour = 0"`.
Making *every* seeded resource free (rather than relying on the natural row order) removes the dependency on `GET /resources` having a deterministic `ORDER BY` — the backend does not order by anything. The statement touches only the throwaway CI database. *Alternatives considered:* (a) change the specs to click a specific free card — forbidden, that is a test-logic change; (b) change the backend seed to insert only free resources — rejected, it changes backend source and other suites' expectations; (c) use a Stripe test key — rejected, Stripe is explicitly out of scope and the suite must not call a payment API.

**D7 — Playwright is tuned for CI without weakening anything.**
`workers: 1` and `fullyParallel: false` in CI (all specs share one backend and one database, and the specs derive their slot from the wall clock, so parallel files would interfere); `retries: 1` in CI (at most one, to absorb browser-startup flakiness only); `forbidOnly: !!process.env.CI` (a committed `.only` must fail the run instead of silently shrinking it); `trace: "on-first-retry"` and `screenshot: "only-on-failure"` for evidence; reporters `list` + `html` with `open: "never"` so no browser pops up on the runner. Report and result output locations are read from environment variables with today's paths as defaults.

**D8 — The app under test stays a Vite dev server, exactly as the current config does.**
`playwright.config.ts` already starts `npx vite --mode e2e` as its `webServer`, on port 5173. Keeping it means the suite exercises the same command locally and in CI, and the CORS origin is the well-known `http://localhost:5173` (which is also in the backend's default allow-list). *Alternative considered:* `npm run build` + `vite preview` on 4173 — rejected for now: it doubles the moving parts (a second port that must also be allowed by CORS, and a build step whose baked `VITE_*` values would have to match the job env). The dev server is reliable enough on a runner; if it ever becomes the bottleneck, switching to build+preview is an isolated change.

**D9 — The environment-specific details of the existing specs become overridable, with unchanged defaults.**
`playwright.config.ts` already derives `baseURL` from `VITE_BASE_URL`; the workflow supplies `VITE_BASE_URL=http://localhost:5173` and `VITE_API_BASE_URL=http://127.0.0.1:3001` as job-level environment variables. Because Vite and `dotenv` both let real process variables win over `.env` files, no committed file has to change. The only spec file that hardcodes machine-specific state is `e2e/debug.spec.ts`, which writes a screenshot and an HTML dump to an absolute Windows path; that path becomes `process.env.E2E_DEBUG_OUTPUT_DIR` with today's value as the default, so local behaviour is unchanged and the CI runner writes to a temporary directory. No assertion, timeout or expected message is modified.

**D10 — The clock does not need to be pinned.**
`booking.spec.ts` / `my-bookings.spec.ts` derive a start hour from `Date.now() % 24` and click the matching half-hour slot. `react-datepicker` renders all 48 slots of the day and merely marks the out-of-operating-range ones as disabled, and a disabled slot click is a no-op, so the default 09:00 start time survives; the booking date itself is 30+ days in the future because the specs click "Next" that many times, so the "start time in the past" guard never triggers. The run is therefore hour-independent, and no `libfaketime`-style clock manipulation is needed. The runner's timezone is UTC, which is also what the specs' UTC-based hour computation assumes.

**D11 — The E2E check stays advisory and its failures are reported, not masked.**
The job fails when a spec fails. The known pre-existing failure (admin navigation) is reported in the run's artifacts and in the change's report, and gets its own follow-up change. *Alternative considered:* `continue-on-error: true` on the job — rejected, it would hide genuine regressions, which is exactly what this workflow exists to catch.

**D12 — The backend is checked out from its own repository; no token is needed today.**
`actions/checkout@v4` with `repository: farhanbudi/booking-backend`, `ref: main`, `path: backend`. The repository is public, so no `BACKEND_REPO_TOKEN` is used; the token parameter is documented for the day it becomes private (a fine-grained PAT with read-only Contents access stored as a repository secret).

**D13 — Failure evidence is uploaded unconditionally.**
`actions/upload-artifact@v4` with `if: always()` uploads the Playwright HTML report, the raw test-results directory and `backend.log` (7-day retention), so a failed run can be diagnosed from the workflow run page alone.

### BACKEND_CONTRACT (consumed by the frontend workflow)

```
BACKEND_CONTRACT
bun_version: 1.3.x
postgres_image: postgres:16
db_name_rule: nama database harus mengandung "test" (guard /test/i di assertTestDatabaseUrl); dipakai booking_e2e_test
redis_needed: yes (image redis:7, db index 15, REDIS_URL=redis://127.0.0.1:6379/15)
working_dir: backend
install: bun install --frozen-lockfile
migrate: otomatis oleh `bun run test:server` (create DB + btree_gist + drizzle migrate + exclusion constraint + truncate)
seed: otomatis oleh `bun run test:server` (4 resource + admin@example.com/admin12345)
start: bun run test:server
port: 3001
health_url: http://127.0.0.1:3001/health
mail:
  smtp_env_vars: MAIL_PROVIDER, MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  non_sending_option: none (tidak ada provider log/console; tidak relevan karena worker tidak dijalankan)
  flows_that_send_mail: none di mode API-only (email konfirmasi hanya dikirim oleh worker BullMQ)
env (all dummy):
  NODE_ENV=test
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/booking_e2e_test
  JWT_SECRET=ci-dummy-jwt-secret-bukan-rahasia
  PORT=3001
  RUN_MODE=api
  CORS_ALLOWED_ORIGINS=http://localhost:5173
  REDIS_URL=redis://127.0.0.1:6379/15
  MAIL_PROVIDER=smtp
  MAIL_FROM=no-reply@example.com
  SMTP_HOST=127.0.0.1
  SMTP_PORT=1025
  STRIPE_SECRET_KEY=sk_test_ci_dummy_key
  STRIPE_WEBHOOK_SECRET=whsec_ci_dummy_secret
  PAYMENT_CURRENCY=idr
  ACCESS_TOKEN_TTL_MINUTES=15
  REFRESH_TOKEN_TTL_DAYS=30
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=admin12345
notes: env backend WAJIB ditulis ke backend/.env.test oleh workflow, karena loadTestEnvFile() menimpa process.env dengan isi file; seluruh nilai diambil dari job-level env block yang sama. Backend main sudah menyediakan /health, test:server dan bun.lock — tidak ada perubahan source backend.
```

## Risks / Trade-offs

- **[Risk] The admin navigation drift makes some specs fail for a real, pre-existing reason.** `e2e/admin-panel.spec.ts` and `e2e/helpers/auth.ts` expect an `Admin` **link**, while the shipped navbar renders an `Admin` **dropdown button** (deliberately asserted by the unit test `src/components/Navbar.test.tsx`), and the frontend's own `admin-panel` spec still says "nav link". → *Mitigation:* do not weaken the assertions and do not change the navbar in this change; report the failing specs explicitly and track the alignment (app **or** spec) as a follow-up change. The E2E check is not required, so the existing merge gate is unaffected meanwhile.
- **[Risk] The suite depends on the backend's `main` branch.** If the backend renames `test:server`, moves `/health` or changes the `.env.test` contract, the E2E job breaks. → *Mitigation:* pin the checkout to a ref, keep the health-poll and log-dump steps so the failure is self-explanatory, and revisit the ref in the follow-up change.
- **[Risk] A shared database and the wall-clock-derived slot could make specs interfere.** → *Mitigation:* one worker, no parallel files, at most one retry; the specs already use unique throwaway users and future dates.
- **[Risk] The backend's booking rate limit (10 `POST /bookings` per 60 s per user).** → *Mitigation:* each spec registers its own throwaway user, so the per-user bucket is fresh; the limit is not raised anywhere.
- **[Risk] `e2e/debug.spec.ts` writes files.** → *Mitigation:* the output directory is environment-overridable and points at a runner temp directory in CI.
- **[Trade-off] The dev server is used instead of a production build.** → *Accepted for now: the current Playwright config already does this; the Vercel build path stays untouched, and the switch to build+preview is an isolated, later change.**
- **[Trade-off] The E2E workflow adds ~2 minutes of CI time and a second status check on every pull request.** → *Accepted: it is the price of catching booking-flow regressions automatically, and the check is advisory until the owner makes it required.**

## Migration Plan

1. Implement on a branch `ci/e2e-setup` in the frontend repository: `playwright.config.ts` (CI settings + overridable output paths), `e2e/debug.spec.ts` (overridable output directory), `.gitignore` (`playwright-report/`), and the new `.github/workflows/e2e.yml`. No backend change is needed.
2. Verify locally as far as the environment allows (YAML parse, `npm run typecheck`, `npm run test`, `npm run build`, and — if Docker is available — the full stack: PostgreSQL + Redis containers, backend `test:server`, `npm run test:e2e`). State explicitly what could not be verified.
3. Commit in small logical commits; **do not push**. The user pushes the branch and opens the PR.
4. On the first CI run, download the artifacts and confirm the report lists only the known pre-existing failures.
5. Rollback: delete `.github/workflows/e2e.yml` and revert the `playwright.config.ts` / `e2e/debug.spec.ts` / `.gitignore` commits. Nothing in the application, the deployment pipeline or the backend depends on the E2E workflow.

## Open Questions

- Whether the admin navigation should be aligned by changing the app or by updating the specs — decided in a separate change, not here.
- Whether to move from the Vite dev server to a production build + preview server — can be done later without touching the specs.
- When the E2E check becomes a required status check — a manual decision by the repository owner.
