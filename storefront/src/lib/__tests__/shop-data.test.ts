import { describe, it, expect } from "vitest";
import {
  formatArs,
  translateLabel,
  mapMedusaProduct,
  hasPurchasablePrice,
  isJewelryProduct,
  getProductName,
  getProductDescription,
  navCategories,
  subcategories,
  brands,
  sortOptions,
  type Product,
  type UiLanguage,
} from "../shop-data";

// ─── shared fixtures ──────────────────────────────────────────────────────────

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

  it("handles large values", () => {
    const result = formatArs(98500, "es");
    expect(result).toContain("98");
    expect(result).toContain("500");
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
    expect(translateLabel("", "ko")).toBe("");
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

  it("returns Korean for 'Novedades'", () => {
    expect(translateLabel("Novedades", "ko")).toBe("신상품");
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

// ─── getProductName ───────────────────────────────────────────────────────────

describe("getProductName", () => {
  it("returns the product name for 'es'", () => {
    expect(getProductName(mockProduct, "es")).toBe("Test Product Name");
  });

  it("falls back to Spanish name for 'ko' when nameKo is absent", () => {
    expect(getProductName(mockProduct, "ko")).toBe("Test Product Name");
  });

  it("returns nameKo when language is 'ko' and nameKo is set", () => {
    const product: Product = { ...mockProduct, nameKo: "테스트 제품 이름" };
    expect(getProductName(product, "ko")).toBe("테스트 제품 이름");
  });

  it("returns Spanish name even when nameKo is set and language is 'es'", () => {
    const product: Product = { ...mockProduct, nameKo: "테스트 제품 이름" };
    expect(getProductName(product, "es")).toBe("Test Product Name");
  });

  it("falls back to Spanish when nameKo is empty string", () => {
    const product: Product = { ...mockProduct, nameKo: "" };
    expect(getProductName(product, "ko")).toBe("Test Product Name");
  });

  it("returns a string for any product", () => {
    expect(typeof getProductName(mockProduct, "es")).toBe("string");
  });
});

// ─── getProductDescription ────────────────────────────────────────────────────

describe("getProductDescription", () => {
  it("returns the product description for 'es'", () => {
    expect(getProductDescription(mockProduct, "es")).toBe("Test product description.");
  });

  it("falls back to Spanish description for 'ko' when descriptionKo is absent", () => {
    expect(getProductDescription(mockProduct, "ko")).toBe("Test product description.");
  });

  it("returns descriptionKo when language is 'ko' and descriptionKo is set", () => {
    const product: Product = { ...mockProduct, descriptionKo: "테스트 제품 설명입니다." };
    expect(getProductDescription(product, "ko")).toBe("테스트 제품 설명입니다.");
  });

  it("returns Spanish description even when descriptionKo is set and language is 'es'", () => {
    const product: Product = { ...mockProduct, descriptionKo: "테스트 제품 설명입니다." };
    expect(getProductDescription(product, "es")).toBe("Test product description.");
  });

  it("falls back to Spanish when descriptionKo is empty string", () => {
    const product: Product = { ...mockProduct, descriptionKo: "" };
    expect(getProductDescription(product, "ko")).toBe("Test product description.");
  });

  it("returns a string for any product", () => {
    expect(typeof getProductDescription(mockProduct, "ko")).toBe("string");
  });
});

// ─── navCategories ────────────────────────────────────────────────────────────

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

// ─── subcategories ────────────────────────────────────────────────────────────

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

// ─── brands ───────────────────────────────────────────────────────────────────

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

// ─── sortOptions ──────────────────────────────────────────────────────────────

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
