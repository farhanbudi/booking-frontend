## 1. Prepare

- [x] 1.1 Create the branch `test/align-admin-nav-e2e-specs` from `ci/e2e-setup` (the branch that carries the E2E workflow) and verify with `git branch --show-current` that the new branch is active; do not push
- [x] 1.2 Review the existing uncommitted implementation in `e2e/helpers/auth.ts` and `e2e/admin-panel.spec.ts` against `design.md` (D1–D6) and list the deviations; verify that every `getByRole("link", { name: "Admin" })` lookup in the repository is gone

## 2. Align the shared admin helper

- [x] 2.1 In `e2e/helpers/auth.ts`, replace the `getByRole("link", { name: "Admin" })` assertion at the end of `loginAsAdmin` with an assertion on the dropdown trigger `getByRole("button", { name: "Admin" })`; verify the helper no longer references an admin link
- [x] 2.2 Add the exported helper `openAdminMenu(page, item)` that clicks the trigger and then the menu item named `item` (`"Kelola Ruangan"` / `"Kelola Booking"`); verify the trigger click happens before the menu-item click and that the resolved locator is unique
- [x] 2.3 Make `clearAuthState` reload the page after clearing the cookies and `localStorage`, so the in-memory auth state of the app is dropped as well; verify the helper returns with the navbar showing the logged-out state

## 3. Align the admin E2E specs

- [x] 3.1 In `e2e/admin-panel.spec.ts`, change the "admin melihat … Admin di navbar" spec to assert the dropdown trigger is visible for the admin and has count 0 for a regular user; verify the spec still covers both halves of the requirement and that its title matches the behaviour it asserts
- [x] 3.2 In `e2e/admin-panel.spec.ts`, change the "menambah resource" and "menonaktifkan resource" specs to reach the admin resources page through `openAdminMenu(page, "Kelola Ruangan")`; verify the remaining assertions (form fields, success toast, "Nonaktifkan" action, row disappearance) are unchanged
- [x] 3.3 In `e2e/admin-panel.spec.ts`, change the "semua booking di /admin/bookings" spec to open the dropdown and choose the bookings destination instead of clicking the trigger twice and calling `page.goto`; verify the "no Batalkan/Edit/Hapus button" assertions are unchanged
- [x] 3.4 Confirm with `git diff --stat` that only `e2e/helpers/auth.ts` and `e2e/admin-panel.spec.ts` changed, that no assertion, timeout or expected message was removed, and that no file under `src/` was touched

## 4. Verification

- [x] 4.1 Run `npm run typecheck` and `npm run test` and confirm both pass (the unit suite must be untouched and green)
- [x] 4.2 Start the backend with `bun run test:server` in `../booking-backend` using `NODE_ENV=test` and a `.env.test` whose `DATABASE_URL` points at a database whose name contains "test"; verify `GET http://127.0.0.1:3001/health` answers `ok` before running the suite
- [x] 4.3 Run `npx playwright test e2e/admin-panel.spec.ts` and verify all admin specs pass; record the exact pass/fail list
- [x] 4.4 Run the full `npm run test:e2e` and verify that no spec fails because of the admin navigation any more; list any remaining failure for the report instead of weakening a spec
- [x] 4.5 Confirm that the specs still work under the CI conditions (`CI=1 npx playwright test e2e/admin-panel.spec.ts`) with the same result as the local run

## 5. Commit & hand-off

- [x] 5.1 Commit the change as one logical commit (`test: align admin e2e specs with the navbar dropdown`); verify with `git log --oneline -3` and confirm nothing was pushed
- [x] 5.2 Report the result in Indonesian: files changed, the pass/fail list of the admin specs before and after, the verification commands that were run, and the remaining failures (if any) that belong to `align-booking-date-nav-e2e-specs`
