import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/production",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "/artifacts/report", open: "never" }],
  ],
  outputDir: "/artifacts/test-results",
  use: {
    baseURL: process.env.STOREFRONT_URL || "https://aurelia.gleeze.com",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-AR",
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "production-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
