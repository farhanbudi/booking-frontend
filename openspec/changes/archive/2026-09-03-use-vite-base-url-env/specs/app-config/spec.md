## Purpose

Declares and consumes the frontend application's environment variables so that
the FE origin and the backend origin are read from a single, typed source of
truth (`.env*` files), with no hardcoded URLs in tooling or source code.

## ADDED Requirements

### Requirement: VITE_BASE_URL is the FE origin source of truth
The system SHALL treat `VITE_BASE_URL` (declared in `.env*` files and typed on
`ImportMetaEnv`) as the canonical origin of the frontend application itself.
It is distinct from `VITE_API_BASE_URL`, which points at the backend.

#### Scenario: VITE_BASE_URL is typed on ImportMetaEnv
- **WHEN** source code references `import.meta.env.VITE_BASE_URL`
- **THEN** TypeScript recognizes it as a `string` without requiring a non-null assertion or fallback

#### Scenario: VITE_BASE_URL and VITE_API_BASE_URL are independent
- **WHEN** `.env` declares `VITE_BASE_URL` and `VITE_API_BASE_URL` with different values (e.g. different ports for FE and API)
- **THEN** both are exposed independently and a change to one does not affect the other

### Requirement: Playwright config reads VITE_BASE_URL instead of hardcoding the dev origin
`playwright.config.ts` SHALL NOT hardcode `http://localhost:5173`. It SHALL
read the FE origin from the `VITE_BASE_URL` environment variable, falling
back to `http://localhost:5173` when the variable is not defined, so that
local defaults work without an `.env.e2e` override and so that a different
FE origin (e.g. a deploy preview) is honored automatically when set.

#### Scenario: Local default keeps working without .env.e2e
- **WHEN** `npm run test:e2e` runs and `VITE_BASE_URL` is not defined in the loaded env
- **THEN** Playwright uses `http://localhost:5173` for both `baseURL` and `webServer.url`, matching prior behavior

#### Scenario: Deploy preview FE origin overrides the default
- **WHEN** `VITE_BASE_URL` is set to a non-local origin (e.g. `https://booking-frontend-preview.example.com`) before Playwright starts
- **THEN** Playwright uses that origin for `baseURL` and `webServer.url` instead of the local fallback

#### Scenario: Both baseURL and webServer.url use the same resolved origin
- **WHEN** Playwright resolves the FE origin for this repo
- **THEN** both `use.baseURL` and `webServer.url` resolve to the same value (env-driven or fallback), so the `webServer` readiness check matches the URL Playwright tests against