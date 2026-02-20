import { describe, it, expect } from "vitest";

import {
  translateLabel,
  getProductName,
  getProductDescription,
  formatArs,
  navCategories,
  subcategories,
  brands,
  sortOptions,
  type Product,
} from "./shop-data";

// Shared mock product for tests that need a Product object
const mockProduct: Product = {
  id: "test-product",
  name: "Test Product Name",
  description: "Test product description.",
  category: "Aros",
  subcategory: "Esenciales",
  brand: "Aurelia Core",
  image: "https://example.com/image.jpg",
  price: 18900,
  stock: 5,
};

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
  it("returns the product name for 'es'", () => {
    expect(getProductName(mockProduct, "es")).toBe("Test Product Name");
  });

  it("returns the product name for 'ko'", () => {
    expect(getProductName(mockProduct, "ko")).toBe("Test Product Name");
  });

  it("returns a string for any product", () => {
    const result = getProductName(mockProduct, "es");
    expect(typeof result).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// getProductDescription
// ---------------------------------------------------------------------------
describe("getProductDescription", () => {
  it("returns the product description for 'es'", () => {
    expect(getProductDescription(mockProduct, "es")).toBe("Test product description.");
  });

  it("returns the product description for 'ko'", () => {
    expect(getProductDescription(mockProduct, "ko")).toBe("Test product description.");
  });

  it("returns a string for any product", () => {
    const result = getProductDescription(mockProduct, "ko");
    expect(typeof result).toBe("string");
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
