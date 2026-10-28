## Context

See `proposal.md` — "Why". Facts that shape the approach:

**The shipped navbar (`src/components/Navbar.tsx`).** For `role === "admin"` the navbar renders a `<button type="button" aria-haspopup="menu" aria-expanded={adminOpen}>` whose accessible name is exactly `Admin` (the `▾` glyph is `aria-hidden`). Clicking it renders a `<div role="menu">` containing two `<Link role="menuitem">` elements: `Kelola Ruangan` → `/admin/resources` and `Kelola Booking` → `/admin/bookings`. Because the links carry `role="menuitem"`, they are **not** exposed with the `link` role, and they are not rendered at all while the menu is closed.

**The unit test already asserts the dropdown.** `src/components/Navbar.test.tsx` looks the trigger up with `getByRole("button", { name: /Admin/ })` and asserts the menu items by text. No unit test asserts an "Admin" link, so the app side is consistent and needs no change.

**The stale E2E expectations.** `e2e/helpers/auth.ts:22` and `e2e/admin-panel.spec.ts` (lines 27, 31, 38, 68, 97, 98) all look for `getByRole("link", { name: "Admin" })`. Because the admin entry point is a button whose name only exists as an `aria-expanded` toggle, every one of those lookups fails with a timeout, which is exactly the failure observed in the `add-e2e-ci-workflow` local run.

**Playwright role matching.** `getByRole(role, { name })` matches the accessible name case-insensitively as a substring by default, so `getByRole("button", { name: "Admin" })` resolves uniquely to the navbar trigger, and `getByRole("menuitem", { name: "Kelola Ruangan" })` resolves uniquely to the first destination. The menu must be opened before the menu items exist.

## Goals / Non-Goals

**Goals:**
- Make the admin E2E specs describe the navigation that is actually shipped, without changing any user-visible behaviour.
- Keep every existing assertion outcome: the same pages are reached, the same data is created/deactivated, the same read-only booking list is verified, the same redirect for non-admins is verified.
- Keep the change confined to `e2e/` so that the product code, the unit suite and the CI workflow stay untouched.

**Non-Goals:**
- Changing `src/components/Navbar.tsx` or any other application source. The dropdown is intentional, unit-tested, and locally usable.
- Changing what the admin pages do (resource creation, deactivation, read-only booking list) — only how the specs *navigate* to them.
- Renaming the "Kelola Ruangan" / "Kelola Booking" copy, adding English labels, or adding `aria-label`s to the app purely to make the specs easier to write.
- Fixing the booking-date navigation drift — that is the separate change `align-booking-date-nav-e2e-specs`.

## Decisions

**D1 — The specs address the dropdown by role, not by a CSS class or a test id.**
The trigger is located with `getByRole("button", { name: "Admin" })` and the destinations with `getByRole("menuitem", { name: "Kelola Ruangan" | "Kelola Booking" })`. *Alternatives considered:* (a) locate the items by visible text with `getByText("Kelola Ruangan")` — works, but text alone does not express that they are menu entries and would also match any future duplicate copy; (b) address the app with `data-testid` — adds product markup purely for tests, which this project has never done; (c) keep the roles but add `aria-label`s to the app links — unnecessary, the visible text already is the accessible name.

**D2 — A shared helper owns the "open the admin menu and pick a destination" step.**
`e2e/helpers/auth.ts` already owns "log in as the admin account", and it currently ends with the failing `getByRole("link", { name: "Admin" })` assertion; it is replaced by an assertion on the dropdown trigger. A new exported helper `openAdminMenu(page, item)` takes the destination name (`"Kelola Ruangan"` or `"Kelola Booking"`), clicks the trigger and then clicks the matching menu item, so the "open first, then choose" knowledge lives in exactly one place. All four admin specs call it instead of repeating the click sequence. *Alternatives considered:* (a) inline the two clicks in every spec — repeats the same knowledge in four places and is the reason the drift stayed invisible; (b) a `page` fixture with an `adminMenu` helper object — more machinery than the suite needs; (c) two separate helpers, one that opens and one that navigates — rejected, every caller wants "open and go to X" in one call.

