## Context

The app is a Vite 5 + React 18 + TypeScript stack (see `vite.config.ts`, `tsconfig.json`) with no test framework today; verification is only `npm run build` (`tsc -b && vite build`). The UI is entirely Indonesian. All data access flows through the single fetch wrapper in `src/api/client.ts` (`authApi`, `resourceApi`, `bookingApi`), which reads the JWT from `localStorage["token"]`. Routing lives in `src/App.tsx`; protected routes are wrapped in `ProtectedRoute`. The E2E layer needs the sibling backend (`../booking-backend`, Bun + ElysiaJS) running at `http://localhost:3000`.

See proposal.md — Why for the motivation.

## Goals / Non-Goals

**Goals:**
- Introduce a fast, jsdom-based unit/component test stack that runs without a backend (Vitest + React Testing Library).
- Add a real-browser E2E suite (Playwright) for the critical auth → browse → book → conflict → cancel journey.
- Cover every page and component in `src/` plus the API client and auth context (per specs/test-suite).
- Keep test scripts simple and discoverable: `npm run test`, `npm run test:e2e`.

**Non-Goals:**
- Writing or fixing application code (tests must pass against current behavior; any app bug found is reported, not fixed here).
- Code coverage thresholds or CI wiring (out of scope; coverage is excluded from this change).
- Testing the backend.
- E2E tests that do not require the real backend (no backend-mocking in Playwright).

## Decisions

**D1 — Vitest over Jest.** Vitest shares Vite's config, transform pipeline, and TS handling with zero extra tooling, and is the ecosystem default for Vite projects. Jest would require a parallel TS/babel pipeline. Decision: add `vitest` + `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Configure `test.environment = "jsdom"`, `setupFiles` pointing at `vitest-setup.ts`, and `globals: true` for RTL cleanup. Tests run with `tsc -b` excluded — Vitest typechecks at runtime via esbuild; keep type safety by running `npm run build` still as the typecheck gate.

**D2 — Mock the API layer with `vi.mock`, not MSW.** The app imports `authApi`/`resourceApi`/`bookingApi` directly from `src/api/client.ts`; there is no DI seam. Mocking those modules with `vi.mock("../api/client")` and asserting behavior through component output is the smallest-change approach and keeps tests backend-free. MSW would additionally test the fetch wrapper's URL/headers — instead, the wrapper itself gets direct unit tests using a stubbed global `fetch` (asserting header injection, token attachment, error extraction). Alternative considered: MSW for all layers — rejected as heavier with no extra value at this app size.

**D3 — Test files co-located with sources.** `src/**/*.test.ts(x)` next to the module under test, matching the flat structure of `src/`. Playwright specs live in a top-level `e2e/` directory (separate TS project, no DOM types). Vitest's default `include` picks up `**/*.test.{ts,tsx}` automatically.

**D4 — Playwright configured for a locally running stack.** `playwright.config.ts` with `webServer` NOT auto-starting the app: the E2E flow depends on a real backend (`booking-backend` on :3000) plus the Vite dev server on :5173, and auto-booting both is environment-specific. Instead `npm run test:e2e` documents prerequisites (backend + `npm run dev` running) and Playwright uses `baseURL: http://localhost:5173`. Alternative considered: auto-start `vite preview` — rejected because the app calls `/auth/me` on load and needs the real backend regardless; auto-boot adds flakiness.

**D5 — E2E test data is created through the UI.** The journey registers a fresh user per run (timestamped email) so tests are idempotent and don't need pre-seeded accounts or direct DB access. Double-booking is reproduced by booking the same slot twice via the UI and asserting the backend's 409 error message is surfaced.

**D6 — Extend `tsconfig.json` include and `AGENTS.md`.** Add `src/**/*.test.ts(x)` types (jest-dom matchers) and the `e2e` TS project reference in tsconfig; update `AGENTS.md` commands with the two new scripts and the "no lint/no test" note is replaced by test instructions. `vite.config.ts` gains the `test` block (kept in the same file since Vitest reads it; no separate `vitest.config.ts`).

## Risks / Trade-offs

- **Playwright needs a live backend** → Document prerequisites in `AGENTS.md` and in the `test:e2e` script help; keep the journey self-sufficient (registers its own user).
- **`vi.mock` coupling** — mocks drift if `client.ts` exports change → The client API surface is small and stable; direct `client.ts` unit tests pin the contract (headers, errors).
- **Time-dependent logic** — `BookingPage` computes `todayISO()` from `new Date()`; tests that assert the "min" date or formatting must freeze time or use computed values → Use `vi.setSystemTime` (fake timers) where needed rather than hard-coded dates.
- **jsdom vs real browser divergence** — RTL tests can't catch layout or real-fetch issues → Covered by Playwright E2E; the two layers intentionally overlap only on the critical journey.
- **New devDependencies bloat** → All are dev-only; production bundle unaffected.

## Migration Plan

1. Add devDependencies and scripts, add `test` block to `vite.config.ts`, `vitest-setup.ts`, extend `tsconfig.json` — no runtime impact, app continues to build.
2. Write unit/component tests + client tests; run `npm run test` until green.
3. Write Playwright config and `e2e/` specs; run against a live backend + dev server until green.
4. Update `AGENTS.md`.
5. Rollback: revert package.json/config changes; tests never ship to production.

## Open Questions

None — decisions cover the unknowns that would affect specs or tasks.
