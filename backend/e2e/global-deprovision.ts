/**
 * global-deprovision.ts — Playwright globalTeardown for the admin E2E suite
 *
 * Removes the test-scoped catalog provisioned by global-provision.ts so the
 * database returns to its pre-run state. See src/scripts/cleanup-e2e.ts.
 */
import { execSync } from "node:child_process";
import path from "node:path";

export default function globalTeardown() {
  const backendDir = path.join(__dirname, "..");
  console.log("[e2e] removing test catalog (cleanup:e2e)...");
  try {
    execSync("npm run cleanup:e2e", { cwd: backendDir, stdio: "inherit" });
  } catch (err) {
    // Teardown must not fail the run; log and move on.
    console.warn("[e2e] cleanup:e2e failed:", (err as Error).message);
  }
}
