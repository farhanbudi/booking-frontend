import { expect, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function uniqueEmail(): string {
  return `e2e-${Date.now()}@example.com`;
}

export function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function registerAndLogin(page: Page) {
  const email = uniqueEmail();
  await page.goto("/register");
  await page.getByPlaceholder("Nama lengkap").fill("Budi E2E");
  await page.getByPlaceholder("kamu@email.com").fill(email);
  await page.getByPlaceholder("Minimal 8 karakter").fill("rahasia123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.getByText("Ruangan tersedia")).toBeVisible();
  return email;
}

// Resource hasil seed backend dengan pricePerHour = 0, jadi booking langsung
// "confirmed" dan tidak masuk ke alur pembayaran Stripe.
export const FREE_RESOURCE_NAME = "Pod Diskusi Kecil";

/**
 * Buka halaman booking dari daftar ruangan. Memakai nama resource (bukan
 * `.first()`) supaya tidak bergantung pada urutan resource di API.
 */
export async function openBookingPage(
  page: Page,
  resourceName: string = FREE_RESOURCE_NAME
): Promise<void> {
  await page.locator("a.card", { hasText: resourceName }).first().click();
  await expect(
    page.getByRole("button", { name: "Booking ruangan ini" })
  ).toBeVisible();
  await expect(page.locator(".rbc-calendar")).toBeVisible();
}

/**
 * Pilih slot booking: majukan kalender `daysAhead` hari lewat tombol
 * "Berikutnya" (toolbar kalender berbahasa Indonesia), lalu pilih jam mulai
 * lewat dropdown waktu.
 *
 * Tanggal selalu di masa depan supaya validasi "jam mulai sudah lewat" tidak
 * membuat tombol booking nonaktif, dan jam mulai selalu merupakan jam
 * operasional (08:00-19:30) supaya hasilnya tidak bergantung jam eksekusi.
 */
export async function pickSlot(
  page: Page,
  { daysAhead = 1, time = "09:00" }: { daysAhead?: number; time?: string } = {}
): Promise<void> {
  // Tanggal dasar diambil sebelum navigasi supaya pergantian hari saat test
  // berjalan tidak membuat ekspektasi meleset.
  const base = new Date();

  for (let i = 0; i < daysAhead; i++) {
    await page.getByRole("button", { name: "Berikutnya" }).click();
  }

  // Pastikan kalender benar-benar mendarat di tanggal yang diharapkan. Input
  // tanggal milik toolbar kalender (format "EEEE, d MMMM yyyy" locale id) satu-
  //-satunya input yang ada di dalam container `.rbc-calendar`; input jam mulai
  // berada di luar container itu.
  const expectedDate = format(addDays(base, daysAhead), "EEEE, d MMMM yyyy", {
    locale: idLocale,
  });
  await expect(page.locator(".rbc-calendar input")).toHaveValue(expectedDate);

  // Dropdown "Jam mulai" (DatePicker showTimeSelectOnly) memakai class
  // `input-field`; select "Durasi" juga memakai class yang sama, jadi
  // selector-nya dibatasi ke `input`.
  await page.locator("input.input-field").click();
  await page
    .locator(".react-datepicker__time-list-item")
    .filter({ hasText: new RegExp(`^\\s*${time}\\s*$`) })
    .first()
    .click();
}
