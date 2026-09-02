## Context

`src/pages/BookingPage.tsx` currently lets the user pick a date via a
`react-datepicker`, shows already-booked slots for that resource and date as a
text badge list (`<ul>` of red pills), and lets the user pick a start time via
a second `react-datepicker` configured for time-only and a duration via a
`<select>` of `[30, 60, 90, 120]` minutes. The submit path (`handleBook`) and
all backend interaction (`bookingApi.availability`, `bookingApi.create`,
`isPaidCreate`, `redirectToCheckout`, the 409 conflict message, and the 429
rate-limit countdown) are out of scope and MUST remain byte-for-byte the same
in behavior — see the booking-creation spec for the contract.

The badge list is purely a presentation of `bookedSlots` (the
`{ startTime, endTime }[]` array returned by `bookingApi.availability`). Its
only consumer is the visual presentation; nothing else in the file reads
`bookedSlots`. That means it can be replaced with a richer visual component
without touching the submit logic.

The current `date` state is a `Date` (with time zeroed via `startOfToday`), not
a `YYYY-MM-DD` string. The `bookingApi.availability` call already converts
with the existing `dateToISO(date)` helper, and `handleBook` already composes
the booking start from `date` + `startTime.getHours/Minutes()`. None of that
needs to change — only the shape of how `startTime` is mutated when the user
clicks/drags on the new calendar.

## Goals / Non-Goals

**Goals:**
- Swap the badge list for a single `react-big-calendar` `<Calendar>` component,
  restricted to the day view, showing one event block per booked slot at its
  actual start–end position.
- Make the calendar's built-in Back / Next / Today controls the only way to
  change the date on this page; remove the date `react-datepicker` and let the
  calendar drive `setDate` via `onNavigate`.
- Let the user click or drag on an empty area to populate the existing form's
  start time (and snap duration to the nearest of `[30, 60, 90, 120]`); the
  manual form below the calendar stays exactly as it is.
- Style the calendar so its toolbar and events match the project's design
  tokens (primary navy, danger red, accent-soft "today" highlight).
- Keep `handleBook`, `error`/`success`/rate-limit behavior, and Indonesian UI
  text untouched.

**Non-Goals:**
- Adding week/month views (backend `availability` only serves a single date).
- Frontend overlap validation or blocking clicks on already-booked cells.
- Two-way sync from the manual form back into a calendar highlight.
- Replacing the start-time `react-datepicker` or duration `<select>`; they
  stay below the calendar.
- Any backend or `bookingApi` change.
- Migrating `react-datepicker` itself; it stays for the start-time field.

## Decisions

**D1. Add `react-big-calendar@^1.15.0` + `date-fns@^4.1.0` and pin them.**
The user request specifies these as the stable pairing known to avoid the
TypeScript type conflicts seen in newer majors. We list both under
`dependencies` in `package.json` (not `devDependencies`) — `date-fns` is
already a transitive dependency via `react-datepicker@^9.1.0`, so promoting it
to a direct dependency is consistent and resolves to a single installed
version. The originally-proposed `date-fns@^3.6.0` was revised to `^4.1.0`
during implementation because `react-datepicker@^9.1.0` hard-depends on
`date-fns@^4.1.0`; the lower major would have produced a duplicate
`date-fns` install (failing the task 1.2 "single installed version"
verification). The `dateFnsLocalizer` API used in D3 is identical between
date-fns v3 and v4, so no code change is required. `@types/react-datepicker@^6.2.0`
was also removed in the same pass because `react-datepicker@9.x` ships its own
type definitions and the v6 types package pulled in its own `date-fns@^3`
copy. Fallback policy: if install or typecheck fails on these majors, stay on
them and resolve locally; do not silently bump.

**D2. Load the library stylesheet in `src/main.tsx`, before project styles.**
`react-big-calendar/lib/css/react-big-calendar.css` is imported on a line
*above* the existing `import "./styles/index.css"`. This guarantees the
project's CSS layer wins when overriding `.rbc-toolbar`, `.rbc-today`, etc.,
because cascading source order resolves last-wins for equal specificity.
The pre-existing `import "react-datepicker/dist/react-datepicker.css"` stays
where it is — it is unrelated to the calendar override block.

**D3. `dateFnsLocalizer` configured at module scope, not per-render.**
Constructed once at the top of `BookingPage.tsx` with `startOfWeek` returning
Monday-start weeks, `getDay`, and `{ "en-US": enUS }`. This is required by
`react-big-calendar` and is cheap. `culture="en-US"` on the `<Calendar>`
controls the library's own date-format strings only; it does not change the
Indonesian copy on the rest of the page.

**D4. `<Calendar>` configured with `defaultView="day"` and `views={["day"]}`.**
Both are set so the day view is the default *and* the only view the library
exposes. This is the user-request's hard rule — week/month are intentionally
inaccessible because `bookingApi.availability` is single-date.

