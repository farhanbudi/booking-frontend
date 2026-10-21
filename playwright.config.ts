import { defineConfig, devices } from "@playwright/test";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const FE_BASE_URL = process.env.VITE_BASE_URL ?? "http://localhost:5173";

const IS_CI = !!process.env.CI;
const HTML_REPORT_DIR = process.env.PLAYWRIGHT_HTML_REPORT_DIR ?? "playwright-report";
const OUTPUT_DIR = process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results";

console.log(`[playwright.config] VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL ?? '(tidak terdefinisi)'}`);
console.log(`[playwright.config] VITE_BASE_URL: ${process.env.VITE_BASE_URL ?? '(tidak terdefinisi)'}`);
console.log(`[playwright.config] CI: ${IS_CI ? 'aktif' : 'nonaktif'}`);
console.log(`[playwright.config] HTML report: ${HTML_REPORT_DIR}`);
console.log(`[playwright.config] Output dir: ${OUTPUT_DIR}`);


export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !IS_CI,
  workers: IS_CI ? 1 : undefined,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  outputDir: OUTPUT_DIR,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: HTML_REPORT_DIR }],
  ],
  use: {
    baseURL: FE_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --mode e2e",
    url: FE_BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
