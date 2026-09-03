## Why

The booking page currently shows already-booked slots as a plain text/badge list
("09:00–10:00", etc.) alongside a separate `<input type="time">` start picker and
a duration `<select>`. This forces users to mentally translate between a textual
list of busy intervals and an unrelated time picker, which is error-prone and
gives no spatial sense of how busy a day actually is. Replacing the badge list
with a full visual day-calendar (powered by `react-big-calendar`) lets users see
free vs. busy time at a glance, and lets them click/drag on a free window to
auto-populate the existing booking form — without changing the backend or the
existing submit/validation flow.

## What Changes

- Add `react-big-calendar` and `date-fns` (versions pinned to known-compatible
  pair) as runtime dependencies.
- Import `react-big-calendar`'s default stylesheet once, before the project's own
  stylesheet, in `src/main.tsx` so project tokens can override library styles.
- In `src/pages/BookingPage.tsx`:
  - Configure a `dateFnsLocalizer` (week starts Monday, `en-US` locale for the
    library's internal date formatting).
  - Replace the "Slot yang sudah terisi" badge list with a `Calendar` component
    constrained to the **day** view (no week/month).
  - Wire calendar date navigation (Back/Next/Today) through the existing `date`
    state via `onNavigate`; remove the now-redundant manual `<input type="date">`
    above the calendar.
  - Add a `handleSelectSlot` callback so clicking or dragging on empty time
    populates the existing `startTime` and `duration` form fields.
  - Keep the existing `<input type="time">` / `<select>` form below the calendar
    unchanged, including `handleBook`, `error`, and `success` behavior.
- Add a small CSS block at the end of `src/styles/index.css` to override
  `.rbc-toolbar` / `.rbc-today` / `.rbc-event` so the calendar matches the
  project's design tokens.
- Backend, `bookingApi.availability`, the booking submission flow, and all
  Indonesian UI copy remain unchanged.

## Capabilities

### New Capabilities

- `booking-creation`: Frontend behavior for creating a new booking on
  `src/pages/BookingPage.tsx` — selecting resource + date + start time +
  duration, viewing existing bookings as a visual day calendar, and submitting
  the booking. The new visual calendar replaces the prior badge list.

### Modified Capabilities

<!-- No existing spec is being modified. The only pre-existing booking-related
     capability, `payment-booking`, is unaffected: booking creation, calendar
     selection, and overlap-error UX are outside its scope. Leaving empty. -->

## Impact

- **Dependencies**: `react-big-calendar@^1.15.0`, `date-fns@^4.1.0` added to
  `package.json` `dependencies`.
- **Source files**:
  - `package.json`
  - `src/main.tsx` (one extra stylesheet import line)
  - `src/pages/BookingPage.tsx` (calendar replaces badge list; new localizer and
    `handleSelectSlot`; manual date input removed)
  - `src/styles/index.css` (append-only override block)
- **Backend / API**: none. `bookingApi.availability(resourceId, date)` shape and
  the single-date contract are preserved.
- **Locale / i18n**: Indonesian UI copy unchanged. `react-big-calendar` is
  configured with `culture="en-US"` only for its internal date formatting; no
  English UI strings are introduced.
- **Out of scope**: week/month views, frontend overlap validation, two-way
  sync between manual form fields and the calendar highlight, any other
  calendar library, backend changes.