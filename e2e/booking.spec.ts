import { test, expect } from "@playwright/test";
import { registerAndLogin, futureDateISO } from "./helpers";

test("booking ruangan lalu booking slot yang sama memunculkan error konflik", async ({
  page,
}) => {
  await registerAndLogin(page);

  await page.locator("a.card").first().click();
  await expect(
    page.getByRole("button", { name: "Booking ruangan ini" })
  ).toBeVisible();

  const startHour = String(Date.now() % 24).padStart(2, "0");
  await page.locator('input[type="date"]').fill(futureDateISO(30));
  await page.locator('input[type="time"]').fill(`${startHour}:00`);

  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(page.getByText("Booking berhasil dibuat!")).toBeVisible();

  await page.getByRole("button", { name: "Booking ruangan ini" }).click();
  await expect(
    page.getByText(
      "Slot waktu ini sudah dibooking oleh orang lain. Silakan pilih waktu lain."
    )
  ).toBeVisible();
  await expect(page.getByText("Booking berhasil dibuat!")).toBeHidden();
});