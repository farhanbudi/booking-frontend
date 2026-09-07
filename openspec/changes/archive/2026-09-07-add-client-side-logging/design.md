## Context

The booking frontend (Vite 5 + React 18 + TypeScript, Tailwind v3, React Router v6) renders pages under `<App />` (`src/App.tsx`) which mounts inside `src/main.tsx`. Today there is no centralized mechanism for capturing runtime errors:

- React render errors crash the whole tree and the user sees a blank page.
- Synchronous errors thrown outside React's render cycle (e.g. in event handlers, async callbacks) are surfaced only by the browser's default `error` event and disappear from the console after a refresh.
- API failures bubble up as thrown `Error` instances from `src/api/client.ts`'s `request()` wrapper; the only trace is the `Error` reaching the calling component, where it's typically caught and shown inline. There is no central record.

The deliverable is purely additive: a single logger utility, one React `ErrorBoundary`, two `window` listeners, and one log call inside the existing `request()` error branch. No new dependencies, no network egress, no contract changes with the backend, no impact on production-bundle behavior beyond additional console output.

See `proposal.md` — Why for motivation; `specs/client-side-logging/spec.md` for the behavioral contract.

## Goals / Non-Goals

**Goals:**

- Give every React render error a fallback view (Bahasa Indonesia) with a one-click reload, and a structured log entry including the React component stack.
- Capture synchronous window errors and unhandled promise rejections at app startup and route them through the same logger.
- Capture every non-OK API response from `request()` as a `warn`-level entry (path + status + surfaced message) **before** the existing throw, so the throw behavior (`Error.message`, `.status`, `.retryAfter`) is byte-for-byte preserved.
- Provide a small, dev-friendly in-memory ring buffer (last 50 entries) exposed as `window.__recentLogs` so a developer or user reporting a bug can paste the history without reproducing the failure.
- Use only built-in browser APIs (`console`, `window`) and `import.meta.env.DEV`. No third-party logger, no transport, no network calls.

**Non-Goals:**

- Sending logs to a server, log aggregator, analytics service, or third-party SDK (explicitly out of scope per the task brief).
- Auto-logging password fields, JWT tokens, or full response bodies; redacted callers are required.
- Replacing or rewriting the existing fetch error logic in `src/api/client.ts`; only an additive `logger.warn(...)` is introduced.
- Changing routing, auth, the design system, or user-facing copy outside the `ErrorBoundary` fallback.
- Adding a separate Sentry/LogRocket/Browserless integration, environment-specific log levels (e.g. log only above `warn` in prod), or persisting logs to `localStorage`/`IndexedDB` (they live only in memory).
- A function-component variant of `ErrorBoundary` — React's official lifecycle for error capture is `componentDidCatch` / `getDerivedStateFromError`, which are only available on class components.

## Decisions

**D1 — Single `logger` module with level methods, no class hierarchy, no transport abstraction.** A plain object literal with `debug`/`info`/`warn`/`error` methods (each a thin wrapper around an internal `log(level, message, context)` function) is the simplest shape that satisfies the spec and keeps the call sites obvious. A `LogTransport` abstraction (a la `winston`/`pino`) would imply pluggable destinations, but the contract explicitly forbids any non-console destination and forbids adding destinations later without changing the spec. So we expose a closed API surface now and leave room to refactor only if a future change adds a real destination. Alternative considered: a class with private constructor (`new` not allowed) — rejected as ceremony for no benefit at this size.

**D2 — Format branching on `import.meta.env.DEV`.** Vite injects `DEV` as a compile-time boolean; it is statically `false` in production builds, so the dev-styling branch is dead-code-eliminated by the bundler and adds no runtime cost in production. This matches the project's existing pattern (`import.meta.env.VITE_API_BASE_URL` is already used in `src/api/client.ts`). Alternatives considered: a build-time `__DEV__` constant — same outcome, less idiomatic in Vite.

**D3 — In-memory ring buffer of length 50, exposed as `window.__recentLogs` only in dev.** The buffer is a module-scoped array; pushing and `shift()`-ing when length exceeds 50 keeps it bounded with O(1) amortized cost and trivial memory footprint. Exposing it on `window` only in development matches the task brief's debugging-ergonomics intent (a developer asking a user to "open console and run `window.__recentLogs`") while keeping production surfaces minimal. Production users will not see `window.__recentLogs` because the assignment is inside `if (isDev)`. Alternatives considered: `localStorage` persistence — rejected, since persistence outlives the session, leaks across users on shared machines, and was not requested. `IndexedDB` — overkill for 50 entries.

**D4 — Class-component `ErrorBoundary` (not a function component with hooks).** React 18 still has no hook equivalent for `componentDidCatch` / `getDerivedStateFromError`. Hooks-based error boundaries proposed by community libraries (e.g. `react-error-boundary`) are wrapper components built on top of a class boundary or on experimental APIs; using one would either add a dependency or import non-trivial extra code. A 30-line class component satisfies the spec and the task brief with zero new dependencies and minimal surface area. The boundary is mounted outside `<React.StrictMode>` so double-invocation of `componentDidCatch` in development does not double-log (StrictMode would intentionally call the lifecycle twice to surface side effects — for a logger that only emits to `console`, double-logging in dev is acceptable, but placing the boundary outside StrictMode makes the wrapper position unambiguous and matches how most production apps structure it).

