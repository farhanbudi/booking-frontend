## 1. Setup

- [x] 1.1 Add `sonner` to `dependencies` in `package.json` and run `npm install`; verify `node_modules/sonner` exists and `package-lock.json` is updated
- [x] 1.2 Mount a single `<Toaster position="top-right" richColors toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }} />` in `src/App.tsx` immediately below `<Navbar />` and verify the file imports `Toaster` from `sonner`

## 2. Migrate LoginPage

- [x] 2.1 In `src/pages/LoginPage.tsx`, drop the `error` `useState`, replace `setError(null)` / `setError(err.message ?? "Login gagal")` with `toast.error(...)` (or remove the line where it was just clearing), remove the inline `{error && <p ...>...</p>}` block, and verify by `grep` that `bg-red-50` no longer appears in this file

## 3. Migrate RegisterPage

- [x] 3.1 In `src/pages/RegisterPage.tsx`, drop the `error` `useState`, replace `setError(null)` / `setError(err.message ?? "Registrasi gagal")` with `toast.error(...)`, remove the inline alert block, and verify by `grep` that `bg-red-50` no longer appears in this file

## 4. Migrate BookingPage

- [x] 4.1 In `src/pages/BookingPage.tsx`, keep the `error` `useState` (it feeds the 429 rate-limit branch), but swap `setError(...)` calls for `toast.error(...)`, drop the `success` `useState`, swap `setSuccess(...)` for `toast.success(...)`, and delete both the `{error && ...}` and `{success && ...}` JSX blocks; verify the `useEffect` that reads `rateLimitLeft` and the `isBlocked` flag still compile
- [x] 4.2 In `src/pages/BookingPage.tsx`, verify that `bg-red-50` / `bg-green-50` no longer appear in any alert block, and that `timeConflictWarning` / `startTimeInPast` paragraphs (which are inline warnings, not alerts) are intentionally left intact

## 5. Migrate AdminBookingsPage

- [x] 5.1 In `src/pages/admin/AdminBookingsPage.tsx`, drop the `error` `useState`, swap `setError(err.message)` for `toast.error(err.message)`, and delete the `{error && <p ...>...</p>}` block; verify by `grep` that the inline `bg-red-50` alert is gone (status-pill `bg-green-50` styling in `statusStyle` must remain)

## 6. Migrate AdminResourcesPage

- [x] 6.1 In `src/pages/admin/AdminResourcesPage.tsx`, drop the `success` `useState`, drop the `formError` `useState` (it is only read by the alert JSX and a `return` guard that we will convert into a toast call), replace `setFormError(...)` / `setLoadError(...)` / `setSuccess(...)` calls with the matching `toast.*`, delete the three inline alert blocks, and keep `loadError` `useState` if any code path still reads it (it is only the alert, so it can be dropped too)
- [x] 6.2 In `src/pages/admin/AdminResourcesPage.tsx`, add a `toast.success(\`Ruangan "${r.name}" berhasil dinonaktifkan.\`)` call inside `handleDeactivate` after the deactivation succeeds, and verify by `grep` that the inline `bg-red-50` / `bg-green-50` alert blocks are gone while the status pill styling is preserved

## 7. Verification

- [x] 7.1 Run `grep -r "bg-red-50\|bg-green-50" src` and verify the only remaining hits are the status-pill classes (`statusStyle` in `AdminBookingsPage.tsx`, the `bg-green-50` pill in `MyBookingsPage.tsx`, and the active-resource pill in `AdminResourcesPage.tsx`)
- [x] 7.2 Run `npm run build` and verify `tsc -b` + `vite build` both pass with zero errors
- [x] 7.3 Run `npm run test` and verify the existing unit suite still passes (1 pre-existing failure on `main` in `BookingPage.test.tsx > menampilkan detail resource dan kalender slot terisi` is unrelated to this change — confirmed by stashing and re-running on `main`)
- [ ] 7.4 Run `npm run dev` and execute the manual checklist (requires a running backend — see AGENTS.md; cannot be run from this sandbox without starting the dev/test backend):
  - (a) login with a wrong password — red toast appears in top-right with the backend error message, no inline alert inside the form, toast auto-dismisses
  - (b) booking creation on a free slot — green toast with `"Booking berhasil dibuat!"` appears, no inline alert, toast auto-dismisses
  - (c) booking creation that hits a 409 conflict — red toast with the backend error message appears, no inline alert, toast auto-dismisses
  - (d) admin resource create success — green toast with `"Ruangan berhasil ditambahkan."` appears, no inline alert
  - (e) admin resource deactivate success — green toast with `"Ruangan \"<nama>\" berhasil dinonaktifkan."` appears, no inline alert
  - (f) any page re-render (state change, route change) — no extra toast is queued as a side effect