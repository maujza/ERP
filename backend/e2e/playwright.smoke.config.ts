import { defineConfig, devices } from "@playwright/test"
import path from "path"

const adminAuthFile = path.join(__dirname, ".auth/admin.json")

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.ADMIN_BASE_URL || "http://localhost:9000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/setup/global-setup.spec.ts",
    },
    {
      name: "admin",
      testMatch: "**/admin/admin-access.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: adminAuthFile,
      },
      dependencies: ["setup"],
    },
  ],
})
