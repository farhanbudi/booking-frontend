## Why

The booking frontend currently has **zero test coverage**: no test framework, no test script, and no automated verification beyond `npm run build`. The booking flow is business-critical (slot conflicts, auth-guarded routes, double-booking 409s), and regressions can ship silently. A test suite is needed to lock in current behavior and give developers a fast feedback loop.

## What Changes

- Add **Vitest** + **React Testing Library** as the unit/component test stack, with a `npm run test` script and a `vitest.config` wired into the existing Vite setup.
- Add **Playwright** for end-to-end tests against a real running app + backend, with a `npm run test:e2e` script and `playwright.config.ts`.
- Add test cases covering **all pages and components**:
  - `LoginPage` (success, failure, submitting state, redirect)
  - `RegisterPage` (success, validation, failure, redirect)
  - `ResourcesPage` (loading, empty, error, list rendering)
  - `BookingPage` (resource load, slot loading, empty slots, booked slots render, booking success incl. 409 conflict error)
  - `MyBookingsPage` (loading, empty, error, list, cancel flow)
  - `Navbar` (logged-in vs logged-out state, logout)
  - `ProtectedRoute` (loading, unauthenticated redirect, authenticated render)
  - `AuthContext` (login/register/logout, token restore via `/auth/me`, invalid token cleanup)
  - `api/client` (request wrapper: token header injection, non-OK handling with `{ error }` body, error fallback message)
- Add E2E user journeys: unauthenticated access → redirect to login; login → browse rooms → book → see conflict 409 when double-booking → see booking in "Booking Saya" → cancel booking.
- Update `AGENTS.md` command section to document the new `test` and `test:e2e` scripts.
- No changes to application runtime behavior; this is test-only tooling and coverage.

## Capabilities

### New Capabilities
- `test-suite`: Automated test infrastructure (Vitest + React Testing Library component/unit tests and Playwright E2E tests) and the acceptance criteria for each testable unit in the booking frontend.

### Modified Capabilities

None. No existing specs; no application behavior changes.

## Impact

- **New dev dependencies**: `vitest`, `@vitest/coverage-v8` (optional), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`.
- **New files**: `vitest.config.ts` (or inline config in `vite.config.ts`), `vitest-setup.ts`, `playwright.config.ts`, `e2e/` spec files, test files co-located in `src/**`.
- **Modified files**: `package.json` (scripts + devDependencies), `tsconfig.json` (add test types to `include`), `vite.config.ts` (test block, optional), `AGENTS.md` (commands).
- **Backend dependency**: E2E tests require the sibling `booking-backend` running at `http://localhost:3000` and a seeded/registerable test account.
- **No impact** on production bundle or runtime behavior.
