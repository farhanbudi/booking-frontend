## Context

The frontend currently renders feedback as per-page inline alert
paragraphs (`bg-red-50` / `bg-green-50` + border + rounded-lg) coupled
to local `useState<string | null>` for `error` / `success`. Each page
duplicates the markup, mutates state in event handlers, and renders
the block conditionally. The blocks push surrounding content down, do
not auto-dismiss, and drift in copy across pages. See `proposal.md`
for motivation.

## Goals / Non-Goals

**Goals:**

- Mount a single `<Toaster />` once at the React tree root.
- Replace every inline error/success alert block in `src/pages/**`
  with `toast.error(...)` / `toast.success(...)` calls.
- Preserve Indonesian copy byte-for-byte.
- Keep `useState` for `error` / `success` only where the state feeds
  logic outside the alert block (submit disable flag, rate-limit
  countdown, derived `isBlocked`, etc.).
- Cover previously silent successes (admin deactivate) with a single
  `toast.success(...)` so admin feedback is also uniform.

**Non-Goals:**

- No business-logic or API call order changes.
- No new toast library other than `sonner`.
- No custom CSS-variable theming for sonner beyond the documented
  `position="top-right"`, `richColors`, and Inter font family hint.
- No unit test additions in this change (covered by manual testing
  checklist, mirroring existing project practice for UI feedback).

### Decisions

- **Library: `sonner`.** Selected over alternatives because it is
  actively maintained, ships a single component with rich-color
  variants out of the box, and supports `top-right` positioning
  directly. Alternatives considered: `react-hot-toast` (no
  first-class `richColors`, less visual parity), `react-toastify`
  (heavier CSS dependency, more boilerplate per call site).
- **Mount point: `src/App.tsx`, inside `<AuthProvider>`, just below
  `<Navbar />`.** Single mount, lives inside the router/auth tree so
  route changes do not unmount it, and is visually anchored at the
  very top of the DOM. Alternatives considered: mount inside each
  layout segment (rejected: multiple mounts produce duplicate toasts);
  mount in `index.html` outside the React root (rejected: not idiomatic
  for a Vite + React app and would lose React lifecycle awareness).
- **Position: `top-right`, `richColors: true`.** Matches Indonesian
  reading direction (top-right is conventional for "secondary notice"
  regions) and gives automatic red/green styling for `toast.error` /
  `toast.success` without CSS-variable customization. Alternatives
  considered: `top-center` (rejected: blocks hero content on mobile);
  custom theme tokens (rejected: out of scope).
- **Where to call `toast.*`.** Inside event handlers and inside
  `.then()` / `.catch()` / `try` / `catch` blocks only. Never in the
  render body of a function component. This mirrors the existing
  `setError` / `setSuccess` call sites, so the migration is mostly a
  token rename at the call site plus the deletion of the alert JSX.
- **What to keep when state has dual use.** `BookingPage` keeps
  `useState` for `error` only because `error` is read by the
  rate-limit branch to populate `rateLimitLeft` and the resulting
  `isBlocked` flag; the alert JSX is removed and `setError(...)` is
  replaced by `toast.error(...)`. `AdminResourcesPage` keeps
  `useState` for `formError` because `formError` controls when to
  short-circuit the submit; the alert JSX is removed and `setFormError`
  is replaced by `toast.error(...)`. In every other file the
  `error` / `success` state is dropped entirely together with the
  JSX block.
- **Admin deactivate feedback.** `AdminResourcesPage`'s
  `handleDeactivate` previously had no success notification. After the
  migration it calls
  `toast.success(\`Ruangan "${r.name}" berhasil dinonaktifkan.\`)` on
  success — matching the copy used when `setSuccess(...)` was
  previously wired (it was set but never rendered, see
  `AdminResourcesPage.tsx:140`).

## Migration Plan

1. Add `sonner` to `dependencies` in `package.json` and run
   `npm install`.
2. Edit `src/App.tsx` to import and render one `<Toaster />` below
   `<Navbar />` inside `<AuthProvider>`.
3. For each of the five affected files, delete the alert JSX block,
   swap `setError` / `setSuccess` / `setFormError` / `setLoadError`
   for the matching `toast.*`, and prune `useState` declarations
   whose only consumer was the alert JSX.
4. Run `npm run build` to typecheck the migrated components.
5. Run `npm run test` to ensure the unit suite still passes.
6. Run `npm run dev` and execute the checklist below.

Rollback: revert the five file edits, remove `<Toaster />` from
`src/App.tsx`, and `npm uninstall sonner`. No data or schema changes;
rollback is purely code.

## Risks / Trade-offs

- [Risk] A page is missed and keeps its inline alert block.
  → Mitigation: the manual testing checklist below covers every
  surface that previously had an alert; `grep` for `bg-red-50` /
  `bg-green-50` in `src/` must return zero matches after the change.
- [Risk] `BookingPage`'s rate-limit countdown is broken if `error`
  state is removed prematurely. → Mitigation: keep `error` as a
  `useState` in `BookingPage` because it feeds the `rateLimitLeft`
  branch, only swap the mutation calls and delete the alert JSX.
- [Risk] Toasts appear doubled if two `<Toaster />` are mounted.
  → Mitigation: mount only in `src/App.tsx`; add a checklist item
  confirming there is exactly one `<Toaster />` in the React tree.
- [Risk] Existing Indonesian copy drifts during the rename. →
  Mitigation: every toast call uses the same string literal that was
  previously passed to the matching `setError` / `setSuccess`
  setter; spec scenario "Toast text preserves existing Indonesian
  copy" makes this an acceptance check.

## Open Questions

None.