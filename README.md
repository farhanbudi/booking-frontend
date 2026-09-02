# Booking Frontend

Antarmuka web untuk sistem pemesanan ruangan, dibangun menggunakan React + Vite + Tailwind CSS. Frontend ini terhubung ke [`booking-backend`](https://github.com/farhanbudi/booking-backend) (Bun + ElysiaJS).

Untuk penjelasan teknis mengenai pencegahan double-booking, lihat [README backend](https://github.com/farhanbudi/booking-backend/blob/main/README.md).

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | [React 18](https://react.dev) |
| Build Tool | [Vite](https://vitejs.dev) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) |
| Routing | [React Router v6](https://reactrouter.com) |
| Language | TypeScript |

Design tokens didefinisikan di `tailwind.config.js`:
- **Primary**: Navy `#2F3C7E`
- **Accent**: Amber `#E2A83D`

---

## Instalasi

### Prasyarat

- Node.js ≥ 18
- [`booking-backend`](../booking-backend) berjalan di `http://localhost:3000`

### Langkah Setup

```bash
# 1. Install dependensi
npm install

# 2. Salin dan sesuaikan konfigurasi environment
cp .env.example .env
# Pastikan VITE_API_BASE_URL mengarah ke backend (default: http://localhost:3000)

# 3. Jalankan development server
npm run dev
```

Buka **`http://localhost:5173`** di browser.

---

## Halaman

| Route | Halaman | Keterangan |
|---|---|---|
| `/register` | Register | Registrasi akun baru |
| `/login` | Login | Masuk ke aplikasi, token JWT disimpan di `localStorage` |
| `/` | Daftar Ruangan | Menampilkan seluruh resource yang dapat dipesan |
| `/resources/:id` | Detail Ruangan | Pilih tanggal, lihat slot yang sudah terisi, dan buat booking |
| `/my-bookings` | Booking Saya | Riwayat pemesanan beserta opsi pembatalan |

Apabila pengguna mencoba memesan slot yang telah diambil oleh pengguna lain, backend akan merespons dengan HTTP `409 Conflict` dan pesan kesalahan ditampilkan langsung pada formulir pemesanan.

---

## Struktur Proyek

```
src/
├── api/
│   └── client.ts          # Seluruh pemanggilan API ke backend
├── context/
│   └── AuthContext.tsx    # State autentikasi global (JWT, data pengguna)
├── components/
│   ├── Navbar.tsx         # Navigasi utama
│   └── ProtectedRoute.tsx # Guard untuk rute yang memerlukan autentikasi
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ResourcesPage.tsx
│   ├── ResourceDetailPage.tsx
│   └── MyBookingsPage.tsx
├── styles/                # CSS global
├── App.tsx                # Konfigurasi routing
└── main.tsx               # Entry point
```

---

## Scripts

| Command | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production (typecheck `tsc -b` + `vite build`) |
| `npm run preview` | Preview hasil build production |
| `npm run test` | Jalankan unit/component test (Vitest + React Testing Library) |
| `npm run dev:e2e` | Jalankan Vite dengan mode `e2e` (memuat `.env.e2e`, menunjuk ke backend `:3001`) |
| `npm run test:e2e` | Jalankan end-to-end test (Playwright) |

---

## Testing

### Unit & Component Test

Test unit/komponen menggunakan **Vitest** + **React Testing Library** dengan environment `jsdom`, berjalan **tanpa backend**. File test diletakkan berdampingan dengan sumber kode (`src/**/*.test.ts(x)`).

```bash
npm run test
```

Cakupan test saat ini:

- **API client** (`src/api/client.ts`) — injeksi token Bearer, ekstraksi pesan error dari body `{ error }`, pesan fallback
- **Auth context** (`src/context/AuthContext.tsx`) — pemulihan user dari token, pembersihan token invalid, alur login/register/logout
- **Komponen** — `ProtectedRoute`, `Navbar`
- **Halaman** — `LoginPage`, `RegisterPage`, `ResourcesPage`, `BookingPage`, `MyBookingsPage`

### End-to-End Test (E2E)

Test E2E menggunakan **Playwright** terhadap aplikasi sungguhan yang berjalan di browser Chromium. Frontend E2E memakai backend **test** di `:3001` (`.env.test` di repo `booking-backend`) — bukan backend dev di `:3000`.

**Prasyarat:**

1. Backend test [`booking-backend`](../booking-backend) berjalan di `http://localhost:3001` (bukan `:3000`). Frontend mode E2E memuat `.env.e2e` (`VITE_API_BASE_URL=http://localhost:3001`).
2. Browser Chromium untuk Playwright sudah terpasang:

```bash
npx playwright install chromium
```

> Catatan: Development server frontend (`http://localhost:5173`) dijalankan otomatis oleh Playwright saat test berjalan, jadi tidak perlu di-start manual.

#### Pre-flight checklist (wajib berurutan)

Jalankan langkah-langkah ini **sebelum** `npm run test:e2e`. Jangan mulai Playwright sampai semuanya hijau.

1. **Pastikan backend test hidup di `:3001`.** Backend E2E adalah backend **test** (`NODE_ENV=test` di `../booking-backend`, `PORT=3001`), bukan dev backend di `:3000`.
   - Cek cepat: `curl http://localhost:3001/` (atau endpoint health root).
   - Kalau tidak ada respon, **hentikan dan minta user menyalakan backend test dulu** (`cd ../booking-backend`, lalu `NODE_ENV=test bun run dev` setelah migrate + seed). Jangan lanjut.
   - Kalau user menjalankan dev backend biasa (`:3000`) atau backend belum jalan sama sekali, **batalkan eksekusi E2E** dan minta user menyalakan backend test.
2. **Matikan semua instance frontend yang sedang jalan** (vite biasa di `:5173` dari sesi sebelumnya, proses `npm run dev` / `npm run dev:e2e` yang menggantung, dsb). Konflik port atau mode env akan membuat hasil E2E salah sasaran.
3. **Start ulang frontend dalam mode e2e** dengan `npm run dev:e2e` (memuat `.env.e2e`, `VITE_API_BASE_URL=http://localhost:3001`). Tunggu sampai server siap (banner Vite tercetak di terminal).
4. **Verifikasi URL di terminal.** Saat `npm run dev:e2e` (atau `npm run test:e2e` yang menjalankan `vite --mode e2e` lewat `webServer`) berjalan, Vite akan mencetak variabel env. Bandingkan dengan isi `.env.e2e`:
   - `VITE_API_BASE_URL` di terminal **harus sama** dengan `VITE_API_BASE_URL` di `.env.e2e` (default: `http://localhost:3001`).
   - `VITE_BASE_URL` di terminal **harus sama** dengan `VITE_BASE_URL` di `.env.e2e` (default: `http://localhost:5173`).
   - `playwright.config.ts` juga me-log kedua nilai ini — cocokkan ketiganya (`.env.e2e`, output `playwright.config`, output Vite).
   - **Jika ada yang beda, batalkan**: hentikan proses, jangan jalankan `npm run test:e2e`, dan minta user menyelidiki kenapa env tidak ter-load (mode salah, env file salah, override shell, dsb).
5. Baru jalankan `npm run test:e2e`. Jika Playwright di-start tanpa dev server manual, `webServer.command` (`npx vite --mode e2e`) akan otomatis memuat `.env.e2e` — tetap lakukan verifikasi URL di output Playwright sebelum membiarkan test jalan.

**Menjalankan test:**

```bash
npm run test:e2e
```

Cakupan journey E2E (`e2e/`):

- **Auth** — redirect pengguna yang belum login ke `/login`, registrasi, login, error kredensial salah & email duplikat
- **Booking** — booking ruangan, double-booking slot yang sama memunculkan error `409 Conflict`
- **Booking Saya** — booking muncul di daftar dan bisa dibatalkan

Spec E2E membuat user throwaway sendiri per eksekusi, sehingga tidak memerlukan akun test yang di-seed.
