/**
 * playwright.config.ts — Playwright end-to-end test configuration
 *
 * E2E tests live in storefront/e2e/ and run against a live running stack.
 * They open a real browser, navigate the storefront, and assert on what the user sees.
 *
 * Local vs. CI differences:
 *   CI (process.env.CI set):
 *     - workers: 1       — tests run one at a time to avoid port/resource conflicts
 *     - retries: 2       — flaky tests are retried up to 2 times before failing
 *     - forbidOnly: true — prevents a committed .only test from silently skipping others
 *   Local:
 *     - workers: auto    — tests run in parallel across available CPU cores
 *     - retries: 0       — failures are reported immediately
 *
 * BASE_URL env var overrides the default target URL.
 * Default is http://localhost:7358 — the Docker stack's web port.
 */

// defineConfig — Playwright's typed config factory
// devices     — preset browser + viewport + user-agent combos (e.g., "Desktop Chrome", "iPhone 13")
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:7358",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    locale: "es-AR",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
