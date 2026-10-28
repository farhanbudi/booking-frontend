## RENAMED Requirements

- FROM: `### Requirement: Admin nav link is shown only to admins`
- TO: `### Requirement: Admin nav menu is shown only to admins`

## MODIFIED Requirements

### Requirement: Admin nav menu is shown only to admins

The navigation bar SHALL display an "Admin" dropdown trigger — a control labelled "Admin" that acts as a menu button — only when the authenticated user has `role === "admin"`. Activating the trigger SHALL reveal a menu that exposes the "Kelola Ruangan" destination (the admin resources page) and the "Kelola Booking" destination (the admin bookings page). The trigger and its destinations SHALL NOT be rendered for any other state.

#### Scenario: Admin sees the Admin link
- **WHEN** the authenticated user has `role === "admin"`
- **THEN** an "Admin" menu trigger is visible in the navbar, and activating it reveals the "Kelola Ruangan" and "Kelola Booking" destinations

#### Scenario: Regular user does not see the Admin link
- **WHEN** the authenticated user has `role === "user"` or is unauthenticated
- **THEN** no "Admin" menu trigger and no admin destination is rendered in the navbar
