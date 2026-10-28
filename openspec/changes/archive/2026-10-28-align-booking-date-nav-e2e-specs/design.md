## Context

See `proposal.md` — "Why". Facts that shape the approach:

**The calendar toolbar (`src/components/CalendarToolbar.tsx`).** The booking page renders `react-big-calendar` with `defaultView="day"` and `views={["day"]}` and a custom toolbar that renders three plain buttons: "Sebelumnya" (`onNavigate(Navigate.PREVIOUS)`), "Hari ini" (`Navigate.TODAY`) and "Berikutnya" (`Navigate.NEXT`). Because the only view is the day view, one activation of "Berikutnya" advances the selected date by exactly one day. The same toolbar holds a date-only `DatePicker` (`withPortal`, `dateFormat="EEEE, d MMMM yyyy"`, `locale="id"`) whose input displays the currently selected date.

**The start-time picker (`src/pages/BookingPage.tsx`).** A second, separate `DatePicker` with `showTimeSelect` + `showTimeSelectOnly`, `timeIntervals={30}`, `minTime={08:00}` and `maxTime={19:30}` (from `src/utils/bookingTime.ts`: `MIN_HOUR = 8`, `LATEST_START_HOUR/MINUTE = 19:30`). Its time list therefore contains only the half-hour slots between 08:00 and 19:30, and its input carries the `input-field` class (the duration `<select>` shares the class, so the selector has to be restricted to `input`). The default booking duration is 60 minutes, so a start at 09:00 ends at 10:00, well inside the 20:00 closing time.

**What the specs do today.** Both `e2e/booking.spec.ts` and `e2e/my-bookings.spec.ts` click `getByRole("button", { name: "Next" })` 30 resp. 45 times, then pick a start time computed as `Date.now() % 24` (resp. `(Date.now() + 1000) % 24`) from the time list. The "Next" button does not exist — Playwright's role-name matching is a case-insensitive substring match and no accessible name in the app contains "next" — so the spec times out on the very first click. The hour computation is a second, independent defect: for the hours 00:00–07:00 and 20:00–23:00 the requested time is not in the list at all, so the suite could never be hour-independent as it stands.

**An implementation already exists in the working tree.** `e2e/helpers.ts` has been extended with `openBookingPage` and `pickSlot`, and both booking specs use them. This design records that implementation, with two deliberate deviations that are listed in D3 and D4.

**Cost of the navigation.** Every activation of "Berikutnya" changes the `date` state, which re-triggers the availability request, so navigation issues one request per day advanced. The target offsets are one and two days, so the cost is negligible.

**The capability spec already favours the app.** `booking-creation` requires that the calendar's date navigation is the single source of date changes, that a separate manual date input does not exist, and that all user-facing copy on the booking page stays Indonesian. The app complies; the English wording in the spec and in the E2E specs is what drifted.

## Goals / Non-Goals

**Goals:**
- Make both booking specs reach a future date through the control the app actually ships.
- Make the journey independent of the hour of the day it runs at.
- Keep every assertion that still carries meaning: the booking success message, the 409 conflict message, the booking appearing in "Booking Saya", and the cancellation.
- Keep the two journeys from clashing with each other on the backend's global no-overlap constraint.

**Non-Goals:**
- Any change to `src/**`: no English aliases, no `aria-label`s added for the tests, no new navigation controls, no change to the operating hours or to the DatePicker configuration.
- Asserting the exact date the calendar landed on: the landed date is an implementation detail of the navigation, and the "always in the future" contract is covered by the requirement instead.
- Changing the admin navigation drift — that is the separate change `align-admin-nav-e2e-specs`.

## Decisions

**D1 — The specs navigate with the toolbar's "Berikutnya" button.**
The forward control is located with `getByRole("button", { name: "Berikutnya" })` and clicked once per day to advance. *Alternatives considered:* (a) opening the toolbar `DatePicker` popup and clicking a day cell — rejected, the month arithmetic and the "outside day" cells make it brittle and the popup is rendered in a portal; (b) navigating by URL — rejected, the booking page has no date parameter, the date lives in component state; (c) adding an English `aria-label` to the app button so the old selector keeps working — rejected, that changes the product for the sake of a test and conflicts with the "copy stays Indonesian" requirement.

**D2 — The navigation and the start-time selection live in one shared helper.**
`e2e/helpers.ts` gains `pickSlot(page, { daysAhead, time })`: it clicks "Berikutnya" `daysAhead` times and then picks the requested time from the time list. Both booking specs call it, so the knowledge about the calendar's control and about the time list exists in exactly one place. *Alternative considered:* keeping the loop inline in each spec — rejected, it is the duplication that let the English "Next" survive in two files at once.

**D3 — The start time is a fixed operating hour, and the two journeys use different days.**
Both journeys book at 09:00 — always inside the application's 08:00–19:30 operating window, therefore always selectable and never triggering the "start time has already passed" guard — while `booking.spec.ts` books one day ahead and `my-bookings.spec.ts` books two days ahead, so the two journeys never target the same resource slot and never hit the backend's global no-overlap constraint. *Alternatives considered:* (a) a clock-derived hour such as `8 + (Date.now() % 12)` — rejected, it makes the outcome depend on the wall clock again and only helps against collisions between concurrent runs, which are rare and are handled by the E2E job's concurrency group; (b) keeping `Date.now() % 24` — rejected, for roughly half of the day the requested time does not exist in the list.

