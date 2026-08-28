## Context

The frontend currently assumes every booking is confirmed instantly (the free flow). `src/api/client.ts` defines `Resource` without `pricePerHour` and `Booking` without any `payment` field; `bookingApi.create` returns a bare `Booking`; there is no `GET /bookings/:id/checkout-url` wrapper. `src/App.tsx` has no Stripe return routes. The sibling `booking-backend` (test mode) already returns the documented shapes: free `POST /bookings` → `Booking` (status `confirmed`); paid `POST /bookings` → `{ booking, payment: { checkoutUrl, expiresAt } }`; `GET /bookings/:id/checkout-url` → `{ booking, payment }`; and `GET /bookings` listing the user's bookings with `status` and (for `pending`) `payment.expiresAt`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Extend the existing free flow with a paid branch that redirects to Stripe-hosted Checkout and waits for webhook-driven confirmation.
- Make pending/expiry state visible and recoverable (resume) in the UI.
- Keep the existing free-booking and `PATCH /bookings/:id/cancel` behavior fully intact.

**Non-Goals:**
- Building any in-app card form or handling Stripe webhooks (backend-owned).
- Changing backend contracts — the frontend only consumes the documented shapes.
- Adding a real-money path (Stripe test mode only; card `4242 4242 4242 4242`).
- Modifying the existing test-suite tooling (separate change).

## Decisions

- **D1 — Detect paid by the `payment` field, not `status`.** Both free and paid `POST /bookings` return HTTP 201; a paid booking sits as `pending` until paid. Inspecting `status` would mis-handle the pending window. We model `CreateBookingResponse = Booking | { booking, payment }` and branch on `"payment" in resp`.
  - *Alternative considered:* branch on `resource.pricePerHour > 0` only. Rejected because the response shape is the authoritative signal and decouples UI from resource-price assumptions.
- **D2 — Return pages identified by `booking_id` query param.** The backend embeds `?booking_id=<id>` (and optionally `&session_id`) in `success_url`/`cancel_url`. The frontend reads `booking_id` via `useSearchParams`. Confirmed with user.
  - *Alternative:* `sessionStorage` set before redirect. Rejected (fragile on new tab / cleared storage).
- **D3 — `GET /bookings` embeds `payment.expiresAt` for pending bookings.** The countdown reads it directly; `GET /bookings/:id/checkout-url` is only called when the user clicks "Lanjutkan pembayaran". Confirmed with user.
  - *Alternative:* lazy-fetch `checkout-url` for every pending row. Rejected (extra requests, risks regenerating sessions just to show a timer).
- **D4 — Indonesian route slugs** `/pembayaran/berhasil` (success) and `/pembayaran/batal` (cancel). Confirmed with user; matches the app's Indonesian UX.
- **D5 — Full-page redirect to Stripe.** `window.location.href = checkoutUrl` (not an in-app iframe/modal). Stripe Checkout is hosted; returning reloads the SPA at the return route. The JWT persists in `localStorage`, so the return pages can stay wrapped in `ProtectedRoute`.
- **D6 — Success-page polling.** Poll `GET /bookings` every ~2.5s, locate the booking by `booking_id`, stop when `confirmed` or `cancelled`, or when `pending` has passed `expiresAt`, with a safety cap (~16 min) to avoid infinite polling. No single-`GET /bookings/:id` endpoint is needed.
- **D7 — Type modeling.** Add `pricePerHour: number | null` to `Resource`; add optional `payment?: { checkoutUrl?: string; expiresAt?: string }` to `Booking`; add helper predicates `isPaidResource`, `isPaidCreate`, `formatIDR`, and `redirectToCheckout`. Keep the existing `request()` wrapper (it already injects the Bearer token and surfaces `{ error }` in Indonesian).
- **D8 — No new runtime dependency.** Stripe Checkout is fully hosted; no SDK is required on the frontend. The test card `4242 4242 4242 4242` is used in test mode.

## Risks / Trade-offs

- **Webhook latency / local dev.** If the backend webhook isn't reachable (no `stripe listen --forward-to localhost:3000/payments/webhook`), the booking still auto-confirms via the backend's fallback, but may lag. → Mitigation: success page polls and shows "mengonfirmasi…"; the 15-min `expiresAt` is the safety net.
- **Expired-but-not-yet-cancelled race.** Backend cancels pending at `expiresAt`; client may briefly show `pending` past `expiresAt`. → Mitigation: treat `pending` + past `expiresAt` as expired/recoverable in the UI; next poll shows `cancelled`.
- **403 / 409 on resume.** Non-owner or already-confirmed/cancelled booking. → Mitigation: surface the backend message, no redirect (see spec scenario).
- **E2E cannot drive Stripe-hosted Checkout.** → Mitigation / known limitation: Playwright specs either mock `GET /bookings/:id/checkout-url` to a local stub page or require `stripe listen` against the test backend; document this rather than building a fake card form.
- **`booking_id` must be embedded by backend.** If the backend omits it, the success page cannot poll. → Mitigation: spec requires it; falls back gracefully (shows "mengonfirmasi…" then expired state).

## Migration Plan

- Front-end additive change; no database or backend migration. Backend already returns the shapes in test mode.
- Deploy: add the two routes, extend `client.ts`, update the three pages, add the two new pages and shared components.
- Rollback: revert the changed files; free-booking behavior is untouched, so partial rollback is safe.
- No env changes required beyond the existing `VITE_API_BASE_URL` pointing at a running backend.

## Open Questions

None outstanding — all material decisions (return-page ID, pending-data source, route slugs, polling fallback) were resolved with the user before planning.
