import { test, expect } from "@playwright/test";
import { registerAndLogin, futureDateISO } from "./helpers";

test("booking muncul di Booking Saya dan bisa dibatalkan", async ({ page }) => {
  await registerAndLogin(page);

  await page.locator("a.card").first().click();
  await expect(
    page.getByRole("button", { name: "Booking ruangan ini" })
  ).toBeVisible();

  const startHour = String((Date.now() + 1000) % 24).padStart(2, "0");
  await page.locator('input[type="date"]').fill(futureDateISO(45));
  await page.locator('input[type="time"]').fill(`${startHour}:00`);

  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(page.getByText("Booking berhasil dibuat!")).toBeVisible();

  await page.getByText("Booking Saya").click();
  await expect(page.getByRole("button", { name: "Batalkan" })).toBeVisible();

  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(page.getByText("Dibatalkan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Batalkan" })).toHaveCount(0);
});