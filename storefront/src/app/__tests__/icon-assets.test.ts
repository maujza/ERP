import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import manifest from "../manifest";

// This file lives at storefront/src/app/__tests__/, so three levels up is the
// storefront root that holds src/ and public/.
const storefrontRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const appDir = join(storefrontRoot, "src", "app");
const publicDir = join(storefrontRoot, "public");

const BRAND_LILAC = "#f2e6f7";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Parse width/height from a PNG IHDR chunk (big-endian, fixed offsets). */
function pngDimensions(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("favicon SVG (src/app/icon.svg)", () => {
  const svg = readFileSync(join(appDir, "icon.svg"), "utf8");

  it("uses a square viewBox so the favicon is not letterboxed", () => {
    const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(match).not.toBeNull();
    const [, width, height] = match!;
    expect(width).toBe(height);
  });

  it("frames the mark on the brand-lilac square", () => {
    expect(svg).toContain(`fill="${BRAND_LILAC}"`);
  });

  it("is labelled for assistive tech", () => {
    expect(svg).toMatch(/aria-label="AURORA"/);
  });
});

describe("generated raster icons", () => {
  it("produces a square apple-touch icon at 180px", () => {
    const file = join(appDir, "apple-icon.png");
    expect(existsSync(file)).toBe(true);
    const { width, height } = pngDimensions(readFileSync(file));
    expect(width).toBe(180);
    expect(height).toBe(180);
  });

  it("writes a multi-size PNG-embedded favicon.ico", () => {
    const ico = readFileSync(join(appDir, "favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(1); // image count
  });
});

describe("manifest icons resolve to real square PNGs", () => {
  for (const icon of manifest().icons ?? []) {
    it(`${icon.src} (${icon.sizes}) exists with matching dimensions`, () => {
      const file = join(publicDir, icon.src.replace(/^\//, ""));
      expect(existsSync(file)).toBe(true);
      const { width, height } = pngDimensions(readFileSync(file));
      const expected = Number(String(icon.sizes).split("x")[0]);
      expect(width).toBe(expected);
      expect(height).toBe(expected);
    });
  }
});

describe("brand color consistency", () => {
  it("layout viewport theme color matches the manifest", () => {
    const layout = readFileSync(join(appDir, "layout.tsx"), "utf8");
    expect(layout).toContain(`themeColor: "${BRAND_LILAC}"`);
    expect(manifest().theme_color).toBe(BRAND_LILAC);
  });
});
