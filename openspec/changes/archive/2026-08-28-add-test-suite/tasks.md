## 1. Test infrastructure setup

- [x] 1.1 Install dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`
- [x] 1.2 Add npm scripts `test` (vitest run) and `test:e2e` (playwright test) to `package.json`
- [x] 1.3 Add `test` block to `vite.config.ts` (`environment: "jsdom"`, `globals: true`, `setupFiles`) and create `src/vitest-setup.ts` importing `@testing-library/jest-dom`
- [x] 1.4 Extend `tsconfig.json` `include` to cover test files and add `e2e` tsconfig for Playwright specs
- [x] 1.5 Create `playwright.config.ts` with `baseURL: http://localhost:5173` and project for Chromium
- [x] 1.6 Run `npm run build` to confirm the app still typechecks/builds after config changes

## 2. Unit tests — API client (`src/api/client.ts`)

- [x] 2.1 Write tests for `request` wrapper: Bearer token attached when `localStorage["token"]` is set, no auth header otherwise
- [x] 2.2 Write tests for non-OK responses: `{ error }` body surfaced as thrown message; invalid JSON body produces fallback Indonesian message with status
- [x] 2.3 Write tests for `authApi.login` storing the token in `localStorage` and `authApi.logout` removing it

## 3. Unit tests — Auth context (`src/context/AuthContext.tsx`)

- [x] 3.1 Mock `authApi` via `vi.mock` and test token restore on mount (`/auth/me` success sets user, loading false)
- [x] 3.2 Test invalid token on mount: `/auth/me` rejection clears `localStorage["token"]`, user stays null
- [x] 3.3 Test `login`, `register` (register→login chain), and `logout` state transitions

## 4. Component tests — route protection and navigation

- [x] 4.1 Write `ProtectedRoute.test.tsx`: loading state, unauthenticated redirect to `/login`, authenticated renders children
- [x] 4.2 Write `Navbar.test.tsx`: logged-out links, logged-in links + name + Keluar button, logout navigates to `/login`

## 5. Component tests — auth pages

- [x] 5.1 Write `LoginPage.test.tsx`: renders form, successful submit navigates to `/`, failed submit shows backend error, submit button disabled while submitting
- [x] 5.2 Write `RegisterPage.test.tsx`: renders fields, successful submit navigates to `/`, failed submit shows error

## 6. Component tests — resources page

- [x] 6.1 Write `ResourcesPage.test.tsx`: loading indicator, fetched resources rendered as links to `/resources/<id>`, empty state, fetch error message

## 7. Component tests — booking page

- [x] 7.1 Write `BookingPage.test.tsx`: resource detail rendered, booked slots rendered with formatted times, empty-slots message, slot loading state
- [x] 7.2 Write booking success test: create succeeds, success message shown, slot list refreshed
- [x] 7.3 Write booking conflict test: backend 409 error message surfaced, no success message (use fake timers or computed dates for `todayISO`)

## 8. Component tests — my bookings page

- [x] 8.1 Write `MyBookingsPage.test.tsx`: loading state, bookings rendered with formatted date-time and status labels, empty state, fetch error
- [x] 8.2 Write cancel flow test: cancel button triggers `bookingApi.cancel`, list refreshed, cancelled booking no longer shows cancel button

## 9. E2E tests — Playwright

- [x] 9.1 Create `e2e/auth.spec.ts`: unauthenticated visit to `/` redirects to `/login`; login with a newly registered user succeeds
- [x] 9.2 Create `e2e/booking.spec.ts`: browse rooms, open a room's booking page, book an available slot, attempt double-booking the same slot and assert the conflict error is displayed
- [x] 9.3 Create `e2e/my-bookings.spec.ts`: created booking appears in Booking Saya; cancel it and verify it disappears

## 10. Docs and verification

- [x] 10.1 Update `AGENTS.md`: document `npm run test` and `npm run test:e2e`, including the prerequisite that the backend and dev server must be running for E2E
- [x] 10.2 Run `npm run test` until all unit/component tests pass
- [x] 10.3 Run `npm run build` to confirm typecheck and build remain green
- [x] 10.4 Run `npm run test:e2e` against a live backend + dev server until all journeys pass
