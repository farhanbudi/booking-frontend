## Purpose

Frontend behavior for paid (Stripe test-mode) bookings: showing resource price, branching booking creation to a Stripe-hosted Checkout, handling the success/cancel return pages with confirmation polling, and resuming or reflecting expired pending bookings.

## ADDED Requirements

### Requirement: Resource price is displayed
The system SHALL display each resource's price using `pricePerHour` (integer IDR) returned by `GET /resources` and `GET /resources/:id`. A value of `null` or `0` SHALL be shown as "Gratis"; a value `> 0` SHALL be shown formatted in Indonesian Rupiah as "Rp <amount>/jam" (e.g. `Rp 50.000/jam`). The price SHALL be visible on the resource card and on the booking summary.

#### Scenario: Free resource shows "Gratis"
- **WHEN** a resource has `pricePerHour` of `null` or `0`
- **THEN** the UI shows "Gratis" on its card and booking summary

#### Scenario: Paid resource shows formatted IDR price
- **WHEN** a resource has `pricePerHour` of `50000`
- **THEN** the UI shows "Rp 50.000/jam" on its card and booking summary

### Requirement: Paid versus free is detected by price and by response shape
The system SHALL treat a resource as paid when `pricePerHour > 0`. The system SHALL decide how to handle a `POST /bookings` response by the PRESENCE of a `payment` field, NOT by the booking `status` alone (a paid booking is `pending` until paid).

#### Scenario: Free resource returns a bare booking
- **WHEN** `POST /bookings` is called for a free resource
- **THEN** the response contains the booking object directly with no `payment` field

#### Scenario: Paid resource returns a wrapped booking with payment
- **WHEN** `POST /bookings` is called for a paid resource
- **THEN** the response contains `{ booking, payment: { checkoutUrl, expiresAt } }`

### Requirement: Free booking confirms immediately
For a free resource, after a successful `POST /bookings` the system SHALL treat the booking as `confirmed` and SHALL show an immediate success message. Existing free-booking behavior is preserved unchanged.

#### Scenario: Free booking shows success
- **WHEN** a free booking is created and the response has no `payment` field
- **THEN** the UI shows a success message and the slot is confirmed

### Requirement: Paid booking redirects to Stripe Checkout
For a paid resource, after `POST /bookings` returns `{ booking, payment }`, the system SHALL navigate the browser (full page redirect) to `payment.checkoutUrl`, which is a Stripe-hosted Checkout page. The system SHALL NOT build a custom card-entry form.

#### Scenario: Paid booking redirects to Checkout
- **WHEN** the create response contains a `payment.checkoutUrl`
- **THEN** the browser navigates to that URL, leaving the SPA

#### Scenario: No custom card form
- **WHEN** a paid booking is initiated
- **THEN** the UI renders no in-app credit-card form and relies on Stripe's hosted page

### Requirement: Success page polls for confirmation
On the route `/payments/success?booking_id=<id>`, the system SHALL read `booking_id` from the query string and poll `GET /bookings` (the current user's bookings) until the matching booking's status is `confirmed`. The system SHALL NOT assume the booking is confirmed instantly.

#### Scenario: Pending booking becomes confirmed
- **WHEN** the success page loads with a valid `booking_id` and the booking is `pending`
- **THEN** the UI shows "Pembayaran diterima, mengonfirmasi…" and polls until status is `confirmed`, then shows a confirmed state

#### Scenario: Booking already confirmed
- **WHEN** the success page loads and the booking is already `confirmed`
- **THEN** the UI shows the confirmed state without further polling

### Requirement: Success page handles expired or cancelled booking
On `/payments/success`, if the target booking is `cancelled`, or remains `pending` past `payment.expiresAt`, the system SHALL present a recoverable state offering "Lanjutkan pembayaran" (fetch a fresh Checkout URL) rather than a dead end.

#### Scenario: Pending booking expires before confirmation
- **WHEN** the success page polls and the booking is still `pending` after `payment.expiresAt`
- **THEN** the UI shows an expired/recoverable message with a "Lanjutkan pembayaran" button

#### Scenario: Booking cancelled by backend
- **WHEN** the success page finds the booking status is `cancelled`
- **THEN** the UI offers "Lanjutkan pembayaran" (or guidance to rebook)

### Requirement: Cancel page keeps pending booking and offers resume
On the route `/payments/cancel?booking_id=<id>`, the system SHALL read `booking_id`, keep the pending booking (it still holds the slot), and SHALL offer a "Lanjutkan pembayaran" action plus a link back to the user's bookings.

#### Scenario: Cancel page shows resume
- **WHEN** Stripe redirects to `/payments/cancel` with a `booking_id`
- **THEN** the UI shows a cancelled-payment message and a "Lanjutkan pembayaran" button

### Requirement: Pending payment can be resumed
The system SHALL call `GET /bookings/:id/checkout-url` (owner-only) to obtain a fresh `{ booking, payment: { checkoutUrl, expiresAt } }` and SHALL redirect to `payment.checkoutUrl`. This action SHALL be available from the cancel page and from "Booking saya" for `pending` bookings.

#### Scenario: Resume from cancel page
- **WHEN** the user clicks "Lanjutkan pembayaran" on the cancel page
- **THEN** the system fetches a fresh checkout URL and navigates to it

#### Scenario: Resume from My Bookings
- **WHEN** the user clicks "Lanjutkan pembayaran" on a `pending` booking in "Booking saya"
- **THEN** the system fetches a fresh checkout URL and navigates to it

#### Scenario: Non-owner or non-pending resume is rejected
- **WHEN** `GET /bookings/:id/checkout-url` returns 403 (non-owner) or 409 (booking not pending)
- **THEN** the system surfaces the backend error message and does NOT redirect

### Requirement: Pending bookings show a countdown and resume in My Bookings
`GET /bookings` SHALL include `payment.expiresAt` on `pending` bookings. The "Booking saya" list SHALL render a live countdown derived from `payment.expiresAt` for each `pending` booking, plus a "Lanjutkan pembayaran" button. When `expiresAt` has passed, the UI SHALL reflect the expired state (e.g. disable resume, prompt to rebook).

#### Scenario: Countdown for pending booking
- **WHEN** "Booking saya" lists a `pending` booking with `payment.expiresAt` in the future
- **THEN** the UI shows a live countdown and a "Lanjutkan pembayaran" button

#### Scenario: Expired pending reflected
- **WHEN** a `pending` booking's `payment.expiresAt` has passed
- **THEN** the UI shows an expired state and does not offer an active resume

### Requirement: Slot conflict shows backend message
When `POST /bookings` returns HTTP 409, the system SHALL display the backend's Indonesian error message and SHALL let the user pick another time. This applies to both free and paid resources.

#### Scenario: Overlapping slot rejected
- **WHEN** `POST /bookings` returns 409 with an Indonesian error body
- **THEN** the UI shows that message and keeps the booking form editable

### Requirement: New UI strings are Indonesian
All new user-facing copy and error strings introduced by this capability SHALL be written in Indonesian, consistent with the rest of the application.

#### Scenario: Indonesian copy
- **WHEN** any new screen or message from this capability is shown
- **THEN** the text is in Indonesian (e.g. "Pembayaran diterima, mengonfirmasi…", "Lanjutkan pembayaran", "Gratis", "Rp 50.000/jam")
