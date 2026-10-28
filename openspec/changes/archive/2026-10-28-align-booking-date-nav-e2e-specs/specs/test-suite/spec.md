## MODIFIED Requirements

### Requirement: End-to-end booking journey is verified

The test suite SHALL verify the complete user journey against a real running app and backend: an unauthenticated user hitting the home page is redirected to login, a registered user can log in, browse rooms, open the first room's booking page, move the booking calendar forward with the calendar's forward control ("Berikutnya") until it reaches a date in the future, create a booking on that date, observe the 409 conflict error when double-booking the same slot, and see and cancel the booking on the "Booking Saya" page. The start time used by the journey SHALL be an operating hour the application offers, so that the journey produces the same result regardless of the hour the suite is executed in.

#### Scenario: Unauthenticated access redirects to login
- **WHEN** an unauthenticated user opens the home page
- **THEN** the app redirects them to the login page

#### Scenario: Full booking lifecycle
- **WHEN** a logged-in user browses rooms, moves the booking calendar to a future date, books an available slot, attempts a double-booking of the same slot, then opens Booking Saya and cancels the booking
- **THEN** the booking succeeds, the double-booking attempt shows the conflict error, the booking appears in Booking Saya, and cancellation removes it

## ADDED Requirements

### Requirement: End-to-end suite is independent of the hour it runs

The end-to-end suite SHALL NOT let the wall-clock hour decide the outcome of a booking journey. The start time that an end-to-end booking selects SHALL always be an operating hour the application offers, so the same journey produces the same result no matter which hour the suite is executed in. The booking date SHALL always lie in the future, so the application's "start time has already passed" guard is never the reason a journey fails.

#### Scenario: Booking start time is always a selectable operating hour
- **WHEN** an end-to-end booking journey picks its start time
- **THEN** the picked time is an operating hour the application offers, whatever hour the suite happens to run at

#### Scenario: Booking date is always in the future
- **WHEN** an end-to-end booking journey picks its booking date
- **THEN** the picked date lies after the current date, so the "start time has already passed" guard never blocks the booking

### Requirement: End-to-end booking journey runs against a free test dataset

The end-to-end booking journey SHALL be executed against a test environment in which the resources it books are free. When a resource has a non-zero price, the application creates a payment instead of a booking and redirects to the payment page, so the journey's success state can never be reached. The environment SHALL therefore provide the test data for that requirement, and no end-to-end journey SHALL depend on a live payment provider.

#### Scenario: Booking a paid resource cannot reach the success state
- **WHEN** the end-to-end booking journey runs against a resource with a non-zero price
- **THEN** the journey cannot observe the booking success state, because the application redirects to a payment page instead

#### Scenario: Booking a free resource reaches the success state
- **WHEN** the end-to-end booking journey runs against a test environment whose resources are free
- **THEN** the booking is created, the success message is shown, and no payment provider is contacted
