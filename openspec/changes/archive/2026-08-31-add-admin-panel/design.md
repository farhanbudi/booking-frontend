## Context

The frontend currently has no admin surface: `App.tsx` only mounts `/login`, `/register`, `/`, `/resources/:id`, `/my-bookings`, `/payments/*` (all guarded by `ProtectedRoute`), and `Navbar.tsx` exposes only `Ruangan`, `Booking Saya`, and `Keluar`. `AuthContext` already exposes `user.role`, and `client.ts` already centralises auth headers via `request()` — both are reused, not modified structurally. All required admin endpoints (`POST/PATCH/DELETE /resources`, `GET /bookings/admin/all`) already exist on the backend and enforce role on the server.

The implementation must follow existing conventions documented in `AGENTS.md`: Indonesian UI copy, design tokens only, no new libraries, `useState`/`useEffect` patterns from `LoginPage.tsx` and `BookingPage.tsx`.

## Goals / Non-Goals

**Goals:**
- Provide a role-aware route guard (`AdminRoute`) that composes with `ProtectedRoute`'s auth check.
- Provide a CRUD-lite admin resources page (list/create/edit/deactivate) using only existing tokens and shared CSS classes.
- Provide a read-only admin bookings page reusing the existing `statusStyle`/`statusLabel` pattern from `MyBookingsPage`.
- Extend `resourceApi` and `bookingApi` minimally to expose the four required calls.

**Non-Goals:**
- Building a generic resource/user join for booking rows (deferred — TODO comment).
- Modal libraries, table libraries, or form libraries (rejected per AGENTS.md).
- New design tokens or color overrides.
- Any backend change.

## Decisions

### `AdminRoute` wraps `ProtectedRoute`, does not replace it

`AdminRoute` will render `<ProtectedRoute>…children…</ProtectedRoute>` and inside, after the `ProtectedRoute` passes, check `user.role`. This composes cleanly with the existing route elements in `App.tsx` (the children pattern already used there). Alternative considered: extending `ProtectedRoute` with a `role` prop — rejected because it would change the existing component's contract and force every existing call site to consider roles.

### Single inline form toggled by boolean state, no modal library

`AdminResourcesPage` will keep a `editing: Resource | null` plus an `isFormOpen` boolean in state; the form renders conditionally below the table. Alternative considered: headless modal with backdrop — rejected because it requires portal/refs for marginal UX gain and conflicts with the "no extra libraries" rule.

### Reuse `BookingPage`'s `success` / `error` styling patterns

Both admin pages will mirror `BookingPage.tsx`'s split between a top-level form `error` (red box style) and a transient `success` string, so they look and feel consistent. No new CSS.

### Resource `create` / `update` / `remove` API surface

Add three methods to `resourceApi` and one to `bookingApi`, exactly matching the signatures in the prompt. They go through the same `request()` helper, so auth headers and `{ error }` handling are automatic. The `Booking` type already has `status: "pending" | "confirmed" | "cancelled"`, which is sufficient for the badge styles in `MyBookingsPage`.

### Status badge styles are copied, not redesigned

`statusStyle`/`statusLabel` are duplicated into `AdminBookingsPage` rather than extracted to a shared module. Trade-off: small duplication, but keeps the change minimal and avoids touching the existing `MyBookingsPage`.

## Risks / Trade-offs

- [Role-check duplication] Backend already enforces admin role, so a stale role on the frontend (e.g. demoted user) would briefly see stale UI before the next API call fails. → Mitigation: the admin API calls will surface backend errors; we can later add a `/auth/me` revalidation. Not in scope.
- [Single shared form for create + edit] A field with a stale value could be sent as `undefined` if a user clears an input. → Mitigation: the form uses controlled inputs and submits only what is currently in state; `update` accepts `Partial<…>` so this is safe.
- [Soft-deleted resources still listed for admins] Other users can still attempt to book them — backend already filters inactive resources on booking creation, so no frontend mitigation needed beyond a clear badge.
- [Booking page shows IDs, not names] Users may not recognise bookings by `resourceId`/`userId` alone. → Mitigation: explicit `// TODO` comment in the row JSX so a follow-up change can wire up a join endpoint.

## Migration Plan

No data migration needed. Deployment is just `npm run build` after merging the change. Rollback = revert the frontend PR; backend is untouched.

## Open Questions

None. All material decisions are recorded above; remaining unknowns (e.g. whether to also show an admin link in mobile nav, or whether to filter by date range on the admin bookings page) are explicitly out of scope and can be tackled as separate changes later.