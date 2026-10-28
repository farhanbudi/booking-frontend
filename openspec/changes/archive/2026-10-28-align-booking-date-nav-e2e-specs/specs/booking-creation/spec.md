## MODIFIED Requirements

### Requirement: Calendar date navigation is the single source of date changes

The booking page SHALL expose calendar date navigation controls using the application's Indonesian wording: "Sebelumnya" (previous), "Berikutnya" (next) and "Hari ini" (today). Using any of these controls SHALL change the currently selected date and SHALL trigger a refresh of the bookings shown on the calendar for the new date. Because the calendar is restricted to a single-day view, the "Berikutnya" control SHALL advance the selected date by exactly one day per activation. A separate manual date input for the same purpose SHALL NOT be present on the page.

#### Scenario: Next day control advances the date and refreshes bookings
- **WHEN** the user clicks the calendar's "Berikutnya" control while viewing a date that has bookings
- **THEN** the calendar moves to the following day and the event blocks shown reflect the bookings of that new day

#### Scenario: Today control returns to today and refreshes bookings
- **WHEN** the user clicks the calendar's "Hari ini" control while viewing a different date
- **THEN** the calendar moves to today's day and the event blocks shown reflect the bookings of today