**D3 — The "admin sees the entry point / regular user does not" spec keeps its shape and only changes the role it looks for.**
The first admin spec asserts `getByRole("button", { name: "Admin" })` is visible for the admin and has count 0 for a regular user. The count assertion is what proves the admin entry point is admin-only, and it is the same behaviour the `admin-panel` capability requires. *Alternative considered:* asserting the absence of the menu items only — weaker, because the menu is closed for everyone anyway, so it would pass even if the trigger were rendered for regular users.

**D4 — The `/admin/bookings` spec navigates through the dropdown instead of clicking the trigger twice.**
The current spec clicks the "Admin" link twice and then calls `page.goto("/admin/bookings")`; with a dropdown the equivalent intent is "open the menu, choose the bookings destination, and land on the read-only list". The direct `goto` is dropped so that the spec exercises the same navigation path a real admin would use, and the "no cancel/edit/delete button" assertions stay exactly as they are. *Alternative considered:* keeping the `goto` and only asserting the heading — cheaper, but it would leave the dropdown path for the bookings page unverified.

**D5 — The OpenSpec delta keeps the existing scenario titles.**
The OpenSpec delta validator refuses a `MODIFIED` requirement that drops a scenario the current spec still has, and it does not support renaming scenarios; only the requirement header is renamed (via `## RENAMED Requirements`). The two scenario titles therefore keep the word "link" even though the body now describes the dropdown trigger. *Alternative considered:* renaming the scenarios as well — rejected, the validator rejects the change.

**D6 — `clearAuthState` reloads the page after wiping the token.**
The helper clears the cookies and `localStorage`, but the app keeps the authenticated user in React state (`AuthContext`), so the navbar would still render the previous user — including the admin dropdown — after the helper returns. The helper therefore reloads the page after clearing the storage, which forces `AuthContext` to re-read the (now empty) storage. *Alternatives considered:* (a) asserting on a page that is not rendered by the navbar — rejected, the point of the spec is what the navbar shows; (b) dropping the stored user through the UI's "Keluar" button — rejected, it depends on the admin session being in a known state and would not work for the unauthenticated case.

**D7 — The unit suite is not touched, but it is re-run as a guard.**
`src/components/Navbar.test.tsx` already describes the dropdown, so no unit change is needed; running `npm run test` proves the app behaviour the specs now target is still the behaviour under test.

## Risks / Trade-offs

- **[Risk] The specs silently keep targeting the wrong element if the navbar changes again.** → Mitigation: the helpers are the single place that knows about the dropdown, the `test-suite` delta makes the dropdown-driven navigation part of the suite's documented contract, and the E2E job in CI turns the drift into a red build instead of a stale green one.
- **[Risk] The menu items only exist while the menu is open, so a spec that asserts an item before opening the menu fails with a confusing "not found" error.** → Mitigation: the shared helper performs open-then-click, and the specs never assert menu items directly.
- **[Risk] `getByRole("menuitem", { name: "Kelola Ruangan" })` could in principle match more than one element.** → Mitigation: the navbar is the only `role="menu"` container in the app, so the match is unique; the specs use `.click()` on the resolved locator, which fails loudly if it ever becomes ambiguous.
- **[Trade-off] The specs now depend on the Indonesian menu copy.** → Accepted: the whole application is Indonesian-only by requirement (`booking-creation` and the project conventions), and the unit test already asserts the same copy.
- **[Trade-off] The first admin spec's title still says "tautan Admin" (admin link).** → Accepted: renaming the test title is cosmetic; the OpenSpec scenario titles had to stay anyway (D5), and keeping the test title in sync with them avoids confusion. It may be reworded in a later, purely cosmetic pass.

## Migration Plan

1. Implement on a branch based on `ci/e2e-setup` (the branch that carries the E2E workflow): update `e2e/helpers/auth.ts` and `e2e/admin-panel.spec.ts`.
2. Verify: `npm run typecheck`, `npm run test`, and `npm run test:e2e` against a local backend (`bun run test:server` in `../booking-backend` with `NODE_ENV=test` and a `.env.test` pointing at a test database). The four admin specs must pass.
3. Commit as one logical commit (`test: align admin e2e specs with the navbar dropdown`); do not push.
4. Rollback: revert that single commit. Nothing outside `e2e/` changes, so no other system is affected.

## Open Questions

- Whether the misleading "link" wording in the two OpenSpec scenario titles (D5) and in the first admin spec's title should be cleaned up in a separate cosmetic change: deferrable, does not affect behaviour.
