import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/global-setup.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // donate/KYC mutate DB; serial run avoids cross-test interference
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: ["**/iphone-audit.spec.ts", "**/button-explorer.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Task 65 (audit): iPhone Safari (WebKit) crawl of every screen.
    {
      name: "iphone-webkit",
      testMatch: ["**/iphone-audit.spec.ts", "**/button-explorer.spec.ts"],
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8080",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
