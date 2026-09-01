## Why

The booking system has no UI surface for administrators to manage resources or audit bookings. Backend endpoints for admin actions (`POST/PATCH/DELETE /resources` and `GET /bookings/admin/all`) already exist and enforce role checks, but they are unreachable from the frontend because no admin pages, routes, or guards exist. Without an admin panel, room management and cross-user booking visibility cannot be performed without direct API calls, which is unsafe and inconvenient.

## What Changes

- Add a new `AdminRoute` component that guards admin-only routes: redirects unauthenticated users to `/login` (via existing `ProtectedRoute`) and redirects authenticated non-admin users to `/`.
- Add two new admin pages:
  - `AdminResourcesPage` at `/admin/resources`: lists resources, supports create/edit/deactivate via the existing admin backend endpoints, with inline form and Indonesian status badges for `isActive`.
  - `AdminBookingsPage` at `/admin/bookings`: read-only list of all bookings across all users via `GET /bookings/admin/all`.
- Extend `src/api/client.ts` `resourceApi` with `create`, `update`, `remove`; extend `bookingApi` with `listAll`.
- Register the two new routes in `App.tsx` behind `AdminRoute`.
- Add a conditional "Admin" link in `Navbar.tsx` visible only when `user?.role === "admin"`, placed between "Booking Saya" and "Keluar".

No breaking changes to existing user flows; admin pages simply become available.

## Capabilities

### New Capabilities

- `admin-panel`: Admin-facing UI for managing resources and viewing all bookings, including route protection by role.

### Modified Capabilities

- (none — existing capabilities do not change at the requirement level)

## Impact

- **Files touched (frontend only):**
  - `src/components/AdminRoute.tsx` (new)
  - `src/components/Navbar.tsx` (add conditional Admin link)
  - `src/pages/admin/AdminResourcesPage.tsx` (new)
  - `src/pages/admin/AdminBookingsPage.tsx` (new)
  - `src/api/client.ts` (extend `resourceApi` and `bookingApi`)
  - `src/App.tsx` (add 2 admin routes)
- **Backend:** unchanged. All required endpoints already exist.
- **Dependencies:** none added. Implementation uses existing `useState`/`useEffect`, design tokens, and shared CSS classes.
- **Conventions:** Indonesian UI copy; design tokens only (no new Tailwind tokens); no external libraries.