**D5 — Window-level listeners registered once at startup in `src/main.tsx`, before `ReactDOM.createRoot`.** Registering before the root is created ensures that any synchronous error thrown during the first render (e.g. inside a context provider's initializer) still reaches the listeners. Listeners are added once (no teardown because the page-lifetime is the module lifetime); duplicates from HMR re-execution are not a concern because `main.tsx` is a module entry, not a HMR-updated module. Alternative considered: registering inside the `ErrorBoundary` `componentDidMount` — rejected, because the boundary doesn't exist until React mounts, so any error during `createRoot` itself would not be captured.

**D6 — `logger.warn` (not `error`) inside `request()` for non-OK responses.** The request returned a non-OK status, but the user-visible action (e.g. booking conflict, validation failure, expired session) is a normal expected failure that the UI handles with a form-level error message (see `AGENTS.md`: 409 surfaces as a form-level error). `warn` matches the project convention of "this happened, it's handled, but I want a breadcrumb" and avoids flooding `console.error` with non-exceptional conditions. The `ErrorBoundary` and `unhandledrejection` paths still use `logger.error` because they represent unexpected, unrecovered failures. The logger itself is level-agnostic about which method is "correct" — this is a deliberate, documented call-site decision.

**D7 — Single log call inside the existing `if (!res.ok) { ... }` block; no changes to `err.status`, `err.retryAfter`, the thrown `Error`, the JSON parse fallback, or the response handling.** The change is purely additive: import the logger, compute `message` exactly as today, call `logger.warn("API request gagal", { path, status, message })`, then continue the existing throw. This keeps the diff minimal, keeps every existing test (`client.test.ts` and indirect callers) passing, and makes the intent obvious in code review. Alternative considered: a `try/catch` around the whole `request()` — rejected, because `request()` is a single await chain with no internal throws to swallow.

**D8 — Fallback UI uses existing design tokens (`btn-primary`, default text styles, `max-w-md mx-auto mt-20 text-center`).** No new CSS, no new tokens. Indonesian copy: heading "Ada yang tidak beres", body "Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.", button "Muat ulang" — consistent with the rest of the app's Indonesian-language UI per `AGENTS.md`. Alternative considered: a richer fallback with diagnostic copy-paste buttons — rejected for this change; if desired later it should be its own proposal.

## Risks / Trade-offs

- **Console noise during development** → Logging is informative, not silent; styling makes it scannable. The 50-entry ring buffer keeps inspection bounded. No mitigation needed beyond docs.
- **`ErrorBoundary` swallows errors that some libraries expect to bubble** → Some libraries attach their own handlers to `window.onerror`; by registering our listener before `createRoot` we do not block them. The boundary itself is a React subtree boundary, not a global catch — it only stops the React render, which is the intent.
- **Duplicate logs from `React.StrictMode` double-invocation** → Placing the boundary outside `StrictMode` avoids double `componentDidCatch`. `logger.*` calls inside components that re-run in StrictMode will be called twice in development; this is acceptable because they go to `console` only (no side effects beyond user-visible output) and is the same trade-off every React 18 dev workflow makes. No mitigation.
- **Memory growth from the buffer** → Capped at 50 entries × one small object per entry; effectively negligible. No mitigation.
- **Risk that future contributors add a network destination** → Mitigated by the spec requirement "Logger never transmits data over the network" + "No network egress from any logging path" and by the fact that the logger module's only outputs are `console.*` and the in-memory array. Code review should reject any PR that adds `fetch`, `sendBeacon`, or image-ping inside `src/utils/logger.ts`.
- **Risk of logging sensitive values from new call sites** → The logger does not auto-collect anything (it has no global error/transport), so it cannot accidentally log form state. Callers are documented in the spec as responsible for redacting context. Mitigation: code review on any new `logger.*` call site near auth or payment paths.
- **HMR / Fast Refresh** → `main.tsx` is the entry module and is not HMR-replaced, so the `window` listeners and `ErrorBoundary` mount happen exactly once per page load. No mitigation needed.

## Migration Plan

1. Add `src/utils/logger.ts` and `src/components/ErrorBoundary.tsx` — pure additions; no imports affected yet.
2. Edit `src/main.tsx` to: (a) import the logger and `ErrorBoundary`, (b) register the two `window` listeners before `ReactDOM.createRoot`, (c) wrap `<App />` with `<ErrorBoundary>` as the outermost element (outside `<React.StrictMode>`).
3. Edit `src/api/client.ts` to: (a) add `import { logger } from "../utils/logger"`, (b) call `logger.warn("API request gagal", { path, status, message })` inside the existing `if (!res.ok)` branch, immediately after `message` is computed and before `throw`.
4. Run `npm run build` to confirm `tsc -b` and `vite build` still pass (type-safety gate per `AGENTS.md`).
5. Run `npm run test` (Vitest) to confirm existing client tests (`client.test.ts`) and component tests still pass — the `request()` change is additive, so `Error` shape, throw behavior, and headers are unchanged.
6. Manual smoke: trigger an intentional render error in a dev-only page or via DevTools to confirm the boundary shows the fallback; stop the backend briefly to confirm a non-OK `request()` produces a `warn` log on the appropriate console method; open DevTools and confirm `window.__recentLogs` is an array containing the recent entries.
7. Automated test backstop (see `tasks.md` §6): add `src/utils/logger.test.ts` (level routing, dev/prod format branching, 50-entry ring buffer, `window.__recentLogs` exposure, no-network-egress spies), `src/components/ErrorBoundary.test.tsx` (render-error capture, fallback UI, `logger.error` payload, reload-button wiring), and a new describe block in `src/api/client.test.ts` (non-OK response instrumentation, OK-response silence). Together these close the gap between the spec scenarios that are expressible as unit/component tests (~10 of 14) and the four scenarios that are inherently DevTools-bound (end-to-end no-egress, the two window-level listeners, and the boundary-outermost structural assertion) and remain as manual smoke.
8. Rollback: revert the three modified files and delete the two new files plus the three new/extended test files. Behavior is identical to pre-change state.

## Open Questions

None — the brief is concrete, the spec is closed, and the design choices above do not change either.