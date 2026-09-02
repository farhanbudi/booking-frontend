import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  console.log(`[vite.config] mode: ${mode}`);
  console.log(`[vite.config] VITE_API_BASE_URL: ${env.VITE_API_BASE_URL ?? "(tidak terdefinisi)"}`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/vitest-setup.ts",
      exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    },
  };
});