import { test, expect } from "@playwright/test";
import { registerAndLogin, openBookingPage, pickSlot } from "./helpers";

test("booking ruangan lalu booking slot yang sama memunculkan error konflik", async ({
  page,
}) => {
  await registerAndLogin(page);
  await openBookingPage(page);

  // Slot 1 hari ke depan jam 09:00: pasti di masa depan (tombol booking
  // tidak disabled), jam operasional, dan tidak bentrok dengan test lain.
  await pickSlot(page, { daysAhead: 1, time: "09:00" });

  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(
    page.getByText("Booking berhasil dibuat!")
  ).toBeVisible();

  // Booking slot yang sama sekali lagi harus ditolak backend (409).
  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(
    page.getByText(
      "Slot waktu ini sudah dibooking oleh orang lain. Silakan pilih waktu lain."
    )
  ).toBeVisible();

  // Bersihkan booking yang baru dibuat supaya slot ini bebas lagi untuk
  // run berikutnya (booking status "cancelled" tidak menahan slot).
  await page.getByRole("link", { name: "Booking Saya" }).click();
  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(page.getByText("Dibatalkan")).toBeVisible();
});
