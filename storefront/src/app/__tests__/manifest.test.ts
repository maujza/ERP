import { describe, it, expect } from "vitest";

import manifest from "../manifest";

// Brand lilac shared by the favicon, manifest, and <html> background.
const BRAND_LILAC = "#f2e6f7";

describe("PWA manifest", () => {
  const result = manifest();

  it("identifies the AURORA brand", () => {
    expect(result.name).toBe("AURORA Shop");
    expect(result.short_name).toBe("AURORA");
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
  });

  it("uses the brand lilac for theme and background", () => {
    expect(result.theme_color).toBe(BRAND_LILAC);
    expect(result.background_color).toBe(BRAND_LILAC);
  });

  it("declares 192 and 512 PNG icons", () => {
    const icons = result.icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(icon.src).toMatch(/^\/icon-\d+\.png$/);
    }
  });

  it("provides a maskable variant for adaptive launchers", () => {
    const icons = result.icons ?? [];
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
