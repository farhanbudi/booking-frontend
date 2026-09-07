## Why

The frontend currently renders every error and success message as a manually
managed inline `<p>` alert (`bg-red-50` / `bg-green-50`) inside each page.
This is duplicated across login, register, booking, and both admin pages;
each page declares its own `useState<string | null>` for the message and
ships a slightly different copy. The alerts push surrounding content down,
require the user to dismiss them by re-submitting, and make the UI
visually inconsistent. We want a single, app-wide toast notification layer
so feedback is uniform, non-layout-shifting, and self-dismissing.

## What Changes

- Add the `sonner` dependency and mount a single `<Toaster />` once at the
  React tree root so toasts are reachable from any page.
- Replace every inline `<p className="text-danger ... bg-red-50 ...">` error
  block and every inline `<p className="... bg-green-50 ...">` success
  block in `src/pages/**` with calls to `toast.error(...)` /
  `toast.success(...)` from `sonner`.
- Where the existing component kept `error` / `success` state **only** for
  rendering the alert, remove the `useState` declaration and the JSX
  block. Where the state was also used elsewhere (e.g. to compute a
  derived `isBlocked` flag, to gate `submitting`, or to feed the
  rate-limit countdown), keep the `useState` and only delete the JSX
  alert block; switch the mutation calls to `toast.*` instead of the
  setter.
- For the admin resource deactivate action and any other user-visible
  mutation that previously had no feedback at all, add a single
  `toast.success(...)` after the action completes successfully, so the
  admin page also benefits from consistent feedback.
- Wire the toast text in Indonesian, byte-identical to the existing alert
  copy, so user-facing wording does not drift during the migration.

No business logic, validation, or API call order changes. No other toast
library is introduced. HTML5 form validation attributes (`required`,
`minLength`, `min`) remain untouched.

## Capabilities

### New Capabilities
- `user-feedback`: App-wide toast notification layer for error and success
  messages, replacing per-page inline alerts.

### Modified Capabilities
- `booking-creation`: The booking page MUST surface backend errors
  (including 409 overlap and 429 rate-limit) and successful booking
  creation through the toast layer instead of inline alert blocks, while
  preserving the existing rate-limit countdown behaviour that controls
  the submit button.
- `admin-panel`: The admin resources and bookings pages MUST surface
  load/submit/deactivate errors and successes through the toast layer
  instead of inline alert blocks.

## Impact

- New runtime dependency: `sonner` (added to `package.json`,
  `dependencies`).
- New mounted React component: `<Toaster />` inside `src/App.tsx`,
  rendered once at the top level (alongside `<Navbar />`, inside the
  router/auth providers).
- Files migrated in `src/`:
  - `src/pages/LoginPage.tsx`
  - `src/pages/RegisterPage.tsx`
  - `src/pages/BookingPage.tsx`
  - `src/pages/admin/AdminBookingsPage.tsx`
  - `src/pages/admin/AdminResourcesPage.tsx`
- Manual testing touch points: login (wrong password), register (taken
  email), booking create (success, 409 conflict, 429 rate limit), admin
  bookings list (load failure), admin resources create / edit / deactivate
  (success + error).