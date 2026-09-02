import { defineConfig, devices } from "@playwright/test";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const FE_BASE_URL = process.env.VITE_BASE_URL ?? "http://localhost:5173";

console.log(`[playwright.config] VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL ?? '(tidak terdefinisi)'}`);
console.log(`[playwright.config] VITE_BASE_URL: ${process.env.VITE_BASE_URL ?? '(tidak terdefinisi)'}`);


export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: FE_BASE_URL,
    trace: "on-first-retry",
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
