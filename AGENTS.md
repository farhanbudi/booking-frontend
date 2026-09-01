# AGENTS.md

Booking room-reservation frontend: React 18 + Vite 5 + TypeScript + Tailwind v3 + React Router v6. Depends on the sibling backend repo `../booking-backend` (Bun + ElysiaJS) which must be running at `http://localhost:3000`.

## Commands

- `npm run dev` — dev server on port 5173 (fixed in `vite.config.ts`).
- `npm run build` — verification step: runs `tsc -b` typecheck then `vite build`. There is **no lint script**; use `npm run build` to verify type safety and production build.
- `npm run test` — unit/component tests (Vitest + React Testing Library, jsdom). Runs without the backend; no `npm run dev` needed.
- `npm run test:e2e` — Playwright E2E tests (`e2e/`). **Prerequisites:** the **test backend** (`../booking-backend` on `:3001`) must be running, since the e2e dev server loads `.env.test` (`VITE_API_BASE_URL=http://localhost:3001`). The dev server is started automatically by Playwright (`vite --mode test`, port `:5173`). First install browsers with `npx playwright install chromium`. E2E specs register their own throwaway users, so no seeded test account is required.

### E2E / test backend wiring

For E2E (or any flow that needs the admin API), always point at the test backend, not the dev one:

- Backend must be started with its **test env** (`.env.test` in `../booking-backend`), which sets `PORT=3001` and `DATABASE_URL=postgres://…/booking_test`. The dev `.env` uses `PORT=3000` and the dev DB — using it for E2E will hit the wrong database and pollute dev data.
- Frontend e2e dev server already loads `.env.test` (`VITE_API_BASE_URL=http://localhost:3001`) via `vite --mode test`.
- When manually probing the test backend (curl/Postman/Insomnia), use `http://localhost:3001` and the seeded admin (`admin@example.com` / `admin12345`) — `/auth/register` only ever creates `role: "user"`, so admins must come from `bun run db:seed` against the **test** DB.
- How to bring up the test backend cleanly: in `../booking-backend`, set `NODE_ENV=test` (so Bun loads `.env.test`), run `bun run db:migrate` + the manual exclusion-constraint SQL, then `bun run db:seed` (once, non-idempotent), then `bun run dev`.

## Setup / gotchas

- Copy `.env.example` to `.env`; `VITE_API_BASE_URL` (default `http://localhost:3000`) must point at a running backend or login/`/auth/me` calls fail on load.
- JWT is stored in `localStorage` under key `token` (see `src/context/AuthContext.tsx`); clearing it logs the user out.
- `src/api/client.ts` is the single API layer (fetch wrapper adding the Bearer token). Backend rejects double-booked slots with HTTP 409 and an `{ error }` body; surfaces as a form-level error message.

## Conventions

- User-facing copy and error strings are in **Indonesian** (`index.html` has `lang="id"`); keep new UI text in Indonesian.
- Colors/fonts are design tokens in `tailwind.config.js` (primary navy `#2F3C7E`, accent amber `#E2A83D`). Use token classes (`bg-primary`, `text-accent`, ...), never raw hex. Shared classes (`btn-primary`, `input-field`, `card`) live in `src/styles/index.css`.
- Fonts (Space Grotesk display, Inter body) are loaded from Google Fonts in `index.html`; use `font-display` / `font-body`.
- Routes are declared in `src/App.tsx`; non-auth routes wrap `<ProtectedRoute>`.

## Workflow

- Changes are spec-driven via OpenSpec (`openspec/`). Follow the `.opencode/skills/openspec-*` skills (propose → apply → archive) for feature work.
- `README.md` and `plan.md` are stale in places (e.g. page filenames); trust the code in `src/` over those docs.