**D4 — The journey books the first room in the list, and the environment provides free resources.**
`openBookingPage(page)` clicks the first `a.card` on the resources page and waits for the booking form and the calendar. The environment must expose free resources, because the backend creates a payment (and the app redirects to the checkout page) for any resource with a non-zero price; the E2E workflow guarantees this with the dataset step `UPDATE resources SET price_per_hour = 0` after the backend is healthy, and a local run applies the same statement to the local test database. *Alternatives considered:* (a) selecting the resource by its seeded name — rejected, it couples the frontend suite to the backend's seed wording, which the frontend repository does not control; (b) picking the first resource that is free dynamically — rejected, it adds list-scanning logic to the suite for a condition the environment already guarantees; (c) making the specs depend on a live payment provider — rejected, out of scope and forbidden by the E2E design.

**D5 — The "success message is hidden" assertion is dropped, deliberately.**
The old spec asserted that the "Booking berhasil dibuat!" message is no longer visible after the conflict error. The success message is a toast, and a toast stays on screen for a few seconds, so the assertion is a race: it fails whenever the previous success toast has not expired yet, and it says nothing about the conflict itself. The conflict error message is still asserted, and the cancellation assertions are untouched. *Alternative considered:* keeping the assertion and waiting for the toast to disappear first — rejected, that inserts a sleep-like wait into the suite to preserve an assertion that carries no information.

**D6 — Every click is awaited individually.**
The toolbar is re-rendered after each navigation, so the previous button element is replaced. The loop therefore clicks sequentially and lets Playwright's actionability checks resolve the current element each time; no `Promise.all`, no `force: true`, no detached-element shortcut. *Alternative considered:* pressing a keyboard shortcut — rejected, no such shortcut exists.

**D7 — The time list item is matched on its exact text.**
The time list is addressed with `.react-datepicker__time-list-item` filtered by an exact `HH:mm` pattern, and the picker input is addressed as `input.input-field` so that the duration `<select>` (same class) is not matched. *Alternative considered:* selecting the start time by clicking a free slot in the day calendar — rejected, the slot geometry depends on the calendar layout and the highlight logic, whereas the time list is a stable list of text values.

**D8 — The OpenSpec scenario titles keep their existing wording.**
The delta validator refuses a `MODIFIED` requirement that drops or renames a scenario of the current spec, so the scenario titles of "Calendar date navigation is the single source of date changes" and "End-to-end booking journey is verified" stay as they are while their bodies are updated to name the shipped controls. Only the requirement headers and the added requirements use new wording.

## Risks / Trade-offs

- **[Risk] Two concurrent runs can target the same room, day and hour.** The journey now books a fixed room, a fixed offset (1 or 2 days ahead) and a fixed hour (09:00), so a CI run and a local run started on the same day would compete for the same slot, and the loser would see a conflict error instead of a success. → Mitigation: the E2E job's concurrency group cancels superseded runs on the same ref, and the failure mode is a clearly reported conflict rather than a silent wrong result. It is accepted, and recorded here so a future change can move to a clock-derived slot if it becomes annoying.
- **[Risk] The first room in the list is not free in a plain dev database.** → Mitigation: the environment precondition is explicit (free test dataset) and is part of the requirement; the E2E workflow enforces it, and the local run instructions in `tasks.md` say to apply the same statement.
- **[Risk] The "Berikutnya" button only exists once the calendar has rendered.** → Mitigation: `openBookingPage` already waits for `.rbc-calendar` to be visible before the navigation starts.
- **[Risk] The hour of the picker is bounded by the application's operating hours.** → Mitigation: 09:00 is inside 08:00–19:30 by a wide margin, and the requirement states the invariant explicitly.
- **[Risk] The dropped "success message is hidden" assertion removes a check.** → Mitigation: the assertion was a toast-lifetime race and carried no information (D5); the conflict error message, the success message itself, and the cancellation assertions all remain.
- **[Trade-off] The specs now depend on the Indonesian label "Berikutnya".** → Accepted: the whole application is Indonesian-only, the label is already asserted by `src/components/CalendarToolbar.test.tsx`, and the capability spec now names it — a rename breaks the unit suite, the capability spec and the E2E job together.
- **[Trade-off] The suite no longer proves that a date far in the future is bookable.** → Accepted: the contract that matters (a future date, an operating hour) is covered by the requirements; the old 30/45-day offsets were an artefact of the broken navigation, not a user-facing guarantee.

## Migration Plan

1. Implement on a branch based on `ci/e2e-setup`: update `e2e/helpers.ts`, `e2e/booking.spec.ts`, `e2e/my-bookings.spec.ts` only.
2. Verify: `npm run typecheck`, `npm run test`, and `npm run test:e2e` against a local backend started with `bun run test:server` (`NODE_ENV=test`, a `.env.test` pointing at a database whose name contains "test") whose resources have all been set to `price_per_hour = 0`.
3. Commit as one logical commit (`test: align booking e2e specs with the calendar navigation`); do not push.
4. Rollback: revert that single commit; nothing outside `e2e/` changes.

## Open Questions

- None that change the specs, the approach or the task breakdown. The collision risk of D3 is recorded as a trade-off and can be revisited in a later change if it becomes a recurring source of flakes.
