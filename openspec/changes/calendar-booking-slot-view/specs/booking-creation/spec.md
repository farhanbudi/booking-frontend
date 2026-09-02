## Purpose

Lets a logged-in user reserve a resource for a chosen date, start time, and
duration, while seeing the day's existing bookings as a visual day calendar and
being able to start a booking by selecting a free time window on that calendar.
The submit, validation, and error-handling flow described elsewhere in the
application remains unchanged.

## ADDED Requirements

### Requirement: Booking page renders a visual day calendar of existing bookings
The booking page SHALL display the existing bookings for the currently selected
resource and date as a visual day calendar. Each existing booking SHALL appear
as a single event block on the calendar positioned at its actual start and end
time within that day. The calendar SHALL be restricted to a single-day view and
SHALL NOT offer a week or month view.

#### Scenario: Booked slots render as positioned events
- **WHEN** the booking page loads for a resource and date that has existing bookings
- **THEN** the page shows a day calendar with one event block per existing booking, positioned at that booking's start and end time

#### Scenario: Day with no bookings shows empty calendar
- **WHEN** the booking page loads for a resource and date with no existing bookings
- **THEN** the day calendar is shown with no event blocks and the rest of the booking form remains usable

#### Scenario: Calendar exposes only the day view
- **WHEN** the booking page renders the calendar
- **THEN** no week or month view is available to the user

### Requirement: Calendar date navigation is the single source of date changes
The booking page SHALL expose calendar date navigation controls (such as
"Back", "Next", and "Today"). Using any of these controls SHALL change the
currently selected date and SHALL trigger a refresh of the bookings shown on
the calendar for the new date. A separate manual date input for the same
purpose SHALL NOT be present on the page.

#### Scenario: Next day control advances the date and refreshes bookings
- **WHEN** the user clicks the calendar's "Next" control while viewing a date that has bookings
- **THEN** the calendar moves to the following day and the event blocks shown reflect the bookings of that new day

#### Scenario: Today control returns to today and refreshes bookings
- **WHEN** the user clicks the calendar's "Today" control while viewing a different date
- **THEN** the calendar moves to today's day and the event blocks shown reflect the bookings of today

### Requirement: Selecting a free time window populates the booking form
The booking page SHALL allow the user to select a free time window on the
calendar by clicking or dragging on empty calendar area. Completing such a
selection SHALL set the booking form's start time to the selection's start
and SHALL set the duration to the nearest allowed duration that fits the
selection. The user's existing ability to enter or change the start time and
duration by hand in the form below the calendar SHALL be preserved.

#### Scenario: Click on free area sets start time
- **WHEN** the user clicks on an empty area of the day calendar
- **THEN** the booking form's start time field is set to the time of the click

#### Scenario: Drag on free area sets start time and snaps duration
- **WHEN** the user drags across an empty area of the day calendar for a window of N minutes
- **THEN** the booking form's start time is set to the drag's start and the duration is set to the allowed duration closest to N minutes

#### Scenario: Manual form entry still works after a calendar selection
- **WHEN** the user has set the start time and duration by selecting on the calendar and then edits those fields by hand
- **THEN** the booking form accepts the hand-edited values

### Requirement: Submitting the booking is unchanged
The booking page SHALL submit the booking using the existing form fields and
the existing submission behavior. Existing-booking visual presentation and
selection interaction SHALL NOT alter what is sent, how it is validated, or
how errors and successes are surfaced.

#### Scenario: Form submission still creates a booking
- **WHEN** the user submits the booking form with valid resource, date, start time, and duration (whether set by calendar selection or by hand)
- **THEN** a booking is created through the existing booking submission flow

#### Scenario: Backend conflict error still surfaces
- **WHEN** the user submits the booking form and the backend responds with a conflict for the selected time
- **THEN** the existing conflict error message is shown and the form remains editable

### Requirement: Calendar styling matches the application's design tokens
The booking page's calendar controls and event blocks SHALL be styled to be
visually consistent with the application's existing design tokens. The
calendar's default stylesheet SHALL be loaded in a way that allows project
styles to override it.

#### Scenario: Calendar toolbar matches project buttons
- **WHEN** the booking page renders the calendar
- **THEN** the calendar's toolbar buttons share the same border, font, and color treatment as other buttons in the application

#### Scenario: Booked event blocks use the project's danger color
- **WHEN** the calendar renders an existing booking as an event block
- **THEN** the event block uses the same red used by the application's "danger" design token

### Requirement: User-facing copy remains Indonesian
All user-facing copy on the booking page SHALL remain in Indonesian. Any
locale configured for the calendar library SHALL affect only the calendar's
internal date formatting and SHALL NOT introduce English UI strings on the
page.

#### Scenario: Indonesian labels around the calendar
- **WHEN** the booking page is rendered
- **THEN** the surrounding labels, headings, and messages are in Indonesian