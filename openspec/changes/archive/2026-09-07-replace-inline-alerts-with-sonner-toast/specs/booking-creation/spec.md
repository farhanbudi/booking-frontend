## MODIFIED Requirements

### Requirement: Booking page error and success feedback
The booking page SHALL surface every error and success message from the
booking creation flow through the app-wide toast notification layer
instead of through inline `<p>` alert blocks. The existing rate-limit
countdown behaviour that controls the submit button SHALL remain in
place.

#### Scenario: Booking success appears as a toast
- **WHEN** the booking API returns a non-payment success response
- **THEN** a green toast with the message `"Booking berhasil dibuat!"`
  appears in the top-right corner and no inline green paragraph is
  rendered inside the form

#### Scenario: 409 conflict surfaces as a toast
- **WHEN** the booking API returns HTTP 409 (booking overlap)
- **THEN** a red toast with the backend error message appears in the
  top-right corner and no inline red paragraph is rendered inside the
  form

#### Scenario: 429 rate limit surfaces as a toast and disables submit
- **WHEN** the booking API returns HTTP 429 with a `Retry-After` header
- **THEN** a red toast with the backend error message appears in the
  top-right corner, the inline alert block is not rendered, and the
  submit button remains disabled while the rate-limit countdown is
  greater than zero

#### Scenario: Past start time surfaces as a toast
- **WHEN** the user clicks the booking submit button while the chosen
  start time is already in the past
- **THEN** a red toast with the message
  `"Jam mulai sudah lewat dari waktu saat ini."` appears in the
  top-right corner, the inline alert block is not rendered, and the
  submit button is not left in the submitting state