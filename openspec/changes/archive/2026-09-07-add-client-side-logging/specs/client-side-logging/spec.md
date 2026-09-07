## Purpose

Provides a centralized, client-only logging facility for the booking frontend so that crashes, async errors, and failed API requests produce a consistent, inspectable trace in the browser console and a short in-memory history, without ever sending data to a server or third party.

## ADDED Requirements

### Requirement: Logger utility exposes level methods

The system SHALL provide a centralized logger module that exposes `debug`, `info`, `warn`, and `error` methods. Each method SHALL accept a human-readable message and an optional structured context object, and SHALL produce a log entry containing the level, an ISO-8601 timestamp, the message, and the context (when provided).

#### Scenario: Logger API accepts context

- **WHEN** a caller invokes `logger.warn("msg", { foo: 1 })`
- **THEN** a single log entry is produced whose `level` is `"warn"`, whose `message` is `"msg"`, and whose `context` is `{ foo: 1 }`

#### Scenario: Logger API omits context when not provided

- **WHEN** a caller invokes `logger.info("msg")` without a context argument
- **THEN** a single log entry is produced whose `context` field is absent and whose `level` is `"info"`

### Requirement: Development output is level-styled and human-readable

When running in development (`import.meta.env.DEV` is `true`), the logger SHALL write each entry to the browser console using the method matching its level (`debug`/`info` → `console.log`, `warn` → `console.warn`, `error` → `console.error`), with a formatted message that includes the level tag and a per-level CSS style so that entries are visually distinguishable in DevTools. The context object, when present, SHALL be passed as an additional console argument so DevTools displays it as an expandable object.

#### Scenario: Error level uses console.error in development

- **WHEN** `logger.error("boom")` is called in development
- **THEN** the call lands on `console.error` with a styled message and no context argument is needed

#### Scenario: Warn level uses console.warn in development

- **WHEN** `logger.warn("careful", { id: 7 })` is called in development
- **THEN** the call lands on `console.warn` and the context `{ id: 7 }` is passed as an additional argument

### Requirement: Production output is compact and machine-parseable

When running in a production build (`import.meta.env.DEV` is `false`), the logger SHALL write each entry as a single-line JSON string (containing `level`, `time`, `message`, and optional `context`) to the browser console using the level-matching console method, with no CSS styling applied.

#### Scenario: Production logger emits JSON

- **WHEN** `logger.info("ready", { v: 1 })` is called in production
- **THEN** exactly one console invocation occurs on `console.log`, whose first argument is a JSON string that parses to an object with `level: "info"`, `message: "ready"`, a parseable ISO-8601 `time`, and `context: { v: 1 }`

### Requirement: Recent logs buffer retains the last 50 entries

The logger SHALL retain the most recent 50 entries in an in-memory ring buffer. Each new entry SHALL be appended; once the buffer reaches 50 entries, the oldest entry SHALL be dropped on the next append. In development, the buffer SHALL additionally be exposed as `window.__recentLogs` so it can be inspected from the DevTools console.

#### Scenario: Buffer caps at 50 entries

- **WHEN** 55 entries are logged in sequence
- **THEN** `window.__recentLogs` (in development) contains exactly the last 50 entries in chronological order

#### Scenario: Buffer is inspectable in development

- **WHEN** any entry is logged in development
- **THEN** `window.__recentLogs` includes that entry and is an array

### Requirement: Logger never transmits data over the network

The logger SHALL NOT make any HTTP request, fetch call, WebSocket connection, `navigator.sendBeacon` call, image-ping, or other network egress for any log entry. The only side effects of calling any logger method SHALL be: a single browser-console invocation matching the level, and an append to the in-memory recent-logs buffer.

#### Scenario: Logging does not produce network activity

- **WHEN** `logger.error("x")` is called and the network panel is open in DevTools
- **THEN** no outgoing request appears in the network panel as a result of the call

### Requirement: Logger never emits sensitive values

The logger SHALL NOT add any code that reads or logs the contents of password input fields, full JWT tokens, or full response bodies that may contain credentials. Callers SHALL be responsible for passing redacted context, and the logger API SHALL NOT include any convenience that auto-dumps form values or token contents.

#### Scenario: Password values are not auto-logged

