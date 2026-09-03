## Context

The repo carries three env files (`.env`, `.env.e2e`, `.env.example`) and
two Vite-related vars: `VITE_API_BASE_URL` (backend origin, already typed
in `src/vite-env.d.ts` and consumed by `src/api/client.ts`) and
`VITE_BASE_URL` (frontend origin, declared but unused). Vite injects vars
prefixed `VITE_` into `import.meta.env` at build/dev time, and reads them
from `.env`, `.env.<mode>`, and `.env.local` in priority order.

`playwright.config.ts` already loads `.env.e2e` via `dotenv` at config time
(line 5: `dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })`),
so any `process.env.VITE_BASE_URL` read inside this file will pick up the
value from `.env.e2e` automatically — no extra wiring required. Today the
file hardcodes `http://localhost:5173` for both `use.baseURL` and
`webServer.url`. The Vite dev server itself runs on port 5173 (fixed in
`vite.config.ts`), so the fallback matches the only supported local origin
unless a future change moves the port.

`src/vite-env.d.ts` currently only declares `VITE_API_BASE_URL` on
`ImportMetaEnv`. Adding `VITE_BASE_URL` alongside it is a one-line,
additive type change with no runtime effect.

## Goals / Non-Goals

**Goals:**
- Make `VITE_BASE_URL` the canonical FE origin for both source code (typed)
  and tooling (Playwright config).
- Keep the local-default ergonomics: with no env override, Playwright still
  targets `http://localhost:5173`.
- Touch only the two files that need to change; leave env files alone per
  user instruction.

**Non-Goals:**
- Editing `.env`, `.env.e2e`, or `.env.example` (user instruction).
- Adding a new consumer of `VITE_BASE_URL` in `src/` (no current need).
  The variable becomes typed and consumable for a future change.
- Refactoring `src/api/client.ts` or the rest of the API layer; this
  change only adds a typed declaration, it does not move or rename
  `VITE_API_BASE_URL`.
- Changing the Vite dev-server port (still 5173 per `vite.config.ts`).
- Changing the production build / preview origin; Vite already produces
  URLs relative to the host, so no production-code path needs
  `VITE_BASE_URL` today.

## Decisions

**D1. Type `VITE_BASE_URL` additively in `src/vite-env.d.ts`.**
Add `readonly VITE_BASE_URL: string;` to `ImportMetaEnv`, matching the
existing pattern for `VITE_API_BASE_URL`. No optional/nullable marker is
needed because Vite only injects prefixed vars when they are declared in a
loaded `.env*` file, and all three files declare it. If a future deploy
ever runs without `VITE_BASE_URL` set, the consuming code should add a
`??` fallback at its call site (see D3 for the parallel in
`playwright.config.ts`); we deliberately do not make the type optional,
so the missing-env failure mode is loud, not silent.

**D2. Read `VITE_BASE_URL` once at the top of `playwright.config.ts`.**
Define a single local constant
`const FE_BASE_URL = process.env.VITE_BASE_URL ?? "http://localhost:5173";`
after the existing `dotenv.config(...)` call and use it for both
`use.baseURL` and `webServer.url`. The `??` fallback gives local-default
ergonomics and survives `.env.e2e` not yet being created. Reading once
into a constant keeps the source of truth in one place and the existing
`console.log` line for `VITE_API_BASE_URL` can be mirrored for
`VITE_BASE_URL` for symmetry.

**D3. Fallback is the literal `http://localhost:5173`, not the env value.**
Same as the existing API client pattern (`src/api/client.ts:1`). Both
`VITE_API_BASE_URL` and `VITE_BASE_URL` fall back to their local dev
default so unit/E2E runs "just work" on a fresh clone before the user
copies `.env.example` → `.env`. Keeping the two patterns symmetric makes
the codebase easier to reason about.

**D4. Do not introduce a `src/config.ts` module.**
A `config.ts` re-exporting `import.meta.env.VITE_BASE_URL` would be a
cleaner surface for future consumers, but right now no source file reads
it. Premature abstraction. The user explicitly asked to wire env-driven
URLs where hardcoded FE URLs already exist; only `playwright.config.ts`
qualifies today. The type declaration in `vite-env.d.ts` is enough to
make a future `config.ts` (or a direct `import.meta.env.VITE_BASE_URL`)
typecheck cleanly.

## Risks / Trade-offs

- [Risk] `dotenv.config` in `playwright.config.ts` does not override
  pre-existing `process.env` values by default. If the user's shell
  already has a stale `VITE_BASE_URL` set, the value in `.env.e2e` will
  silently be ignored. → Mitigation: this matches the existing
  `VITE_API_BASE_URL` behavior; behavior is consistent with today's
  setup. If a future change wants env-file precedence, swap
  `dotenv.config(...)` for `dotenv.config({ ..., override: true })`,
  but that's out of scope here.

- [Risk] The fallback `http://localhost:5173` is duplicated in two files
  (`playwright.config.ts` and conceptually in `.env.e2e` which sets the
  same). If the port changes in `vite.config.ts`, both need updating.
  → Mitigation: documented in tasks.md as a follow-up check; the
  fallback is acceptable until a `src/config.ts` centralizes these.

- [Risk] `.env.example` currently has `VITE_BASE_URL=http://localhost:3000`
  (which is the API port, not the FE port — likely a typo by the user).
  The change does NOT touch `.env.example` per user instruction. A
  future change should fix this; today `.env` and `.env.e2e` both have
  the correct `:5173` value, so local-dev and E2E work.

- [Risk] No runtime code currently consumes `VITE_BASE_URL`, so the
  type-only change in `vite-env.d.ts` has no immediate observable
  behavior. → Mitigation: the Playwright-config change is the
  observable artifact; the type change is the enabler for future
  consumers.

## Migration Plan

No data migration. Deploy steps:

1. Apply edits to `src/vite-env.d.ts` and `playwright.config.ts`.
2. Run `npm run build` to confirm TypeScript still typechecks with the
   new `ImportMetaEnv` field.
3. Run `npm run test` (no FE-code change; sanity check).
4. Run `npm run test:e2e` against the test backend to confirm Playwright
   still resolves `:5173` for `baseURL` and `webServer.url`.

Rollback: revert the two file edits. No env, no backend involvement.

## Open Questions

None.