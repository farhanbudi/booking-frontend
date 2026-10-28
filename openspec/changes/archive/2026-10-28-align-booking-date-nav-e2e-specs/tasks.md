## 1. Prepare

- [x] 1.1 Create the branch `test/align-booking-date-nav-e2e-specs` from `ci/e2e-setup` and verify with `git branch --show-current` that the new branch is active; do not push
- [x] 1.2 Review the existing uncommitted implementation in `e2e/helpers.ts`, `e2e/booking.spec.ts` and `e2e/my-bookings.spec.ts` against `design.md` (D1–D8) and list the deviations; verify that no `getByRole("button", { name: "Next" })` lookup and no `Date.now() % 24` start hour remains in the repository

## 2. Shared navigation helper

- [x] 2.1 In `e2e/helpers.ts`, keep the helper `pickSlot(page, { daysAhead, time })` that clicks the "Berikutnya" control `daysAhead` times and then picks the requested time from the start-time list; verify the control is located by its role and label, that the clicks are awaited one by one, and that the time-list item is matched exactly (`HH:mm`)
- [x] 2.2 Change the helper that opens the booking page so that it clicks the **first** room card in the resources list (no dependency on the backend's seeded resource names) and waits for the booking form and the calendar; verify the helper no longer refers to a seeded resource name
- [x] 2.3 Verify the start-time input is addressed as `input.input-field` so that the duration `<select>` (which shares the class) is not matched

## 3. Align the booking specs

- [x] 3.1 In `e2e/booking.spec.ts` and `e2e/my-bookings.spec.ts`, use the shared helpers and keep the two journeys on different days (one day ahead and two days ahead) with the fixed operating start time 09:00; verify the two journeys can never target the same resource slot
- [x] 3.2 Confirm that the success message, the 409 conflict message, the "Booking Saya" navigation, the cancellation and the "Batalkan" disappearance assertions are all still present and unchanged
- [x] 3.3 Confirm with `git diff --stat` that only `e2e/helpers.ts`, `e2e/booking.spec.ts` and `e2e/my-bookings.spec.ts` changed, that no file under `src/` was touched, and that the only removed assertion is the "Booking berhasil dibuat!" visibility check documented in `design.md` (D5)

## 4. Verification

- [x] 4.1 Run `npm run typecheck` and `npm run test` and confirm both pass
- [x] 4.2 Start the backend with `bun run test:server` in `../booking-backend` using `NODE_ENV=test` and a `.env.test` whose `DATABASE_URL` points at a database whose name contains "test"; verify `GET http://127.0.0.1:3001/health` answers `ok`
- [x] 4.3 Make the local test dataset free before running the suite (`UPDATE resources SET price_per_hour = 0` against that database, the same statement the E2E workflow's dataset step runs) and verify every resource reports a price of 0; otherwise the app redirects to a payment page and the success toast never appears
- [x] 4.4 Run `npx playwright test e2e/booking.spec.ts e2e/my-bookings.spec.ts` and verify both specs pass; record the exact pass/fail list and the runtime
- [x] 4.5 Run the full `npm run test:e2e` and verify that no spec fails because of the date navigation any more; list any remaining failure for the report instead of weakening a spec
- [x] 4.6 Confirm the specs still work under the CI conditions (`CI=1 npx playwright test e2e/booking.spec.ts e2e/my-bookings.spec.ts`) with the same result as the local run

## 5. Commit & hand-off

- [x] 5.1 Commit the change as one logical commit (`test: align booking e2e specs with the calendar navigation`); verify with `git log --oneline -3` and confirm nothing was pushed
- [x] 5.2 Report the result in Indonesian: files changed, the pass/fail list of the two booking specs before and after, the verification commands that were run, and the remaining failures (if any) that belong to `align-admin-nav-e2e-specs`
