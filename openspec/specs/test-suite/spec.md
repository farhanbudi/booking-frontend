## Purpose

Provides an automated test suite for the booking frontend so that auth flows, booking logic, and routing behavior are verified by machine-checkable tests at unit/component level and end-to-end, preventing silent regressions.

## ADDED Requirements

### Requirement: Test infrastructure is runnable

The project SHALL provide an automated unit/component test runner and an end-to-end test runner, each invocable through npm scripts, that can be executed in a clean checkout after dependency installation. The unit/component tests SHALL run against a jsdom-like DOM environment without requiring the backend; the end-to-end tests SHALL run against the real application served by Vite and the real backend at the configured API base URL.

#### Scenario: Run unit/component tests
- **WHEN** a developer runs `npm run test`
- **THEN** the unit/component test suite executes and reports pass/fail per test case, exiting non-zero if any test fails

#### Scenario: Run end-to-end tests
- **WHEN** a developer runs `npm run test:e2e`
- **THEN** the E2E suite boots the app, exercises the configured user journeys against the real backend, and exits non-zero if any journey fails

### Requirement: API client behavior is verified

The test suite SHALL verify the behavior of the fetch-based API layer: the Bearer token is attached to requests when a token exists in `localStorage`, the `Content-Type: application/json` header is always sent, non-OK responses surface the backend's `{ error }` message, and a missing/invalid JSON body produces a fallback Indonesian error message.

#### Scenario: Bearer token attached when logged in
- **WHEN** `localStorage` contains a token and an API method is invoked
- **THEN** the outgoing request includes an `Authorization: Bearer <token>` header

#### Scenario: Error message extracted from response body
- **WHEN** the backend responds with a non-OK status and a JSON body `{ "error": "..." }`
- **THEN** the thrown error message equals the backend's error string

#### Scenario: Fallback error message
- **WHEN** the backend responds with a non-OK status and a body that is not valid JSON
- **THEN** the thrown error message is the fallback Indonesian message containing the HTTP status

### Requirement: Auth context behavior is verified

The test suite SHALL verify `AuthProvider` behavior: on mount with a stored token it restores the user via `/auth/me`; on mount without a token it finishes loading without a user; an invalid/expired token is cleared from `localStorage`; `login` stores the returned token and sets the user; `register` creates the account and logs the user in; `logout` removes the token and clears the user.

#### Scenario: User restored from stored token
- **WHEN** the app mounts with a valid token in `localStorage` and `/auth/me` returns a user
- **THEN** the user is set and the loading flag becomes false

#### Scenario: Invalid token cleared
- **WHEN** the app mounts with a token in `localStorage` and `/auth/me` rejects
- **THEN** the token is removed from `localStorage` and the user remains null

#### Scenario: Logout clears session
- **WHEN** a logged-in user invokes logout
- **THEN** the token is removed from `localStorage` and the user becomes null

### Requirement: Route protection is verified

The test suite SHALL verify that protected routes redirect unauthenticated users to `/login`, show the loading state while auth is restoring, and render the protected content for authenticated users.

#### Scenario: Unauthenticated redirect
- **WHEN** an unauthenticated user visits a protected route
- **THEN** they are redirected to `/login`

#### Scenario: Authenticated access
- **WHEN** an authenticated user visits a protected route
- **THEN** the protected page content is rendered

### Requirement: Login page behavior is verified

The test suite SHALL verify the login page renders the form with email and password inputs, submits to the auth flow, navigates to the home page on success, displays the backend error message on failure, and disables the submit button while submitting.

#### Scenario: Successful login navigates home
- **WHEN** valid credentials are submitted
- **THEN** the user is logged in and the app navigates to the home page

#### Scenario: Failed login shows error
- **WHEN** the backend rejects the credentials
- **THEN** an error message is shown and the user stays on the login page

### Requirement: Register page behavior is verified

The test suite SHALL verify the register page collects name, email, and password, enforces the password minimum length constraint, submits to the register flow, navigates to the home page on success, and shows an error message on failure.

