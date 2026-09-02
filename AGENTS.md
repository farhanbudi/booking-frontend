# AGENTS.md

Booking room-reservation frontend: React 18 + Vite 5 + TypeScript + Tailwind v3 + React Router v6. Depends on the sibling backend repo `../booking-backend` (Bun + ElysiaJS) which must be running at `http://localhost:3000`.

## Commands

- `npm run dev` — dev server on port 5173 (fixed in `vite.config.ts`).
- `npm run build` — verification step: runs `tsc -b` typecheck then `vite build`. There is **no lint script**; use `npm run build` to verify type safety and production build.
- `npm run test` — unit/component tests (Vitest + React Testing Library, jsdom). Runs without the backend; no `npm run dev` needed.
- `npm run test:e2e` — Playwright E2E tests (`e2e/`). **Prerequisites:** the **test backend** (`../booking-backend` on `:3001`) must be running, since the e2e dev server loads `.env.e2e` (`VITE_API_BASE_URL=http://localhost:3001`). The dev server is started automatically by Playwright (`vite --mode e2e`, port `:5173`). First install browsers with `npx playwright install chromium`. E2E specs register their own throwaway users, so no seeded test account is required.
- `npm run dev:e2e` — manual Vite dev server bound to the **e2e** environment (loads `.env.e2e` → points at backend on `:3001`). Only use this when you want the e2e frontend up without running Playwright.

### E2E / test backend wiring

For E2E (or any flow that needs the admin API), always point at the test backend, not the dev one:

- Backend must be started with its **test env** (`.env.test` in `../booking-backend`), which sets `PORT=3001` and `DATABASE_URL=postgres://…/booking_test`. The dev `.env` uses `PORT=3000` and the dev DB — using it for E2E will hit the wrong database and pollute dev data.
- Frontend e2e dev server already loads `.env.e2e` (`VITE_API_BASE_URL=http://localhost:3001`) via `vite --mode e2e`.
- When manually probing the test backend (curl/Postman/Insomnia), use `http://localhost:3001` and the seeded admin (`admin@example.com` / `admin12345`) — `/auth/register` only ever creates `role: "user"`, so admins must come from `bun run db:seed` against the **test** DB.
- How to bring up the test backend cleanly: in `../booking-backend`, set `NODE_ENV=test` (so Bun loads `.env.test`), run `bun run db:migrate` + the manual exclusion-constraint SQL, then `bun run db:seed` (once, non-idempotent), then `bun run dev`.

### E2E pre-flight rules (wajib sebelum `npm run test:e2e`)

Ikuti langkah ini **berurutan**. Jangan mulai Playwright sampai semua checklist hijau.

1. **Backend test harus hidup di `:3001` sebelum apa pun.** Backend yang dipakai E2E adalah backend **test** (`.env.test` di `../booking-backend`, `PORT=3001`), bukan dev backend di `:3000`.
   - Cek cepat: `curl http://localhost:3001/` (atau endpoint health root). Kalau tidak ada respon, **hentikan dan minta user menyalakan backend test dulu** — jelaskan perintahnya (`cd ../booking-backend`, `NODE_ENV=test bun run dev` setelah migrate + seed). Jangan lanjut ke langkah berikutnya.
   - Kalau user menjalankan dev backend biasa (`:3000`) atau backend belum jalan sama sekali, **batalkan eksekusi E2E** dan minta user menyalakan backend test.
2. **Matikan semua instance frontend yang sedang jalan** (vite biasa di `:5173` dari sesi sebelumnya, proses `npm run dev` / `npm run dev:e2e` yang menggantung, dsb). Konflik port atau mode env akan bikin hasil E2E salah sasaran.
3. **Start ulang frontend dalam mode e2e** dengan `npm run dev:e2e` (memuat `.env.e2e`, `VITE_API_BASE_URL=http://localhost:3001`). Tunggu sampai server siap (banner Vite tercetak di terminal).
4. **Verifikasi URL di terminal.** Saat `npm run dev:e2e` (atau `npm run test:e2e` yang menjalankan `vite --mode e2e` lewat `webServer`) berjalan, Vite akan mencetak variabel env. Bandingkan dengan isi `.env.e2e`:
   - `VITE_API_BASE_URL` di terminal **harus sama** dengan `VITE_API_BASE_URL` di `.env.e2e` (default: `http://localhost:3001`).
   - `VITE_BASE_URL` di terminal **harus sama** dengan `VITE_BASE_URL` di `.env.e2e` (default: `http://localhost:5173`).
   - `playwright.config.ts` juga akan me-log kedua nilai ini — cocokkan ketiganya (`.env.e2e`, output `playwright.config`, output Vite).
   - **Jika ada yang beda, batalkan**: hentikan proses, jangan jalankan `npm run test:e2e`, dan minta user menyelidiki kenapa env tidak ter-load (mode salah, env file salah, override shell, dsb).
5. Baru jalankan `npm run test:e2e`. Jika Playwright di-start tanpa dev server manual, `webServer.command` (`npx vite --mode e2e`) akan otomatis me-load `.env.e2e` — tetap lakukan verifikasi URL di output Playwright sebelum membiarkan test jalan.

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
