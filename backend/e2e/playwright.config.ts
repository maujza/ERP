import { defineConfig, devices } from "@playwright/test";
import path from "path";

export const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");

// No fallback to localhost:9000: on the self-hosted CI runner that port is
// prod's own backend, not a throwaway dev default — a missing var should
// fail loud, not silently drive admin e2e flows against prod. See
// CHANGELOG.md.
if (!process.env.ADMIN_BASE_URL) {
  throw new Error("ADMIN_BASE_URL is not set. Export it explicitly before running this e2e suite.");
}

export default defineConfig({
  testDir: ".",
  // Provision a test-scoped catalog before the run and remove it after, so the
  // purchase/fulfillment admin flows have a product variant to work with.
  globalSetup: path.join(__dirname, "global-provision.ts"),
  globalTeardown: path.join(__dirname, "global-deprovision.ts"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.ADMIN_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/setup/global-setup.spec.ts",
    },
    {
      name: "admin",
      testIgnore: "**/setup/**",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_AUTH_FILE,
      },
      dependencies: ["setup"],
    },
  ],
});
