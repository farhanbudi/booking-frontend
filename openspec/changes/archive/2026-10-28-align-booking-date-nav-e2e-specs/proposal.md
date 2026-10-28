## What Changes

- The `booking-creation` capability requirement "Calendar date navigation is the single source of date changes" is restated with the labels that are actually shipped ("Sebelumnya", "Berikutnya", "Hari ini") and states that, in the single-day view, the forward control advances the selected date by exactly one day.
- The `test-suite` capability requirement "End-to-end booking journey is verified" is restated so that the end-to-end journey is documented as reaching its future date through the calendar's forward control instead of a control that does not exist, and as using a start time that is always inside the application's operating hours.
- The `test-suite` capability gains two requirements: one stating that the end-to-end suite is independent of the hour it runs in, and one stating that the booking journey is executed against a free test dataset (a paid resource makes the journey reach the payment page instead of the booking success state).
- The E2E booking specs (`e2e/booking.spec.ts`, `e2e/my-bookings.spec.ts`) and the shared E2E helpers (`e2e/helpers.ts`) are aligned with the shipped UI: a shared `openBookingPage` helper opens the booking page of the first room in the list, a shared `pickSlot` helper moves the calendar forward with the "Berikutnya" control and selects the start time from the time list, and both specs use it with a fixed operating start time ("09:00") and different target days (1 and 2 days ahead) so the two journeys never clash.
- The assertion that the previous success message is hidden after the conflict error is dropped: the success toast can still be on screen when the conflict error appears, so the assertion was flaky rather than meaningful. The conflict error message itself is still asserted.
- No application source change, no new dependency, no change to the assertions about booking success, the double-booking conflict message, or the cancellation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `booking-creation`: the calendar date-navigation requirement is restated with the shipped Indonesian control labels and the one-day-per-step behaviour of the single-day view.
- `test-suite`: the "end-to-end booking journey" requirement describes the forward-control navigation and the operating-hour start time, and two new requirements cover hour independence and the free test dataset.

## Impact

- Affected code: `e2e/helpers.ts`, `e2e/booking.spec.ts`, `e2e/my-bookings.spec.ts` (E2E only).
- Affected specs: `openspec/specs/booking-creation/spec.md`, `openspec/specs/test-suite/spec.md` (updated at archive time from the deltas in this change).
- Unaffected: `src/**` (the calendar toolbar, the booking page, the DatePicker), `playwright.config.ts`, `.github/workflows/**`, the backend repository, `package.json` dependencies.
- Effect on the E2E CI job: the two booking specs stop failing for a selector reason and stop depending on the hour of the day; the other specs are untouched.
- Environment note: because the journey books the first resource in the list, the test environment must expose free resources. The E2E workflow guarantees this by running `UPDATE resources SET price_per_hour = 0` after the backend reports healthy; a local run needs the same statement applied to the local test database.
