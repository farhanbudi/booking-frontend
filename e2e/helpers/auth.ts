import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_PASSWORD = "admin12345";

export function uniqueAdminResourceName(prefix = "Test Room"): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function uniqueUserEmail(): string {
  return `e2e-admin-test-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}@example.com`;
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("kamu@email.com").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Ruangan tersedia")).toBeVisible();
  // Di navbar, menu admin adalah BUTTON dropdown (bukan link) yang memuat
  // menuitem "Kelola Ruangan" dan "Kelola Booking".
  await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
}

/**
 * Buka dropdown "Admin" di navbar lalu klik salah satu menuitem-nya.
 * Dropdown hanya dirender saat terbuka, jadi menuitem tidak ada di DOM
 * sebelum tombol "Admin" diklik.
 */
export async function openAdminMenu(
  page: Page,
  item: "Kelola Ruangan" | "Kelola Booking"
): Promise<void> {
  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

export async function registerAndLoginAsUser(
  page: Page
): Promise<{ email: string; password: string }> {
  const email = uniqueUserEmail();
  const password = "rahasia123";
  await page.goto("/register");
  await page.getByPlaceholder("Nama lengkap").fill("E2E User Biasa");
  await page.getByPlaceholder("kamu@email.com").fill(email);
  await page.getByPlaceholder("Minimal 8 karakter").fill(password);
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.getByText("Ruangan tersedia")).toBeVisible();
  return { email, password };
}

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  // Reload supaya state di memori AuthContext ikut ter-reset (token dihapus).
  await page.reload();
}
