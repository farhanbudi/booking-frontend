import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("booking ruangan lalu booking slot yang sama memunculkan error konflik", async ({
  page,
}) => {
  await registerAndLogin(page);

  await page.locator("a.card").first().click();
  await expect(
    page.getByRole("button", { name: "Booking ruangan ini" })
  ).toBeVisible();
  await expect(page.locator(".rbc-calendar")).toBeVisible();

  const nextButton = page.getByRole("button", { name: "Next" });
  for (let i = 0; i < 30; i++) {
    await nextButton.click();
  }

  const startHour = String(Date.now() % 24).padStart(2, "0");
  await page.locator("input.input-field").click();
  await page
    .locator(".react-datepicker__time-list-item")
    .filter({ hasText: new RegExp(`^${startHour}:00$`) })
    .first()
    .click();

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