#### Scenario: Successful registration navigates home
- **WHEN** a valid name, email, and password are submitted
- **THEN** the account is created, the user is logged in, and the app navigates to the home page

#### Scenario: Failed registration shows error
- **WHEN** the backend rejects the registration
- **THEN** an error message is shown and the user stays on the register page

### Requirement: Resources page behavior is verified

The test suite SHALL verify the resources page renders a loading indicator while fetching, lists fetched resources as links to their booking pages, shows the empty state when no resources exist, and shows the error message when the fetch fails.

#### Scenario: Resources listed
- **WHEN** the resource list is fetched successfully
- **THEN** each resource is rendered with its name and capacity and links to `/resources/<id>`

#### Scenario: Empty state
- **WHEN** the fetched resource list is empty
- **THEN** the empty-state message is displayed

#### Scenario: Fetch failure
- **WHEN** the resource list fetch rejects
- **THEN** the backend error message is displayed

### Requirement: Booking page behavior is verified

The test suite SHALL verify the booking page loads the resource detail and booked slots for the selected date, shows loading and empty-slot states, renders booked slots with their time ranges, creates a booking from the selected start time and duration, displays the success message, refreshes the slot list after a successful booking, and displays the backend error message when creation fails (including the double-booking 409 conflict).

#### Scenario: Booked slots rendered
- **WHEN** the availability endpoint returns booked slots for the selected date
- **THEN** each slot is rendered with its formatted start and end time

#### Scenario: Empty slots state
- **WHEN** the availability endpoint returns no slots
- **THEN** a message stating all slots are free is displayed

#### Scenario: Booking succeeds
- **WHEN** the user submits a booking with valid start time and duration
- **THEN** the booking is created, a success message is displayed, and the booked-slot list is refreshed

#### Scenario: Booking conflict shows backend error
- **WHEN** the backend rejects the booking with a conflict (double-booking)
- **THEN** the backend's error message is displayed and no success message appears

### Requirement: My bookings page behavior is verified

The test suite SHALL verify the bookings page renders a loading state while fetching, lists the user's bookings with formatted date-time ranges and status labels, shows the empty state when there are no bookings, shows the error message when the fetch fails, and supports cancelling a non-cancelled booking with the list refreshed afterward.

#### Scenario: Bookings listed with status labels
- **WHEN** the user's bookings are fetched successfully
- **THEN** each booking renders its date-time range and an Indonesian status label

#### Scenario: Booking cancelled
- **WHEN** the user clicks cancel on a non-cancelled booking and the backend accepts
- **THEN** the booking list is refreshed and the cancelled booking no longer shows a cancel button

### Requirement: Navbar behavior is verified

The test suite SHALL verify the navbar renders the brand link, shows login/register links when logged out, shows navigation links plus the user's name and a logout button when logged in, and navigates to `/login` after logout.

#### Scenario: Logged-out navbar
- **WHEN** there is no authenticated user
- **THEN** the navbar shows Masuk and Daftar links and no user-specific links

#### Scenario: Logged-in navbar and logout
- **WHEN** a user is authenticated
- **THEN** the navbar shows Ruangan, Booking Saya, the user's name, and a Keluar button; clicking Keluar logs the user out and navigates to `/login`

### Requirement: End-to-end booking journey is verified

The test suite SHALL verify the complete user journey against a real running app and backend: an unauthenticated user hitting the home page is redirected to login, a registered user can log in, browse rooms, open a room's booking page, create a booking, observe the 409 conflict error when double-booking the same slot, and see and cancel the booking on the "Booking Saya" page.

#### Scenario: Unauthenticated access redirects to login
- **WHEN** an unauthenticated user opens the home page
- **THEN** the app redirects them to the login page

#### Scenario: Full booking lifecycle
- **WHEN** a logged-in user browses rooms, books an available slot, attempts a double-booking of the same slot, then opens Booking Saya and cancels the booking
- **THEN** the booking succeeds, the double-booking attempt shows the conflict error, the booking appears in Booking Saya, and cancellation removes it
