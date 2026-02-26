import { describe, it, expect } from "vitest";
import {
  formatArs,
  translateLabel,
  mapMedusaProduct,
  hasPurchasablePrice,
  isJewelryProduct,
  type Product,
  type UiLanguage,
} from "../shop-data";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_01",
    name: "Test Product",
    description: "A nice product",
    category: "Aros",
    subcategory: "",
    brand: "Aurelia Core",
    image: "/test.jpg",
    price: 10000,
    stock: 5,
    ...overrides,
  };
}

// ─── formatArs ───────────────────────────────────────────────────────────────

describe("formatArs", () => {
  it("returns a non-empty string for a positive amount in 'es'", () => {
    const result = formatArs(10000, "es");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for a positive amount in 'ko'", () => {
    const result = formatArs(10000, "ko");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats zero without decimal places", () => {
    const result = formatArs(0, "es");
    expect(result).not.toMatch(/\./);
  });

  it("includes a currency symbol", () => {
    const result = formatArs(5000, "es");
    // ARS symbol is '$' in es-AR locale
    expect(result).toMatch(/\$|ARS/);
  });

  it("es and ko produce different output for the same number", () => {
    // ko uses ko-KR locale which formats differently
    const es = formatArs(50000, "es");
    const ko = formatArs(50000, "ko");
    // At minimum they use different locale separators or currency notation
    expect(es).not.toBe(ko);
  });

  it("defaults language to 'es' when not provided", () => {
    const withDefault = formatArs(10000);
    const withEs = formatArs(10000, "es");
    expect(withDefault).toBe(withEs);
  });
});

// ─── translateLabel ───────────────────────────────────────────────────────────

describe("translateLabel", () => {
  it("returns the original value when language is 'es'", () => {
    expect(translateLabel("Aros", "es")).toBe("Aros");
    expect(translateLabel("Collares", "es")).toBe("Collares");
    expect(translateLabel("Unknown", "es")).toBe("Unknown");
  });

  it("returns the Korean translation for 'Aros' when language is 'ko'", () => {
    expect(translateLabel("Aros", "ko")).toBe("귀걸이");
  });

  it("returns the Korean translation for 'Collares' when language is 'ko'", () => {
    expect(translateLabel("Collares", "ko")).toBe("목걸이");
  });

  it("returns the Korean translation for 'Best Sellers' when language is 'ko'", () => {
    expect(translateLabel("Best Sellers", "ko")).toBe("베스트셀러");
  });

  it("returns the original value for unmapped keys even in 'ko'", () => {
    expect(translateLabel("SomethingNew", "ko")).toBe("SomethingNew");
  });

  it("handles every jewelry category for 'ko'", () => {
    const expectedKo: Record<string, string> = {
      Pulseras: "팔찌",
      Sets: "세트",
      Kits: "키트",
      Anillos: "반지",
    };
    for (const [label, expected] of Object.entries(expectedKo)) {
      expect(translateLabel(label, "ko")).toBe(expected);
    }
  });
});

// ─── hasPurchasablePrice ──────────────────────────────────────────────────────

describe("hasPurchasablePrice", () => {
  it("returns true for a product with a positive price", () => {
    expect(hasPurchasablePrice(makeProduct({ price: 1 }))).toBe(true);
    expect(hasPurchasablePrice(makeProduct({ price: 99999 }))).toBe(true);
  });

  it("returns false for a product with price = 0", () => {
    expect(hasPurchasablePrice(makeProduct({ price: 0 }))).toBe(false);
  });

  it("returns false for a product with a negative price", () => {
    expect(hasPurchasablePrice(makeProduct({ price: -100 }))).toBe(false);
  });
});

// ─── isJewelryProduct ────────────────────────────────────────────────────────

describe("isJewelryProduct", () => {
  it("returns true for a product in a known jewelry category", () => {
    for (const cat of ["Aros", "Collares", "Pulseras", "Sets", "Kits", "Anillos", "Perlas"]) {
      expect(isJewelryProduct(makeProduct({ category: cat }))).toBe(true);
    }
  });

  it("returns false for a product whose name/description contains a clothing keyword", () => {
    const p = makeProduct({ category: "", name: "Cool hoodie", description: "" });
    expect(isJewelryProduct(p)).toBe(false);
  });

  it("returns false for a shirt product", () => {
    expect(isJewelryProduct(makeProduct({ category: "", name: "Aurelia shirt", description: "" }))).toBe(false);
  });

  it("returns true for a product whose name contains 'aro' (ring inference)", () => {
    const p = makeProduct({ category: "", name: "Aro dorado", description: "" });
    expect(isJewelryProduct(p)).toBe(true);
  });

  it("returns true for a product whose description contains 'collar'", () => {
    const p = makeProduct({ category: "", name: "Item", description: "Collar plateado" });
    expect(isJewelryProduct(p)).toBe(true);
  });

  it("returns false for a product in no known category and no inferrable keywords", () => {
    const p = makeProduct({ category: "", name: "Generic item", description: "A random thing" });
    expect(isJewelryProduct(p)).toBe(false);
  });
});

