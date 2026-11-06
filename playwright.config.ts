import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e/specs",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // A cold Vite dependency scan can outlast the first test on a fresh machine.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npx vite --config e2e/vite.config.ts",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
  },
});
