## 1. API client contract (`src/api/client.ts`)

- [x] 1.1 Add `pricePerHour: number | null` to the `Resource` interface
- [x] 1.2 Add optional `payment?: { checkoutUrl?: string; expiresAt?: string }` to the `Booking` interface
- [x] 1.3 Define `PaymentInfo` and `CreateBookingResponse = Booking | { booking: Booking; payment: Required<PaymentInfo> }`; widen `bookingApi.create` return type to `CreateBookingResponse`
- [x] 1.4 Add `bookingApi.getCheckoutUrl(id: string)` wrapping `GET /bookings/:id/checkout-url` (returns `{ booking, payment }`); ensure 403/409 surface `err.message` via existing `request()`
- [x] 1.5 Add helper predicates: `isPaidResource(r)`, `isPaidCreate(resp)`, `formatIDR(n)`, and `redirectToCheckout(url)` (`window.location.href = url`)

## 2. Shared helpers & components

- [x] 2.1 Create `PriceTag` component: "Gratis" when `null`/`0`, else `Rp <n>/jam` (IDR formatted, Indonesian)
- [x] 2.2 Create `PaymentCountdown` component: live `mm:ss` ticker from `expiresAt`, `onExpire` callback, styled with existing tokens (`text-accent`, `card`)
- [x] 2.3 Add a small `useBookingConfirmationPoll(bookingId)` hook (polls `GET /bookings` every ~2.5s, stops on `confirmed`/`cancelled` or past `expiresAt`, safety cap ~16 min) for the success page

## 3. Resource list & booking page updates

- [x] 3.1 `ResourcesPage`: render `PriceTag` on each resource card
- [x] 3.2 `BookingPage`: show `PriceTag` / price summary for the selected resource
- [x] 3.3 `BookingPage.handleBook`: after `create`, branch on `isPaidCreate(resp)` → `redirectToCheckout(payment.checkoutUrl)` (show "Mengalihkan ke pembayaran…"); free path keeps immediate success
- [x] 3.4 `BookingPage`: ensure 409 (Indonesian overlap message) still shows and the form stays editable for both free and paid

## 4. Stripe return pages (new)

- [x] 4.1 Create `PaymentSuccessPage` at route `/pembayaran/berhasil`: read `booking_id` from query, show "Pembayaran diterima, mengonfirmasi…", use the poll hook until `confirmed`
- [x] 4.2 `PaymentSuccessPage`: handle `cancelled` / `pending`-past-`expiresAt` → recoverable state with "Lanjutkan pembayaran" (calls `getCheckoutUrl` then `redirectToCheckout`)
- [x] 4.3 Create `PaymentCancelPage` at route `/pembayaran/batal`: read `booking_id`, show cancelled-payment message + "Lanjutkan pembayaran" + link back to "Booking saya"
- [x] 4.4 Register both routes in `src/App.tsx` wrapped in `ProtectedRoute`

## 5. My Bookings pending UI (`src/pages/MyBookingsPage.tsx`)

- [x] 5.1 For `pending` bookings with `payment?.expiresAt`: render `PaymentCountdown` and a "Lanjutkan pembayaran" button → `getCheckoutUrl(id)` then `redirectToCheckout`
- [x] 5.2 Reflect expired state (past `expiresAt`): disable/resume prompt to rebook; keep existing `Batalkan` (PATCH cancel) for non-cancelled
- [x] 5.3 Ensure `listMine` response (now carrying `payment.expiresAt` on pending) is rendered without breaking existing badge logic

## 6. Localization & tokens

- [x] 6.1 All new copy/errors in Indonesian (e.g. "Gratis", "Rp 50.000/jam", "Mengalihkan ke pembayaran…", "Pembayaran diterima, mengonfirmasi…", "Lanjutkan pembayaran", "Kedaluwarsa")
- [x] 6.2 Use design-token classes only (`btn-primary`, `input-field`, `card`, `text-accent`, `text-muted`, `text-danger`); never raw hex

## 7. Tests

- [x] 7.1 `client.test.ts`: paid `create` returns wrapped shape; `getCheckoutUrl` mapping; 403/409 throw with message
- [x] 7.2 `BookingPage.test.tsx`: price shown; paid `create` triggers `window.location.href` redirect (mock fetch); 409 shows message
- [x] 7.3 `PaymentSuccessPage.test.tsx`: polling reaches `confirmed`; expired/`cancelled` shows resume
- [x] 7.4 `PaymentCancelPage.test.tsx`: resume button calls `getCheckoutUrl` and redirects
- [x] 7.5 `MyBookingsPage.test.tsx`: countdown + "Lanjutkan pembayaran" for `pending`; expired state reflected
- [x] 7.6 Note E2E limitation in test plan: Playwright cannot drive Stripe-hosted Checkout — mock `checkout-url` or require `stripe listen` against the test backend

## 8. Verification

- [x] 8.1 `npm run build` passes (tsc + vite build) with the new types
- [x] 8.2 `npm run test` passes for the new/updated unit/component tests
- [x] 8.3 Manual: free booking confirms instantly; paid booking redirects to `4242 4242 4242 4242` Checkout and confirms via webhook; cancel/resume works; pending countdown + expiry reflected
