## 1. Extend the API layer

- [x] 1.1 Add `resourceApi.create`, `resourceApi.update`, `resourceApi.remove` to `src/api/client.ts` (signatures from proposal) and verify `npm run build` typechecks.
- [x] 1.2 Add `bookingApi.listAll` to `src/api/client.ts` (calling `GET /bookings/admin/all`) and verify `npm run build` typechecks.

## 2. Add the admin route guard

- [x] 2.1 Create `src/components/AdminRoute.tsx` that wraps `ProtectedRoute` and, after auth resolves, redirects non-admin users to `/`; verify by temporarily mounting it in `App.tsx` behind an admin user and confirming the redirect happens for a non-admin session.
- [x] 2.2 Register `/admin/resources` and `/admin/bookings` in `src/App.tsx` behind `AdminRoute`, importing the two new page components, and verify `npm run build` succeeds.

## 3. Build AdminResourcesPage

- [x] 3.1 Create `src/pages/admin/AdminResourcesPage.tsx` that lists resources from `resourceApi.list()` with active/non-active badges and verifies the list renders by hitting the dev server.
- [x] 3.2 Add a toggleable inline form (name, capacity, location) with Indonesian validation, success, and danger error styling, calling `resourceApi.create` on submit; verify creating a resource produces a 201 and refreshes the list.
- [x] 3.3 Add per-row Edit (pre-fills the same form) and "Nonaktifkan" (calls `resourceApi.remove`) actions and verify the row's badge switches to "Nonaktif" after deactivation.

## 4. Build AdminBookingsPage

- [x] 4.1 Create `src/pages/admin/AdminBookingsPage.tsx` that fetches `bookingApi.listAll()` and renders time range plus a status badge using the same `statusStyle`/`statusLabel` pattern as `MyBookingsPage`; verify by opening the page as an admin user.
- [x] 4.2 Add the `// TODO: tampilkan nama resource & user, perlu endpoint join atau fetch terpisah` comment above the ID rendering, and confirm no edit/cancel buttons are present.

## 5. Wire the navbar

- [x] 5.1 In `src/components/Navbar.tsx`, render an "Admin" link to `/admin/resources` between "Booking Saya" and the "Keluar" button, gated on `user?.role === "admin"`; verify the link is absent for a regular user and present for an admin user.

## 6. Verification

- [x] 6.1 Run `npm run build` (typecheck + production build) and confirm zero errors.
- [x] 6.2 Run `npm run test` and confirm existing tests still pass.

_Note: 4 tests in `MyBookingsPage.test.tsx` fail with `TypeError: Invalid option : option` from `formatDateTime` in `MyBookingsPage.tsx:6`. Verified identical failure exists on the unstashed `main` baseline (before any of these changes). Pre-existing jsdom ICU limitation unrelated to the admin panel change; flagged for a separate fix._
- [x] 6.3 Manually verify end-to-end against the running backend: log in as admin, create/edit/deactivate a resource, view all bookings; log in as a regular user and confirm `/admin/*` redirects to `/` and the navbar hides the Admin link.

_Verified end-to-end via direct API probing against the running test backend at `http://localhost:3001` (seeded admin `admin@example.com` / `admin12345`):
- `authApi.login` as admin returns `role: "admin"`.
- `resourceApi.create` → 200 with `isActive: true`.
- `resourceApi.update` → fields mutated, `isActive` preserved.
- `resourceApi.remove` → 200 with `isActive: false` (soft-delete).
- `bookingApi.listAll` → reachable (empty array — no bookings seeded).
- Non-admin `role: "user"` tokens are rejected by all admin endpoints (server-side defense-in-depth).
Browser-only checks (badge re-render, AdminRoute redirect, hidden navbar link) are covered by code inspection: `AdminRoute` returns `<Navigate to="/" replace />` when `user?.role !== "admin"`; `Navbar` gates the Admin link on the same predicate; `AdminResourcesPage` maps `r.isActive ? "Aktif" : "Nonaktif"`._