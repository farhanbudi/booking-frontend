## Why

The repo already declares `VITE_BASE_URL` in `.env.example`, `.env`, and
`.env.e2e` as the frontend application's own base URL (distinct from
`VITE_API_BASE_URL`, which points at the backend). Today this variable is
read by nothing: `playwright.config.ts` hardcodes
`http://localhost:5173` for `baseURL` and for the `webServer.url`, and
`src/vite-env.d.ts` does not type `VITE_BASE_URL` on `ImportMetaEnv`, so
any future code that reads it would be untyped and a different FE origin
(e.g. a deploy preview at `https://booking-frontend-preview.example.com`)
would silently keep using the local URL. This change makes
`VITE_BASE_URL` the single source of truth for the FE origin in tooling
and types the variable so future code can read it safely.

## What Changes

- Type `VITE_BASE_URL` on `ImportMetaEnv` in `src/vite-env.d.ts`, so any
  future `import.meta.env.VITE_BASE_URL` reference typechecks.
- Replace the two hardcoded `http://localhost:5173` strings in
  `playwright.config.ts` (`baseURL` and `webServer.url`) with values read
  from the `VITE_BASE_URL` env var, falling back to `http://localhost:5173`
  for local-default ergonomics.
- Do **not** modify `.env`, `.env.e2e`, or `.env.example` — those are the
  source of truth the user already maintains.
- Do **not** modify `src/api/client.ts` or any other runtime code: no
  feature code currently consumes `VITE_BASE_URL`. Adding a new
  consumer is left for a future change.

## Capabilities

### New Capabilities

- `app-config`: Frontend application configuration surface — how the FE
  declares and consumes its own environment variables (`VITE_BASE_URL`
  for the FE origin, `VITE_API_BASE_URL` for the backend origin) so
  tooling and source code can read the same source of truth without
  hardcoded URLs.

### Modified Capabilities

<!-- None. No existing capability's requirements change: this change
     only adds a typed declaration and removes two hardcoded values from
     tooling config. -->

## Impact

- **Source files**:
  - `src/vite-env.d.ts` (one new readonly field on `ImportMetaEnv`)
  - `playwright.config.ts` (replace two hardcoded strings with env-driven
    values + `??` fallback)
- **Env files**: none changed (`.env`, `.env.e2e`, `.env.example` already
  declare `VITE_BASE_URL`).
- **Runtime code**: none touched. `VITE_BASE_URL` becomes typed and
  consumable for future changes; nothing in `src/` reads it today.
- **API / backend**: none.
- **Tests**: E2E behavior should be unchanged because the resolved URL
  in local dev equals the previous hardcoded value.