- **WHEN** a user types a value into a password input and submits a form
- **THEN** no logger method is invoked with that password value as part of the context, unless the caller explicitly chooses to do so (which is out of contract — callers are expected not to)

#### Scenario: JWT token is not auto-logged

- **WHEN** an API request is sent with a `Bearer` token
- **THEN** no logger method is invoked with the full token string as part of the context

### Requirement: React ErrorBoundary catches render errors and logs them

The system SHALL mount a React `ErrorBoundary` class component as the outermost wrapper around `<App />` (outside `<React.StrictMode>`), such that any uncaught error thrown during render in any descendant component is captured. When an error is captured, the boundary SHALL log the error through `logger.error` with at minimum the error message, error stack, and React component stack, and SHALL render a Bahasa Indonesia fallback view containing a heading, a short explanatory message, and a reload button that calls `window.location.reload()`.

#### Scenario: Boundary logs captured error

- **WHEN** any descendant of the boundary throws during render
- **THEN** exactly one `logger.error` call is produced whose context contains `message`, `stack`, and `componentStack`

#### Scenario: Boundary renders fallback UI

- **WHEN** the boundary has captured an error
- **THEN** the page shows the fallback heading and message in Indonesian, and a reload button; the rest of the application tree is replaced by the fallback

#### Scenario: Boundary reload button reloads the page

- **WHEN** the user clicks the fallback reload button
- **THEN** `window.location.reload()` is invoked

#### Scenario: Boundary is the outermost wrapper

- **WHEN** the application is initialized
- **THEN** `<ErrorBoundary>` wraps `<App />` at the outermost level, with no higher React ancestor above it

### Requirement: Window-level error and rejection events are logged

The system SHALL register a `window` `error` listener and a `window` `unhandledrejection` listener at application startup (before `ReactDOM.createRoot`), and each listener SHALL route its event to the centralized logger as an `error`-level entry containing, at minimum, the event message and the source location (for `error`) or the rejection reason's message (for `unhandledrejection`).

#### Scenario: Uncaught synchronous error is logged

- **WHEN** synchronous code throws and the error reaches `window`
- **THEN** exactly one `logger.error` call is produced whose context contains `message` and identifying source information

#### Scenario: Unhandled promise rejection is logged

- **WHEN** a promise rejects without a `.catch` handler and the rejection reaches `window`
- **THEN** exactly one `logger.error` call is produced whose context contains a `reason` derived from the rejection value

### Requirement: API client logs non-OK responses without changing throw behavior

The centralized `request()` function in `src/api/client.ts` SHALL call `logger.warn` with a context object containing the request `path`, the response `status`, and the surfaced error `message` whenever the response is non-OK. The existing throw behavior (the thrown `Error` whose `.message` is the backend's `{ error }` string or the Indonesian fallback, and whose `.status` and `.retryAfter` are populated when available) SHALL remain unchanged: the logger call is purely additive and occurs before the throw.

#### Scenario: Non-OK response is logged before throwing

- **WHEN** `request()` receives a non-OK response and the response body is `{ "error": "Slot sudah dipesan" }`
- **THEN** `logger.warn` is called exactly once with context `{ path, status, message: "Slot sudah dipesan" }`, and the function still throws an `Error` whose `.message` is `"Slot sudah dipesan"` and whose `.status` equals the response status

#### Scenario: Non-OK response with invalid JSON is logged before throwing

- **WHEN** `request()` receives a non-OK response whose body is not valid JSON
- **THEN** `logger.warn` is called exactly once with context `{ path, status, message: "Request gagal (status <code>)" }`, and the function still throws the same Indonesian fallback `Error` it threw before the change

#### Scenario: OK response is not logged by the client wrapper

- **WHEN** `request()` receives a response with status 2xx
- **THEN** no `logger.*` call is made by the wrapper

### Requirement: No network egress from any logging path

The combined behavior of the logger, the `ErrorBoundary`, the window-level error/rejection listeners, and the API-client instrumentation SHALL NOT result in any HTTP, WebSocket, `sendBeacon`, image-ping, or other outbound network traffic that is caused by a log call. All observability MUST be local to the browser (console + in-memory buffer).

#### Scenario: End-to-end no-egress check

- **WHEN** the application runs through a representative session (component render error, async throw, non-OK API response)
- **THEN** the DevTools network panel shows no additional outgoing requests attributable to logging beyond the application's normal API traffic