**D5. Calendar navigation drives `setDate`; the date `react-datepicker` is removed.**
`onNavigate={(newDate) => setDate(startOfDay(newDate))}` is the single date
mutation point after this change. The date `react-datepicker` block is deleted
along with its imports / props that only it used (`showMonthDropdown`,
`yearDropdownItemNumber`, `addYears`). The existing availability effect
already keys off `[id, date]`, so navigating the calendar automatically
re-fetches `bookedSlots`. We zero the time on `newDate` (`new Date(newDate).setHours(0,0,0,0)`)
so the `Date` shape stays consistent with `startOfToday()` — this matters
because `handleBook` later uses `date.getFullYear/Month/Date` to compose the
booking start.

**D6. `handleSelectSlot` snaps duration to the nearest of `[30, 60, 90, 120]`.**
Single click → `end` equals `start` (calendar treats a click as a zero-length
selection), so the duration snapshot returns 30 minutes — the minimum. Drag →
`(end - start)` in minutes, then `reduce` over the allowed list to pick the
closest. The start-time field is set by composing a `Date` whose hours/minutes
come from `slotInfo.start`, mirroring how `handleBook` later reads them back.
We do not mutate `date` from `slotInfo` — date is a calendar-level concern.

**D7. Manual form below the calendar is preserved verbatim.**
The "Jam mulai" `react-datepicker` and the "Durasi" `<select>` stay
byte-for-byte (labels, options, classes). After a calendar selection, the
user can still hand-edit either field; nothing re-syncs them back into the
calendar. This is intentional and documented in the spec ("manual form entry
still works after a calendar selection").

**D8. Override block appended to `src/styles/index.css`.**
A single appended block targets `.rbc-toolbar button`, `.rbc-toolbar button:hover`,
`.rbc-toolbar button.rbc-active`, `.rbc-today`, and `.rbc-event`. Tailwind
`@apply` is used where it lines up with design tokens
(`border-line`, `text-ink`, `bg-primary`, `border-primary`, `text-white`);
the `eventPropGetter` `style.backgroundColor = "#C0392B"` matches the
`danger` token in `tailwind.config.js`. The `.rbc-today` rule uses the hex
`#f7f3e9` (a soft accent tint) because `@apply bg-accent` would be too
saturated for a date highlight.

## Risks / Trade-offs

- [Risk] `react-big-calendar@1.x` peer-depends on `react@^16 || ^17` in some
  npm metadata, but in practice works with React 18; if install fails, fall
  back to `--legacy-peer-deps`. → Mitigation: keep versions pinned to the
  known-good pair; if `npm install` errors, retry with
  `npm install --legacy-peer-deps` rather than bumping versions silently.

- [Risk] Default `react-big-calendar` toolbar labels are in English ("Today",
  "Next", "Previous", "Day"). The user-request explicitly keeps these in
  English (only the *project's* UI copy must stay Indonesian), but a reader
  might assume localization is missing. → Mitigation: leave as-is and document
  in tasks.md as an intentional carve-out.

- [Risk] `react-big-calendar`'s CSS expects its own font stack; without
  overrides it will look heavier than the project's Inter/Space Grotesk pair.
  → Mitigation: the override block at the bottom of `index.css` applies
  `font-medium text-sm` to toolbar buttons and `font-size: 0.75rem` to events.

- [Risk] Removing the date `react-datepicker` removes `minDate=today` /
  `maxDate=today+1y` validation on date selection. `react-big-calendar`'s
  toolbar doesn't enforce either. → Mitigation: not in scope per the
  user-request (no backend change, no new endpoint). Existing behavior is
  unchanged when the user picks via Back/Next/Today; outside-range picks are
  a documented accepted trade-off (matches the user's "ATURAN KETAT"
  non-goal of changing the backend).

- [Risk] A click on the calendar (no drag) gives `start === end`, snapping
  duration to 30 minutes. A user expecting "the smallest selectable unit" may
  be surprised. → Mitigation: the spec already accepts this; the start-time
  picker below remains a fully manual fallback.

## Migration Plan

No data migration. Deploy steps:

1. `npm install` (adds `react-big-calendar` and `date-fns`).
2. Apply the source changes (CSS import, override block, page rewrite).
3. Run `npm run build` (typecheck + Vite build) — this is the project's
   verification command per `AGENTS.md`.
4. Run `npm run test` to confirm existing unit/component tests still pass;
   if any test asserts on the old badge list or the date `react-datepicker`,
   update those expectations to the new calendar (the apply phase will flag
   this in tasks.md).
5. Run `npm run test:e2e` against the test backend to confirm the calendar
   page loads end-to-end and Back/Next/Today still trigger availability
   refetches.

Rollback: revert the four touched files and `npm uninstall` the two new
packages. No backend involvement, so rollback is local to the frontend.

## Open Questions

None. All decisions that would have changed the spec or scope were either
resolved above or explicitly out-of-scope per the user-request.