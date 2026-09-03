## 1. Type the FE-origin env var

- [x] 1.1 In `src/vite-env.d.ts`, add a new line `readonly VITE_BASE_URL: string;` inside the existing `interface ImportMetaEnv { ... }` block (directly below `VITE_API_BASE_URL`), and verify the file's existing `/// <reference types="vite/client" />` directive and the `ImportMeta` interface remain unchanged by re-reading the file.

## 2. Wire Playwright config to the env

- [x] 2.1 In `playwright.config.ts`, immediately after the existing `dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });` line, add a single `const FE_BASE_URL = process.env.VITE_BASE_URL ?? "http://localhost:5173";` line and verify the file's existing import block and `console.log` line for `VITE_API_BASE_URL` are preserved.
- [x] 2.2 Replace the hardcoded `"http://localhost:5173"` value of `use.baseURL` in `playwright.config.ts` with the new `FE_BASE_URL` constant, and verify the line reads `baseURL: FE_BASE_URL,` after the edit.
- [x] 2.3 Replace the hardcoded `"http://localhost:5173"` value of `webServer.url` in `playwright.config.ts` with the new `FE_BASE_URL` constant, and verify the line reads `url: FE_BASE_URL,` after the edit.
- [x] 2.4 (Optional parity) Add a `console.log(`[playwright.config] VITE_BASE_URL: ${process.env.VITE_BASE_URL ?? '(tidak terdefinisi)'}`);` line directly below the existing `VITE_API_BASE_URL` log so debug output is symmetric, and verify both log lines render when `npm run test:e2e` starts.

## 3. Verification

- [x] 3.1 Run `npm run build` and verify it completes with no TypeScript errors (this confirms the new `ImportMetaEnv` field typechecks against the existing project source), per `AGENTS.md`'s "use `npm run build` to verify type safety and production build".
- [x] 3.2 Run `npm run test` and verify all existing unit/component tests still pass (no source code in `src/` was changed; this is a sanity check that the Playwright config edit is isolated and does not affect Vitest).
- [ ] 3.3 Run `npm run test:e2e` against the test backend per `AGENTS.md` and verify the Playwright run starts successfully — the readiness probe against `webServer.url` must succeed (it will resolve to `http://localhost:5173` from the loaded `.env.e2e`, matching the prior behavior). **BLOCKED at planning time**: `playwright.config.ts` references `__dirname` in ESM (pre-existing in the working tree before this change, see `git show HEAD:playwright.config.ts`). Needs separate fix to the ESM/dotenv wiring.
- [ ] 3.4 Manually verify the override path by running `VITE_BASE_URL=https://example.test npx playwright test --list` and confirming the config loads without error (no run needed; this proves the env var is read at config-load time and a non-local value does not break config parsing). **Blocked by the same pre-existing `__dirname` issue as 3.3.**