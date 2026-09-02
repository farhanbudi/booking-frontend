import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";
import { writeFileSync } from "fs";

test("debug booking page", async ({ page }) => {
  await registerAndLogin(page);
  await page.locator("a.card").first().click();
  await expect(page.getByRole("button", { name: "Booking ruangan ini" })).toBeVisible();
  await page.screenshot({ path: "C:/Users/LENOVO/AppData/Local/Temp/opencode/booking-page.png", fullPage: true });
  const html = await page.content();
  writeFileSync("C:/Users/LENOVO/AppData/Local/Temp/opencode/booking-page.html", html);
  const timeInputs = await page.locator("input").all();
  console.log("Found", timeInputs.length, "input elements");
  for (const t of timeInputs) {
    const type = await t.getAttribute("type");
    const cls = await t.getAttribute("class");
    const name = await t.getAttribute("name");
    console.log("  input type=", type, "class=", cls, "name=", name);
  }
  expect(true).toBe(true);
});
