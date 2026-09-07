## Purpose

Provides a single, app-wide toast notification surface so every page
surfaces errors and successes through the same floating component,
instead of duplicating per-page inline alert blocks that push surrounding
content down.

## ADDED Requirements

### Requirement: Single mounted Toaster at the React tree root
The application SHALL mount exactly one `<Toaster />` from the toast
library at the React tree root, inside the routing and authentication
providers, so every page can trigger a toast without owning its own
container.

#### Scenario: Toaster is mounted once at the app root
- **WHEN** the application boots
- **THEN** the rendered React tree contains exactly one `<Toaster />`
  node, positioned top-right, with rich colors enabled

#### Scenario: Multiple Toaster instances are not allowed
- **WHEN** no page or component mounts an additional `<Toaster />`
- **THEN** toasts never appear twice and no warning about duplicate
  Toasters is raised in the console

### Requirement: Errors and successes surface as toasts instead of inline alerts
Every page that previously rendered an inline red error paragraph
(`bg-red-50 border border-red-200 rounded-lg`) or an inline green
success paragraph (`bg-green-50 text-green-700 border border-green-200
rounded-lg`) SHALL surface those messages through the toast layer
instead. Pages SHALL NOT render those inline alert paragraphs for
error or success feedback.

#### Scenario: Login failure shows a red toast, not an inline alert
- **WHEN** the user submits the login form with an invalid password
- **THEN** a red toast appears in the top-right corner containing the
  backend error message, no inline red paragraph is rendered inside
  the form, and the toast disappears automatically after a few seconds

#### Scenario: Booking success shows a green toast, not an inline alert
- **WHEN** a free booking is created successfully
- **THEN** a green toast appears in the top-right corner with the
  success message, no inline green paragraph is rendered inside the
  booking form, and the toast disappears automatically after a few
  seconds

### Requirement: Toast text preserves existing Indonesian copy
Each toast SHALL display the same Indonesian string that the inline
alert it replaces previously displayed. Toasts SHALL NOT reword
existing user-facing messages.

#### Scenario: Existing error text is preserved verbatim
- **WHEN** a code path used to call `setError("Login gagal")`
- **THEN** after migration the same code path calls the toast with the
  exact string `"Login gagal"`

### Requirement: Toasts only fire from event handlers or async callbacks
Toasts SHALL be triggered only from event handlers (form submit, button
click), from `.then()` / `.catch()` blocks, or from `try` / `catch`
blocks of async actions. Toasts SHALL NOT be triggered from the top
level of a render function or any code path that runs on every render.

#### Scenario: A toast does not fire on a passive render
- **WHEN** a component re-renders for any reason (state change, parent
  re-render, route change)
- **THEN** no additional toast is queued as a side effect of that
  re-render

### Requirement: Existing state used outside of alerts stays in place
When a page's `error` or `success` state is read by logic other than
the alert block (for example: a submit disable flag, a rate-limit
countdown, or a derived `isBlocked` flag), the state SHALL remain in
place; only the JSX alert block is removed and the mutation calls are
replaced by toast calls.

#### Scenario: Booking page rate-limit countdown still drives the submit button
- **WHEN** the booking API responds with HTTP 429
- **THEN** the submit button is still disabled while the countdown is
  greater than zero, the countdown text is still rendered, and the
  error itself is surfaced as a toast instead of an inline alert