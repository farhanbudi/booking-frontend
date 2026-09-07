## Purpose

Lets users with `role === "admin"` manage resources (rooms) and view all bookings across every user through dedicated pages guarded by an admin-only route.

## Requirements

### Requirement: Admin routes are role-gated

The application SHALL expose two routes, `/admin/resources` and `/admin/bookings`, that are reachable only when the authenticated user has `role === "admin"`. Unauthenticated visitors SHALL be redirected to `/login`. Authenticated users whose role is not `"admin"` SHALL be redirected to `/` (the resources list).

#### Scenario: Admin reaches the admin resources page
- **WHEN** an authenticated user with `role === "admin"` navigates to `/admin/resources`
- **THEN** the `AdminResourcesPage` renders

#### Scenario: Non-admin is redirected away from admin routes
- **WHEN** an authenticated user with `role === "user"` navigates to `/admin/resources` or `/admin/bookings`
- **THEN** the user is redirected to `/`

#### Scenario: Unauthenticated visitor is sent to login
- **WHEN** a visitor with no authenticated user navigates to `/admin/resources` or `/admin/bookings`
- **THEN** the visitor is redirected to `/login`

### Requirement: Admin nav link is shown only to admins

The navigation bar SHALL display an "Admin" link that links to the admin landing page (the admin resources page) only when the authenticated user has `role === "admin"`. The link SHALL NOT be rendered for any other state.

#### Scenario: Admin sees the Admin link
- **WHEN** the authenticated user has `role === "admin"`
- **THEN** an "Admin" link is visible in the navbar

#### Scenario: Regular user does not see the Admin link
- **WHEN** the authenticated user has `role === "user"` or is unauthenticated
- **THEN** no "Admin" link is rendered in the navbar

### Requirement: Admin can list resources with their active status

The admin resources page SHALL display every resource (including those whose `isActive` is false) using the existing `resourceApi.list()`. Each row SHALL display the resource name, capacity, location, and an Indonesian badge indicating whether the resource is "Aktif" or "Nonaktif" based on the `isActive` field.

#### Scenario: Listing shows both active and inactive resources
- **WHEN** the admin resources page loads
- **THEN** every resource from the API is rendered with an active/non-active badge matching the `isActive` field

### Requirement: Admin can create a resource

The admin resources page SHALL provide a form (toggled by a button) accepting `name` (required text), `capacity` (required number, minimum 1), and `location` (optional text). Submitting the form SHALL call `resourceApi.create` with the entered values. On success, the resource list SHALL be refreshed and a short Indonesian success message SHALL be displayed. On backend error, the form SHALL display the backend's `{ error }` message using the existing danger error style.

#### Scenario: Valid create submission refreshes the list
- **WHEN** the admin submits the create form with a valid `name`, `capacity >= 1`, and optional `location`
- **THEN** `resourceApi.create` is called with those values, the resource list refreshes, and a success message is shown

#### Scenario: Invalid input shows an error
- **WHEN** the admin submits the create form with `capacity < 1` or with an empty `name`
- **THEN** no API call is made and an Indonesian validation error message is shown in the danger error style

### Requirement: Admin can edit a resource

The admin resources page SHALL provide an Edit action per row that opens the same form pre-filled with the resource's current values. Saving the form SHALL call `resourceApi.update` with the changed fields and refresh the resource list on success, displaying a short Indonesian success message. Backend errors SHALL be surfaced using the existing danger error style.

#### Scenario: Editing pre-fills and saves
- **WHEN** the admin clicks "Edit" on a row, modifies the form, and submits
- **THEN** `resourceApi.update` is called for that resource and the list refreshes with the updated values

### Requirement: Admin can deactivate a resource

The admin resources page SHALL provide a "Nonaktifkan" action per row that calls `resourceApi.remove`, which performs a soft-delete (sets `isActive` to false) on the backend. After successful deactivation, the resource list SHALL be refreshed and the affected row SHALL now show the "Nonaktif" badge.

#### Scenario: Deactivating changes the badge
- **WHEN** the admin clicks "Nonaktifkan" on an active resource row
- **THEN** `resourceApi.remove` is called, the list refreshes, and that resource now displays the "Nonaktif" badge

### Requirement: Admin can view all bookings read-only

The admin bookings page SHALL display every booking from every user, fetched via `GET /bookings/admin/all` through `bookingApi.listAll`. Each row SHALL show the booking's start–end time and the booking status using the same badge styling as the existing `MyBookingsPage`. The page SHALL be read-only: no create, edit, or cancel actions are exposed. Because the booking response only contains `resourceId` and `userId`, the page SHALL display those IDs verbatim with a code comment marking the missing join as a TODO.

#### Scenario: Admin sees bookings from all users
- **WHEN** an admin opens `/admin/bookings`
- **THEN** every booking returned by `bookingApi.listAll` is rendered with its time range and status badge

#### Scenario: No edit or cancel actions on the admin view
- **WHEN** the admin bookings page is rendered
- **THEN** no edit, cancel, or delete buttons are present on any row

### Requirement: Admin pages surface feedback through toasts
Both admin pages (`/admin/resources` and `/admin/bookings`) SHALL
surface load errors, submit errors, submit successes, and
deactivation results through the app-wide toast notification layer
instead of through inline `<p>` alert blocks.

#### Scenario: Admin bookings list load failure surfaces as a toast
- **WHEN** `bookingApi.listAll()` rejects on the admin bookings page
- **THEN** a red toast with the error message appears in the top-right
  corner and no inline red paragraph is rendered inside the page

#### Scenario: Admin resource create success surfaces as a toast
- **WHEN** the admin submits the create-resource form successfully
- **THEN** a green toast with the message
  `"Ruangan berhasil ditambahkan."` appears in the top-right corner,
  the inline green paragraph is not rendered, and the form closes

#### Scenario: Admin resource edit success surfaces as a toast
- **WHEN** the admin submits the edit-resource form successfully
- **THEN** a green toast with the message
  `"Ruangan berhasil diperbarui."` appears in the top-right corner,
  the inline green paragraph is not rendered, and the form closes

#### Scenario: Admin resource validation error surfaces as a toast
- **WHEN** the admin submits the create/edit-resource form with an
  empty name or invalid capacity
- **THEN** a red toast with the matching validation message
  (for example `"Nama ruangan wajib diisi."`) appears in the top-right
  corner and the inline red paragraph is not rendered

#### Scenario: Admin resource deactivation surfaces as a toast
- **WHEN** the admin clicks "Nonaktifkan" on a resource and the call
  succeeds
- **THEN** a green toast with the message
  `"Ruangan \"<nama>\" berhasil dinonaktifkan."` appears in the
  top-right corner and the inline green paragraph is not rendered

#### Scenario: Admin resource deactivation failure surfaces as a toast
- **WHEN** the admin clicks "Nonaktifkan" on a resource and the call
  rejects
- **THEN** a red toast with the backend error message appears in the
  top-right corner and no inline red paragraph is rendered inside the
  page
