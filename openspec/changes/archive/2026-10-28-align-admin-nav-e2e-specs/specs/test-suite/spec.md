## ADDED Requirements

### Requirement: End-to-end admin journey is verified

The end-to-end suite SHALL verify the admin journey against a real running app and backend: an administrator logs in, reaches the admin resources page and the admin bookings page through the navbar admin dropdown, creates a resource, deactivates a resource, and sees the read-only list of all bookings, while a regular user sees no admin entry point and is redirected away from the admin routes. The suite SHALL address the dropdown trigger and its destinations by their accessible role (menu trigger and menu entries) so that the specs describe the shipped navigation instead of an earlier link-based navigation.

#### Scenario: Admin reaches the admin pages through the dropdown
- **WHEN** an administrator logs in and activates the navbar admin dropdown
- **THEN** the admin resources page and the admin bookings page are reachable from the dropdown destinations

#### Scenario: Regular user has no admin entry point
- **WHEN** a regular user is logged in
- **THEN** the navbar exposes no admin dropdown trigger, and a direct visit to an admin route redirects away from it
