import { expect, type Page } from "@playwright/test";

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