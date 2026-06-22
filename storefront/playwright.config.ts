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
 * BASE_URL env var sets the target URL — required, no default. For local dev
 * against the full Docker stack, export BASE_URL=http://localhost:7358 (the
 * stack's web port) explicitly; it isn't defaulted here because that same
 * port number is also where prod listens on the CI runner, and a missing
 * var should fail loud instead of silently driving the suite against prod.
 * See CHANGELOG.md.
 */

// defineConfig — Playwright's typed config factory
// devices     — preset browser + viewport + user-agent combos (e.g., "Desktop Chrome", "iPhone 13")
import { defineConfig, devices } from "@playwright/test";

if (!process.env.BASE_URL) {
  throw new Error("BASE_URL is not set. Export it explicitly before running this e2e suite.");
}

export default defineConfig({
  testDir: "./e2e",
  // Production smoke tests target a live deployment and run via
  // playwright.production.config.ts (test:e2e:production), not the local suite.
  testIgnore: "**/production/**",
  // Provision a test-scoped catalog before the run and remove it after, so the
  // storefront specs have products to exercise without mutating the seed.
  globalSetup: "./e2e/global-provision.ts",
  globalTeardown: "./e2e/global-deprovision.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL,
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
