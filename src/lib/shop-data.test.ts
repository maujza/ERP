import { describe, it, expect } from "vitest";

import {
  translateLabel,
  getProductName,
  getProductDescription,
  formatArs,
  getProductById,
  products,
  navCategories,
  subcategories,
  brands,
  sortOptions,
} from "./shop-data";

// ---------------------------------------------------------------------------
// translateLabel
// ---------------------------------------------------------------------------
describe("translateLabel", () => {
  it("returns the value unchanged for 'es'", () => {
    expect(translateLabel("Novedades", "es")).toBe("Novedades");
    expect(translateLabel("Aros", "es")).toBe("Aros");
    expect(translateLabel("Best Sellers", "es")).toBe("Best Sellers");
    expect(translateLabel("Todos", "es")).toBe("Todos");
  });

  it("returns Korean for 'Novedades'", () => {
    expect(translateLabel("Novedades", "ko")).toBe("신상품");
  });

  it("returns Korean for 'Best Sellers'", () => {
    expect(translateLabel("Best Sellers", "ko")).toBe("베스트셀러");
  });

  it("returns Korean for each category", () => {
    expect(translateLabel("Aros", "ko")).toBe("귀걸이");
    expect(translateLabel("Collares", "ko")).toBe("목걸이");
    expect(translateLabel("Pulseras", "ko")).toBe("팔찌");
    expect(translateLabel("Sets", "ko")).toBe("세트");
    expect(translateLabel("Kits", "ko")).toBe("키트");
    expect(translateLabel("Anillos", "ko")).toBe("반지");
  });

  it("returns Korean for subcategories", () => {
    expect(translateLabel("Esenciales", "ko")).toBe("에센셜");
    expect(translateLabel("Fiesta", "ko")).toBe("파티");
    expect(translateLabel("Todos", "ko")).toBe("전체");
  });

  it("returns Korean for variant labels", () => {
    expect(translateLabel("Dorado", "ko")).toBe("골드");
    expect(translateLabel("Plateado", "ko")).toBe("실버");
    expect(translateLabel("Tienda chica", "ko")).toBe("소형 매장");
    expect(translateLabel("Tienda grande", "ko")).toBe("대형 매장");
    expect(translateLabel("Set x5", "ko")).toBe("세트 x5");
    expect(translateLabel("Set x8", "ko")).toBe("세트 x8");
  });

  it("returns Korean for brands", () => {
    expect(translateLabel("Aurelia Core", "ko")).toBe("아우렐리아 코어");
    expect(translateLabel("Aurelia Studio", "ko")).toBe("아우렐리아 스튜디오");
    expect(translateLabel("Aurelia Pro", "ko")).toBe("아우렐리아 프로");
    expect(translateLabel("Lumiere", "ko")).toBe("루미에르");
    expect(translateLabel("Boreal", "ko")).toBe("보레알");
  });

  it("returns Korean for price range labels", () => {
    expect(translateLabel("Hasta $20.000", "ko")).toBe("20,000 이하");
    expect(translateLabel("$20.000 - $30.000", "ko")).toBe("20,000 - 30,000");
    expect(translateLabel("Mas de $30.000", "ko")).toBe("30,000 이상");
  });

  it("falls back to original value for unknown Korean label", () => {
    expect(translateLabel("Unknown Label", "ko")).toBe("Unknown Label");
    expect(translateLabel("", "ko")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getProductName
// ---------------------------------------------------------------------------
describe("getProductName", () => {
  it("returns Spanish name for 'es'", () => {
    const p = products.find((x) => x.id === "siena-pack")!;
    expect(getProductName(p, "es")).toBe("Pack Argollas Siena");
  });

  it("returns Korean name for 'ko'", () => {
    const p = products.find((x) => x.id === "siena-pack")!;
    expect(getProductName(p, "ko")).toBe("시에나 후프 팩");
  });

  it("returns Korean names for every product", () => {
    const koNames: Record<string, string> = {
      "siena-pack": "시에나 후프 팩",
      "layering-aura": "아우라 레이어링",
      "capri-pulseras": "카프리 브레이슬릿 믹스",
      "statement-eclair": "스테이트먼트 에클레어",
      "materia-collar": "마테리아 체인",
      "kit-vitrina": "프리미엄 쇼케이스 키트",
      "set-perlas": "보레알 펄 세트",
      "acero-siena": "시에나 스틸 후프",
      "choker-luna": "루나 초커",
      "anillo-wave": "웨이브 링",
    };
    for (const product of products) {
      expect(getProductName(product, "ko")).toBe(koNames[product.id]);
    }
  });

  it("falls back to Spanish name for unknown product ID in ko", () => {
    const fake = { ...products[0], id: "does-not-exist" };
    expect(getProductName(fake, "ko")).toBe(fake.name);
  });
});

// ---------------------------------------------------------------------------
// getProductDescription
// ---------------------------------------------------------------------------
describe("getProductDescription", () => {
  it("returns Spanish description for 'es'", () => {
    const p = products.find((x) => x.id === "siena-pack")!;
    expect(getProductDescription(p, "es")).toBe(
      "Micro circonias, baño oro 18K y tres diámetros combinables."
    );
  });

  it("returns Korean description for 'ko'", () => {
    const p = products.find((x) => x.id === "siena-pack")!;
    expect(getProductDescription(p, "ko")).toBe(
      "마이크로 지르코니아, 18K 골드 도금, 3가지 지름 구성."
    );
  });

  it("returns Korean descriptions for every product", () => {
    const koCodes = products.map((p) => p.id);
    for (const id of koCodes) {
      const p = products.find((x) => x.id === id)!;
      const desc = getProductDescription(p, "ko");
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  it("falls back to Spanish description for unknown product ID in ko", () => {
    const fake = { ...products[0], id: "does-not-exist" };
    expect(getProductDescription(fake, "ko")).toBe(fake.description);
  });
});

// ---------------------------------------------------------------------------
// formatArs
// ---------------------------------------------------------------------------
describe("formatArs", () => {
  it("formats as ARS currency for 'es' (contains '$' or 'ARS')", () => {
    const result = formatArs(18900, "es");
    expect(result).toMatch(/\$|ARS/);
  });

  it("includes the numeric value for 'es'", () => {
    const result = formatArs(18900, "es");
    expect(result).toContain("18");
    expect(result).toContain("900");
  });

  it("formats without fractional digits", () => {
    // maximumFractionDigits: 0 → no decimal portion (e.g. ",00").
    // es-AR uses '.' as thousands separator so 18900 → "$ 18.900" (no trailing ",00").
    const result = formatArs(18900, "es");
    expect(result).not.toMatch(/,\d{2}$/);
  });

  it("formats correctly for 'ko' locale", () => {
    const result = formatArs(18900, "ko");
    expect(result).toContain("18");
    expect(result).toContain("900");
  });

  it("defaults to 'es' locale when no language is passed", () => {
    const withEs = formatArs(5000, "es");
    const withDefault = formatArs(5000);
    expect(withEs).toBe(withDefault);
  });

  it("handles zero", () => {
    const result = formatArs(0, "es");
    expect(result).toMatch(/\$|ARS/);
    expect(result).toContain("0");
  });

  it("handles large values", () => {
    const result = formatArs(98500, "es");
    expect(result).toContain("98");
    expect(result).toContain("500");
  });
});

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------
describe("getProductById", () => {
  it("returns the correct product for each known ID", () => {
    for (const product of products) {
      const found = getProductById(product.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(product.id);
    }
  });

  it("returns the expected product name for siena-pack", () => {
    const p = getProductById("siena-pack");
    expect(p?.name).toBe("Pack Argollas Siena");
  });

  it("returns the expected price for kit-vitrina", () => {
    const p = getProductById("kit-vitrina");
    expect(p?.price).toBe(98500);
  });

  it("returns undefined for an unknown ID", () => {
    expect(getProductById("nonexistent-id")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getProductById("")).toBeUndefined();
  });

  it("is case-sensitive", () => {
    expect(getProductById("SIENA-PACK")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// products data shape
// ---------------------------------------------------------------------------
describe("products array", () => {
  it("contains exactly 10 products", () => {
    expect(products).toHaveLength(10);
  });

  it("every product has all required string fields", () => {
    for (const p of products) {
      expect(typeof p.id).toBe("string");
      expect(p.id).toBeTruthy();
      expect(typeof p.name).toBe("string");
      expect(p.name).toBeTruthy();
      expect(typeof p.description).toBe("string");
      expect(p.description).toBeTruthy();
      expect(typeof p.category).toBe("string");
      expect(p.category).toBeTruthy();
      expect(typeof p.subcategory).toBe("string");
      expect(p.subcategory).toBeTruthy();
      expect(typeof p.brand).toBe("string");
      expect(p.brand).toBeTruthy();
      expect(typeof p.image).toBe("string");
      expect(p.image).toBeTruthy();
    }
  });

  it("every product has a positive price", () => {
    for (const p of products) {
      expect(typeof p.price).toBe("number");
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it("every product has a non-negative stock", () => {
    for (const p of products) {
      expect(typeof p.stock).toBe("number");
      expect(p.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("discounted products have originalPrice > price", () => {
    const discounted = products.filter((p) => p.originalPrice !== undefined);
    expect(discounted.length).toBeGreaterThan(0);
    for (const p of discounted) {
      expect(p.originalPrice).toBeGreaterThan(p.price);
    }
  });

  it("at least one product is out of stock (stock === 0)", () => {
    const outOfStock = products.find((p) => p.stock === 0);
    expect(outOfStock).toBeDefined();
    expect(outOfStock?.id).toBe("set-perlas");
  });

  it("at least one product has variants", () => {
    const withVariants = products.filter(
      (p) => p.variants && p.variants.length > 0
    );
    expect(withVariants.length).toBeGreaterThan(0);
  });

  it("variants each have id, label, and non-negative stock", () => {
    for (const p of products) {
      if (!p.variants) continue;
      for (const v of p.variants) {
        expect(typeof v.id).toBe("string");
        expect(v.id).toBeTruthy();
        expect(typeof v.label).toBe("string");
        expect(v.label).toBeTruthy();
        expect(typeof v.stock).toBe("number");
        expect(v.stock).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("products have unique IDs", () => {
    const ids = products.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("siena-pack has dorado and plateado variants", () => {
    const p = getProductById("siena-pack")!;
    const variantIds = p.variants?.map((v) => v.id) ?? [];
    expect(variantIds).toContain("dorado");
    expect(variantIds).toContain("plateado");
  });
});

// ---------------------------------------------------------------------------
// navCategories
// ---------------------------------------------------------------------------
describe("navCategories", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(navCategories)).toBe(true);
    expect(navCategories.length).toBeGreaterThan(0);
  });

  it("contains core categories", () => {
    expect(navCategories).toContain("Novedades");
    expect(navCategories).toContain("Best Sellers");
    expect(navCategories).toContain("Aros");
    expect(navCategories).toContain("Collares");
    expect(navCategories).toContain("Pulseras");
    expect(navCategories).toContain("Sets");
    expect(navCategories).toContain("Kits");
  });
});

// ---------------------------------------------------------------------------
// subcategories
// ---------------------------------------------------------------------------
describe("subcategories", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(subcategories)).toBe(true);
    expect(subcategories.length).toBeGreaterThan(0);
  });

  it("starts with 'Todos'", () => {
    expect(subcategories[0]).toBe("Todos");
  });

  it("contains all expected subcategories", () => {
    expect(subcategories).toContain("Novedades");
    expect(subcategories).toContain("Best Sellers");
    expect(subcategories).toContain("Esenciales");
    expect(subcategories).toContain("Fiesta");
    expect(subcategories).toContain("Kits");
  });
});

// ---------------------------------------------------------------------------
// brands
// ---------------------------------------------------------------------------
describe("brands", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(brands)).toBe(true);
    expect(brands.length).toBeGreaterThan(0);
  });

  it("contains all expected brands", () => {
    expect(brands).toContain("Aurelia Core");
    expect(brands).toContain("Aurelia Studio");
    expect(brands).toContain("Lumiere");
    expect(brands).toContain("Boreal");
    expect(brands).toContain("Aurelia Pro");
  });
});

// ---------------------------------------------------------------------------
// sortOptions
// ---------------------------------------------------------------------------
describe("sortOptions", () => {
  it("has exactly 3 options", () => {
    expect(sortOptions).toHaveLength(3);
  });

  it("has 'recommended' as the first option", () => {
    expect(sortOptions[0].id).toBe("recommended");
  });

  it("includes price_asc and price_desc", () => {
    const ids = sortOptions.map((o) => o.id);
    expect(ids).toContain("price_asc");
    expect(ids).toContain("price_desc");
  });

  it("each option has an id and label", () => {
    for (const option of sortOptions) {
      expect(option.id).toBeTruthy();
      expect(option.label).toBeTruthy();
    }
  });
});
