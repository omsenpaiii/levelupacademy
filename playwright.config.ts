import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  use: {
    actionTimeout: 15000,
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  workers: 1,
  reporter: "list",
  timeout: 60000,
});
