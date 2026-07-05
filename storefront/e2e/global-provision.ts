/**
 * global-provision.ts — Playwright globalSetup for the storefront E2E suite
 *
 * The storefront specs (catalog, product, cart, checkout, home, search) run
 * against the live stack and need a populated catalog. This provisions the same
 * test-scoped products the admin suite uses by invoking the backend's seed:e2e
 * script, then global-deprovision.ts removes them after the run. The committed
 * seed and SEED_DEMO_DATA stay untouched — data exists only for this run.
 */
import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const rootDir = path.resolve(__dirname, "../..");
  const backendDir = path.resolve(__dirname, "../../backend");
  console.log("[e2e] removing stale test catalog (cleanup:e2e)...");
  try {
    execSync("npm run cleanup:e2e", { cwd: backendDir, stdio: "inherit" });
  } catch (err) {
    console.warn("[e2e] cleanup:e2e preflight failed:", (err as Error).message);
  }
  console.log("[e2e] provisioning test catalog (seed:e2e)...");
  execSync("npm run seed:e2e", { cwd: backendDir, stdio: "inherit" });
  console.log("[e2e] syncing storefront Medusa env...");
  execSync("./scripts/sync-medusa-env.sh", { cwd: rootDir, stdio: "inherit" });
}
