import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

describe("patch-dashboard-i18n script", () => {
  it("patches only dashboard source translation files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-dashboard-i18n-"));

    const srcEn = path.join(
      tmpDir,
      "node_modules/@medusajs/dashboard/src/i18n/translations/en.json"
    );
    const srcEs = path.join(
      tmpDir,
      "node_modules/@medusajs/dashboard/src/i18n/translations/es.json"
    );
    const distChunk = path.join(
      tmpDir,
      "node_modules/@medusajs/dashboard/dist/chunk-SZ2YWQ76.mjs"
    );

    fs.mkdirSync(path.dirname(srcEn), { recursive: true });
    fs.mkdirSync(path.dirname(srcEs), { recursive: true });
    fs.mkdirSync(path.dirname(distChunk), { recursive: true });

    fs.writeFileSync(srcEn, '{"label":"Welcome to Medusa"}', "utf8");
    fs.writeFileSync(srcEs, '{"label":"Checkout"}', "utf8");
    fs.writeFileSync(distChunk, "checkout", "utf8");

    const scriptPath = path.resolve(process.cwd(), "backend/scripts/patch-dashboard-i18n.mjs");

    execFileSync("node", [scriptPath], {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const nextEn = fs.readFileSync(srcEn, "utf8");
    const nextEs = fs.readFileSync(srcEs, "utf8");
    const nextDistChunk = fs.readFileSync(distChunk, "utf8");

    expect(nextEn).toContain("Bienvenido a Aurelia Backoffice");
    expect(nextEs).toContain("Finalizar compra");
    expect(nextDistChunk).toBe("checkout");
  });
});
