import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers";

test("pengunjung yang belum login dialihkan ke halaman login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("pengguna baru bisa registrasi lalu login", async ({ page }) => {
  const email = uniqueEmail();
  const password = "rahasia123";

  await page.goto("/register");
  await page.getByPlaceholder("Nama lengkap").fill("Budi E2E");
  await page.getByPlaceholder("kamu@email.com").fill(email);
  await page.getByPlaceholder("Minimal 8 karakter").fill(password);
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.getByText("Ruangan tersedia")).toBeVisible();

  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByPlaceholder("kamu@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Ruangan tersedia")).toBeVisible();
});

test("login dengan kredensial salah menampilkan pesan error", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByPlaceholder("kamu@email.com").fill("tidak-ada@example.com");
  await page.getByPlaceholder("••••••••").fill("salah123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Email atau password salah")).toBeVisible();
});

test("registrasi dengan email duplikat menampilkan pesan error", async ({
  page,
}) => {
  const email = await registerAndLogin(page);
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/register");
  await page.getByPlaceholder("Nama lengkap").fill("Budi E2E");
  await page.getByPlaceholder("kamu@email.com").fill(email);
  await page.getByPlaceholder("Minimal 8 karakter").fill("rahasia123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.getByText("Email sudah terdaftar")).toBeVisible();
});