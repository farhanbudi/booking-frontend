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

Test E2E menggunakan **Playwright** terhadap aplikasi sungguhan yang berjalan di browser Chromium.

**Prasyarat:**

1. Backend test [`booking-backend`](../booking-backend) berjalan di `http://localhost:3001` (bukan `:3000`). Playwright menjalankan frontend dengan `vite --mode test` yang memuat `.env.test`, sehingga frontend menunjuk ke `:3001`.
2. Browser Chromium untuk Playwright sudah terpasang:

```bash
npx playwright install chromium
```

> Catatan: Development server frontend (`http://localhost:5173`) dijalankan otomatis oleh Playwright saat test berjalan, jadi tidak perlu di-start manual.

**Menjalankan test:**

```bash
# Pastikan booking-backend jalan di port 3001, lalu:
npm run test:e2e
```

Cakupan journey E2E (`e2e/`):

- **Auth** — redirect pengguna yang belum login ke `/login`, registrasi, login, error kredensial salah & email duplikat
- **Booking** — booking ruangan, double-booking slot yang sama memunculkan error `409 Conflict`
- **Booking Saya** — booking muncul di daftar dan bisa dibatalkan

Spec E2E membuat user throwaway sendiri per eksekusi, sehingga tidak memerlukan akun test yang di-seed.
