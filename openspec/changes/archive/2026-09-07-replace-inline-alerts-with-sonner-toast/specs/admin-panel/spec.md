## MODIFIED Requirements

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