import { defineConfig, devices } from "@playwright/test";
import path from "path";

export const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.ADMIN_BASE_URL || "http://localhost:9000",
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
