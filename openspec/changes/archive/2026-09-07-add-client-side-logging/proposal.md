## Why

The booking frontend currently has **no centralized client-side logging or error capture**. When a React component crashes, the user sees only a blank screen with no explanation; when an API call fails, the error message flashes briefly in the browser console and is then lost. Without a persistent trace, debugging reported bugs depends on reproducing the exact conditions under which the failure occurred. A lightweight, client-only logging layer will make crashes recoverable, give developers a consistent console format, and keep a short in-memory history that can be inspected at any time.

## What Changes

- Add a centralized `src/utils/logger.ts` utility that exposes `debug`, `info`, `warn`, and `error` methods, formats output with level-aware styling in development and a single-line JSON record in production, and retains the last 50 entries in memory (exposed on `window.__recentLogs` in development).
- Add a React `ErrorBoundary` class component (`src/components/ErrorBoundary.tsx`) that catches uncaught render errors, logs them through the new logger with the message, stack, and component stack, and renders an Indonesian-language fallback UI with a "Muat ulang" reload button.
- Wrap `<App />` in `src/main.tsx` with the new `ErrorBoundary` so any uncaught render error anywhere in the tree is captured.
- Register `window.addEventListener("error", ...)` and `window.addEventListener("unhandledrejection", ...)` in `src/main.tsx` (before `ReactDOM.createRoot`) so async errors and unhandled promise rejections are also logged through the same logger.
- Instrument the existing `request()` function in `src/api/client.ts` to call `logger.warn` (with `path`, `status`, and `message`) whenever a response is non-OK, **without** altering the existing throw behavior, error-message extraction, or `Retry-After` handling.
- No data is ever sent to a server, third-party service, or external endpoint. All output is browser-console only and an in-memory ring buffer.

## Capabilities

### New Capabilities

- `client-side-logging`: Centralized client-only logging utility (formatted console output, in-memory recent-log ring buffer exposed on `window.__recentLogs` in development), a React `ErrorBoundary` that logs caught render errors and shows a Bahasa Indonesia fallback, window-level `error` and `unhandledrejection` listeners, and API-client instrumentation that logs non-OK responses without changing throw behavior. Strictly client-only — no network egress.

### Modified Capabilities

None. No existing spec describes client-side logging behavior, and no current spec's requirements change. The instrumentation of `src/api/client.ts` is implementation-only (additive logging) and does not alter any documented requirement of `booking-creation`, `payment-booking`, `admin-panel`, or `app-config`.

## Impact

- **New files**:
  - `src/utils/logger.ts`
  - `src/components/ErrorBoundary.tsx`
- **Modified files**:
  - `src/main.tsx` — add `error`/`unhandledrejection` listeners and wrap `<App />` with `<ErrorBoundary>` (outside `<React.StrictMode>` so it remains the outermost wrapper).
  - `src/api/client.ts` — add `import { logger } from "../utils/logger"` and a single `logger.warn(...)` call inside the existing `if (!res.ok) { ... }` branch in `request()`. Throw logic, error-message extraction, `err.status`, and `err.retryAfter` are preserved verbatim.
- **No new dependencies.** Uses only built-in `console` methods and `import.meta.env.DEV`.
- **No production bundle behavior change.** In production builds, logs are written as compact JSON to the browser console and retained only in memory; no network calls are made.
- **No changes** to routing, auth, API contracts, UI styling tokens, fonts, or user-facing copy outside the new fallback message in `ErrorBoundary` (which is in Indonesian, consistent with the rest of the app).