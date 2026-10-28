## Why

The admin navigation in the shipped app is a dropdown, but the E2E suite and the `admin-panel` capability spec still describe a plain "Admin" link. As a result four admin E2E specs fail with "link not found" for a reason that has nothing to do with the product behaviour they are supposed to verify, and the E2E job introduced by `add-e2e-ci-workflow` can never go green. The app behaviour itself is intentional and already covered by `src/components/Navbar.test.tsx`, so the spec side is what has to be brought in line.

## What Changes

- The `admin-panel` capability requirement "Admin nav link is shown only to admins" is restated to describe the behaviour that is actually shipped: an "Admin" dropdown trigger that is rendered only for `role === "admin"`, which opens a menu with the "Kelola Ruangan" and "Kelola Booking" destinations.
- The E2E admin specs (`e2e/admin-panel.spec.ts`) and the shared admin login helper (`e2e/helpers/auth.ts`) are rewritten to drive the dropdown: the trigger is located by its `button` role, and the destinations by their `menuitem` role, instead of looking for a `link`.
- The shared `clearAuthState` helper reloads the page after clearing the stored token, so the app's in-memory auth state is dropped as well; without the reload the navbar would still show the previous (admin) user and the "a regular user has no admin entry point" assertion could not hold.
- The `test-suite` capability gains a requirement stating that the end-to-end suite covers the admin journey through the dropdown navigation, so the alignment is part of the suite's documented contract and cannot silently drift again.
- No application source change, no unit-test change, no dependency change, no new E2E assertion semantics: the specs keep asserting exactly the same user-visible outcomes (admin sees the admin entry point, a regular user does not, resources can be created and deactivated, all bookings are listed read-only, non-admins are redirected).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-panel`: the navbar requirement is restated from "Admin link" to the shipped "Admin dropdown menu" behaviour, including the two menu destinations and the admin-only visibility rule.
- `test-suite`: a new requirement documents that the end-to-end suite verifies the admin journey through the navbar dropdown (trigger by button role, destinations by menuitem role).

## Impact

- Affected code: `e2e/admin-panel.spec.ts`, `e2e/helpers/auth.ts` (E2E only).
- Affected specs: `openspec/specs/admin-panel/spec.md`, `openspec/specs/test-suite/spec.md` (updated at archive time from the deltas in this change).
- Unaffected: `src/**` (the navbar, its unit test, the admin pages), `playwright.config.ts`, `.github/workflows/**`, the backend repository, `package.json` dependencies.
- Effect on the E2E CI job: the four failing `admin-panel` specs become able to pass; no other spec's expectations change.
