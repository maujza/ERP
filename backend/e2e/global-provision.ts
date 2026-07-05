/**
 * global-provision.ts — Playwright globalSetup for the admin E2E suite
 *
 * Provisions the test-scoped catalog (see src/scripts/seed-e2e.ts) before any
 * spec runs, so the admin flows that need a product variant — purchase orders,
 * fulfillment orders — have data to work with. The matching teardown
 * (global-deprovision.ts) removes it after the run.
 */
import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const backendDir = path.join(__dirname, "..");
  console.log("[e2e] removing stale test catalog (cleanup:e2e)...");
  try {
    execSync("npm run cleanup:e2e", { cwd: backendDir, stdio: "inherit" });
  } catch (err) {
    console.warn("[e2e] cleanup:e2e preflight failed:", (err as Error).message);
  }
  console.log("[e2e] provisioning test catalog (seed:e2e)...");
  execSync("npm run seed:e2e", { cwd: backendDir, stdio: "inherit" });
}