// ─── mapMedusaProduct ────────────────────────────────────────────────────────

describe("mapMedusaProduct", () => {
  const makeRawProduct = (overrides: Record<string, unknown> = {}) => ({
    id: "prod_raw_01",
    title: "Raw Product",
    description: "A raw product",
    thumbnail: "https://example.com/img.jpg",
    categories: [{ name: "Aros" }],
    metadata: {},
    variants: [
      {
        id: "var_01",
        title: "Default",
        inventory_quantity: 10,
        calculated_price: { calculated_amount: 5000, original_amount: 6000 },
        prices: [{ amount: 5000 }],
      },
    ],
    images: [],
    ...overrides,
  });

  it("maps id and title", () => {
    const result = mapMedusaProduct(makeRawProduct());
    expect(result.id).toBe("prod_raw_01");
    expect(result.name).toBe("Raw Product");
  });

  it("maps the calculated price from the first variant", () => {
    const result = mapMedusaProduct(makeRawProduct());
    expect(result.price).toBe(5000);
  });

  it("maps originalPrice when it differs from calculated price", () => {
    const result = mapMedusaProduct(makeRawProduct());
    expect(result.originalPrice).toBe(6000);
  });

  it("omits originalPrice when it equals the calculated price", () => {
    const raw = makeRawProduct({
      variants: [
        {
          id: "var_01",
          title: "Default",
          inventory_quantity: 5,
          calculated_price: { calculated_amount: 5000, original_amount: 5000 },
          prices: [{ amount: 5000 }],
        },
      ],
    });
    expect(mapMedusaProduct(raw).originalPrice).toBeUndefined();
  });

  it("aggregates total stock across all variants", () => {
    const raw = makeRawProduct({
      variants: [
        { id: "v1", title: "S", inventory_quantity: 3, calculated_price: { calculated_amount: 1000 }, prices: [] },
        { id: "v2", title: "M", inventory_quantity: 7, calculated_price: { calculated_amount: 1000 }, prices: [] },
      ],
    });
    expect(mapMedusaProduct(raw).stock).toBe(10);
  });

  it("reads category from metadata when present", () => {
    const raw = makeRawProduct({ metadata: { category: "Pulseras" } });
    expect(mapMedusaProduct(raw).category).toBe("Pulseras");
  });

  it("falls back to categories[0].name when metadata has no category", () => {
    const raw = makeRawProduct({ metadata: {}, categories: [{ name: "Collares" }] });
    expect(mapMedusaProduct(raw).category).toBe("Collares");
  });

  it("maps a full https thumbnail URL as-is", () => {
    const raw = makeRawProduct({ thumbnail: "https://cdn.example.com/img.jpg" });
    expect(mapMedusaProduct(raw).image).toBe("https://cdn.example.com/img.jpg");
  });

  it("uses /file.svg for an empty thumbnail", () => {
    const raw = makeRawProduct({ thumbnail: "" });
    expect(mapMedusaProduct(raw).image).toBe("/file.svg");
  });

  it("maps variants array with id, label, and stock", () => {
    const result = mapMedusaProduct(makeRawProduct());
    expect(result.variants).toHaveLength(1);
    expect(result.variants?.[0]).toMatchObject({ id: "var_01", label: "Default", stock: 10 });
  });

  it("uses price 0 when no variants are present", () => {
    const raw = makeRawProduct({ variants: [] });
    expect(mapMedusaProduct(raw).price).toBe(0);
  });

  it("uses stock 0 when variants have no inventory_quantity", () => {
    const raw = makeRawProduct({
      variants: [{ id: "v1", title: "S", calculated_price: { calculated_amount: 1000 }, prices: [] }],
    });
    expect(mapMedusaProduct(raw).stock).toBe(0);
  });
});
