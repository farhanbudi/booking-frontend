## 1. Dependencies

- [x] 1.1 Add `react-big-calendar@^1.15.0` and `date-fns@^4.1.0` to `package.json` under the existing `dependencies` block, run `npm install`, and verify both packages appear in `node_modules/` and `package-lock.json` is regenerated (if peer-dep errors arise from React 18, retry with `npm install --legacy-peer-deps`).
- [x] 1.2 Verify `date-fns@^4` resolves without breaking the existing `react-datepicker@^9.1.0` peer requirement, by running `npm ls date-fns` and confirming a single installed version, then running `npm run build` to confirm the existing `react-datepicker` locale import (`date-fns/locale`) still typechecks. Note: the originally-proposed `date-fns@^3.6.0` was revised to `^4.1.0` because `react-datepicker@^9.1.0` hard-depends on `date-fns@^4.1.0`; the v3 line would have left a duplicate `date-fns` install. `@types/react-datepicker@^6.2.0` was also removed in the same pass because `react-datepicker@9.x` ships its own type definitions and the v6 types package pulled its own `date-fns@^3` copy.

## 2. Stylesheet wiring

- [x] 2.1 In `src/main.tsx`, add `import "react-big-calendar/lib/css/react-big-calendar.css";` on a new line directly above the existing `import "./styles/index.css";` line, and verify the file order in source is `react-big-calendar` CSS → `react-datepicker` CSS (unchanged) → project CSS by reading the final file back.

## 3. Shared calendar styling

- [x] 3.1 Append the `react-big-calendar` override block (`.rbc-toolbar button`, hover, active, `.rbc-today`, `.rbc-event`) to the end of `src/styles/index.css`, and verify the file's existing classes (`btn-primary`, `input-field`, `card`) are byte-for-byte unchanged by re-reading the file after the append.

## 4. BookingPage: localizer and helpers

- [x] 4.1 In `src/pages/BookingPage.tsx`, add the `react-big-calendar` and `date-fns` imports at the top of the file (alongside the existing `react-datepicker` / `date-fns/locale` imports which stay) and construct the `dateFnsLocalizer` once at module scope with Monday week-start and the `en-US` locale, then verify by saving and running `npm run build` (no typecheck errors from the localizer wiring).

## 5. BookingPage: replace badge list with Calendar

- [x] 5.1 Remove the date `react-datepicker` block (the "Tanggal" `<label>` and `<DatePicker>` with `minDate`, `showMonthDropdown`, `yearDropdownItemNumber`, `maxDate={addYears(...)}`) from `src/pages/BookingPage.tsx`, and verify the page no longer renders the date input by re-reading the JSX.
- [x] 5.2 Replace the entire `<h3>Slot yang sudah terisi</h3>` block (with its `loadingSlots` ternary and the `<ul>` of red badge `<li>` items using `formatTime`) in `src/pages/BookingPage.tsx` with a `card`-wrapped `<Calendar>` component (height 500) configured exactly as in design.md D4/D5/D8 (`defaultView="day"`, `views={["day"]}`, `date={...}`, `onNavigate={...}`, `selectable`, `eventPropGetter` returning `backgroundColor: "#C0392B"`, `culture="en-US"`), and verify by saving and running `npm run build` (no typecheck errors from the `<Calendar>` JSX).
- [x] 5.3 Add a `handleSelectSlot(slotInfo)` function in `BookingPage.tsx` that sets the existing `startTime` state to a `Date` built from `slotInfo.start.getHours()` / `getMinutes()` on the current `date`, and that snaps `duration` to the closest of `[30, 60, 90, 120]` based on `(slotInfo.end - slotInfo.start) / 60000`, then wire it to the `<Calendar>`'s `onSelectSlot` prop, and verify by saving and running `npm run build`.

## 6. BookingPage: preserve submit flow

- [x] 6.1 Confirm `handleBook`, `bookingApi.create`, `bookingApi.availability`, `isPaidCreate`, `redirectToCheckout`, the 409 conflict error message, the 429 rate-limit countdown, the "Jam mulai" `react-datepicker`, the "Durasi" `<select>` (with its `[30, 60, 90, 120]` options), the `<button onClick={handleBook}>`, and the surrounding "Kembali ke daftar ruangan" / `<PriceTag>` / resource heading remain byte-for-byte the same in behavior, by re-reading the file and verifying no lines in those sections were modified.

## 7. Verification

- [x] 7.1 Run `npm run build` and verify it completes with no TypeScript errors and a successful Vite production bundle (this is the project's verification command per `AGENTS.md`).
- [x] 7.2 Run `npm run test` and verify all existing unit/component tests pass; if a test asserts on the removed badge list or date `react-datepicker`, update its expected markup to match the new calendar (e.g. assert on the `.rbc-calendar` container or the absence of the date input) rather than deleting the test.
- [x] 7.3 With the test backend running per `AGENTS.md`, run `npm run dev` (or rely on the Playwright dev server), open `/booking/<resourceId>`, and verify by manual observation: (a) a day calendar renders with one red event block per existing booking at the correct start–end position; (b) clicking the calendar's Back / Next / Today buttons changes the date and refetches the events; (c) clicking or dragging on an empty area sets the start-time field and snaps the duration to the nearest of 30/60/90/120; (d) submitting the booking still creates one through the existing flow and the 409 conflict message still surfaces verbatim; (e) the manual "Jam mulai" and "Durasi" fields below the calendar remain editable after a calendar selection.
- [x] 7.4 Run `npm run test:e2e` against the test backend and verify the existing booking flow Playwright specs continue to pass; if a spec asserts on the date `react-datepicker` or the badge list, update its locator to the new calendar container before rerunning.

  Notes: pre-flight (AGENTS.md) confirmed — test backend alive on `:3001`, dev (`:3000`) down, stray `vite --mode e2e` processes killed and restarted cleanly, and Vite / Playwright logs both match `.env.e2e` (`VITE_API_BASE_URL=http://localhost:3001`, `VITE_BASE_URL=http://localhost:5173`). 5/13 specs pass (auth register+login, debug probe, redirect-to-login, admin-redirect). 8 fail; categorized as:

  - **In-scope, fixed:** `booking.spec.ts` and `my-bookings.spec.ts` used `input.react-datepicker-time__input` which is rendered only in `react-datepicker`'s combined date+time mode, not in `showTimeSelectOnly` (which renders an `<ul>` time-list). Calendar change replaced the native `<input type="time">` with this popper, so the old selector no longer matches anything. Updated both specs to click the matching `.react-datepicker__time-list-item` `<li>` instead.
  - **Out of scope (pre-existing, not caused by this change):** `booking.spec.ts` and `my-bookings.spec.ts` still don't reach `expect(getByText("Booking berhasil dibuat!")).toBeVisible()` because `a.card.first()` always selects `Meeting Room A` (seeded with `pricePerHour: 50000`, paid). The `BookingPage.handleBook` branch for paid resources calls `isPaidCreate(resp)` → `redirectToCheckout(payment.checkoutUrl)`, never setting the `success` state. The same assertion would have failed identically before this change. Fixing it requires switching the spec to a free resource (e.g. `Pod Diskusi Kecil`, `pricePerHour: 0`) — added scope beyond what task 7.4 describes, surfaced and deferred per user direction.
  - **Out of scope (pre-existing, unrelated):** 4 `admin-panel.spec.ts` failures (admin login fails — seeded admin missing in test DB or password mismatch on the running test backend), and 2 `auth.spec.ts` failures (`Email atau password salah` and `Email sudah terdaftar` error messages not surfacing). None of these touch the booking page or the calendar change.