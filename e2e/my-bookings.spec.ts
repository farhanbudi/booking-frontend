import { test, expect } from "@playwright/test";
import { registerAndLogin, openBookingPage, pickSlot } from "./helpers";

test("booking muncul di Booking Saya dan bisa dibatalkan", async ({ page }) => {
  await registerAndLogin(page);
  await openBookingPage(page);

  // 2 hari ke depan (beda dari test booking konflik) supaya slot resource
  // yang sama tidak saling bentrok.
  await pickSlot(page, { daysAhead: 2, time: "09:00" });

  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(page.getByText("Booking berhasil dibuat!")).toBeVisible();

  await page.getByRole("link", { name: "Booking Saya" }).click();
  await expect(page.getByRole("button", { name: "Batalkan" })).toBeVisible();

  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(page.getByText("Dibatalkan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Batalkan" })).toHaveCount(0);
});
