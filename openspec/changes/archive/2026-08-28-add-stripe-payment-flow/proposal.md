## Why

The booking API now supports paid resources via Stripe test-mode Checkout, but the frontend still assumes every booking is confirmed instantly (free flow). To let users actually pay for priced rooms, the frontend must branch on whether a resource is paid: free bookings confirm immediately as before, while paid bookings are created as `pending`, hold the slot, and must be paid through a Stripe-hosted Checkout session before they become `confirmed`. Without this, paid bookings can never complete and the slot-hold / expiry semantics are invisible to users.

## What Changes

- **Resource price awareness**: `GET /resources` and `GET /resources/:id` already return `pricePerHour` (integer IDR, `null`/`0` = free, `>0` = paid). The UI now reads and displays it (resource card + booking summary) so users know a room is paid before booking.
- **Branching booking creation**: `POST /bookings` response shape now branches — free resource returns the `Booking` directly (status `confirmed`); paid resource returns `{ booking, payment: { checkoutUrl, expiresAt } }`. The frontend detects the `payment` field (not status) and, for paid bookings, redirects the browser to `payment.checkoutUrl` (Stripe-hosted Checkout; no self-built card form).
- **Stripe return pages**: Two new frontend-owned routes handle the redirect back from Stripe — success (`/pembayaran/berhasil`) and cancel (`/pembayaran/batal`). The success page polls the user's bookings until the target booking reaches `confirmed` (webhook-driven), with an expired/recoverable fallback; the cancel page keeps the pending booking and offers "Lanjutkan pembayaran".
- **Resume / retry pending payment**: A new `GET /bookings/:id/checkout-url` (owner-only) returns a fresh Checkout URL + `expiresAt` so a closed or expired Checkout can be resumed. Surfaced via a "Lanjutkan pembayaran" button on the cancel page and on `pending` bookings in "Booking saya".
- **Pending booking state in "Booking saya"**: `pending` bookings now render a live countdown from `payment.expiresAt` (provided by `GET /bookings`) and a "Lanjutkan pembayaran" action; expiry is reflected in the UI. The existing `Batalkan` (PATCH cancel) is retained.
- **Edge-case handling**: 409 slot-conflict still shows the backend's Indonesian message; paid-booking confirmation is never assumed instant (always poll/wait); non-owner `GET /bookings/:id/checkout-url` (403) and non-pending (409) are surfaced as errors without redirecting.

## Capabilities

### New Capabilities
- `payment-booking`: Frontend behavior for paid (Stripe test-mode) bookings — resource price display, branching booking creation/redirect, Stripe success/cancel return pages with confirmation polling, pending-booking resume via `GET /bookings/:id/checkout-url`, and pending/expiry UI on "Booking saya".

### Modified Capabilities
- None. No existing spec-level behavior changes (the free booking flow is preserved unchanged, only extended).

## Impact

- **API client (`src/api/client.ts`)**: add `pricePerHour` to `Resource`; add optional `payment` to `Booking`; widen `bookingApi.create` return type to a `Booking | { booking, payment }` union; add `bookingApi.getCheckoutUrl(id)`. Helper predicates `isPaidResource`, `isPaidCreate`, `formatIDR`, and `redirectToCheckout`.
- **Routes (`src/App.tsx`)**: two new protected routes `/pembayaran/berhasil` and `/pembayaran/batal`.
- **Pages**: `ResourcesPage` (price tag), `BookingPage` (price summary + paid redirect), `MyBookingsPage` (countdown + resume). New `PaymentSuccessPage`, `PaymentCancelPage`.
- **Shared components**: `PriceTag`, `PaymentCountdown` (new).
- **Tests**: extend `client.test.ts`, `BookingPage.test.tsx`, `MyBookingsPage.test.tsx`; add `PaymentSuccessPage.test.tsx`, `PaymentCancelPage.test.tsx`. E2E (Playwright) cannot drive Stripe-hosted Checkout directly — note as a known limitation (mock `checkout-url` or require `stripe listen` against the test backend).
- **No production-runtime dependency added** beyond what already exists; Stripe Checkout is fully hosted. Devs use test card `4242 4242 4242 4242`.
- **Backend contract dependency**: relies on the sibling `booking-backend` returning the documented shapes, embedding `booking_id` in `success_url`/`cancel_url`, and (for the countdown) embedding `payment.expiresAt` on `pending` bookings from `GET /bookings`.
