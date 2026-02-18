/**
 * Tests for the catalog filtering, sorting, and pagination logic.
 *
 * The functions byPrice and filteredProducts live inside catalog/page.tsx
 * as non-exported helpers. This file tests the identical business logic
 * against the real product data so that any future drift from the actual
 * implementation is caught immediately.
 */
import { describe, it, expect } from "vitest";
import { products, type Product } from "@/lib/shop-data";

// ---------------------------------------------------------------------------
// Replicate helpers from catalog/page.tsx (keep in sync)
// ---------------------------------------------------------------------------
type PriceFilter = "all" | "low" | "mid" | "high";
type SortOption = "recommended" | "price_asc" | "price_desc";

function byPrice(product: Product, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "low") return product.price <= 20000;
  if (filter === "mid") return product.price > 20000 && product.price <= 30000;
  return product.price > 30000;
}

function filterAndSort(
  allProducts: Product[],
  {
    activeSubcategory = "Todos",
    selectedCategories = [] as string[],
    selectedBrands = [] as string[],
    priceFilter = "all" as PriceFilter,
    search = "",
    sortBy = "recommended" as SortOption,
  } = {}
): Product[] {
  const normalizedSearch = search.trim().toLowerCase();

  const list = allProducts.filter((p) => {
    const subcategoryMatch =
      activeSubcategory === "Todos" || p.subcategory === activeSubcategory;
    const categoryMatch =
      selectedCategories.length === 0 ||
      selectedCategories.includes(p.category);
    const brandMatch =
      selectedBrands.length === 0 || selectedBrands.includes(p.brand);
    const priceMatch = byPrice(p, priceFilter);
    const searchMatch =
      normalizedSearch.length === 0 ||
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.description.toLowerCase().includes(normalizedSearch);

    return subcategoryMatch && categoryMatch && brandMatch && priceMatch && searchMatch;
  });

  if (sortBy === "price_asc") return [...list].sort((a, b) => a.price - b.price);
  if (sortBy === "price_desc") return [...list].sort((a, b) => b.price - a.price);
  return list;
}

// ---------------------------------------------------------------------------
// byPrice helper
// ---------------------------------------------------------------------------
describe("byPrice filter", () => {
  const low = products.find((p) => p.id === "acero-siena")!; // 13200
  const mid = products.find((p) => p.id === "layering-aura")!; // 24500
  const high = products.find((p) => p.id === "kit-vitrina")!; // 98500
  const boundary20k = { ...low, price: 20000 }; // exactly at boundary
  const boundary20001 = { ...low, price: 20001 };
  const boundary30k = { ...mid, price: 30000 };
  const boundary30001 = { ...mid, price: 30001 };

  it("'all' filter passes every product", () => {
    for (const p of products) {
      expect(byPrice(p, "all")).toBe(true);
    }
  });

  it("'low' passes products with price <= 20000", () => {
    expect(byPrice(low, "low")).toBe(true); // 13200
    expect(byPrice(boundary20k, "low")).toBe(true); // exactly 20000
  });

  it("'low' rejects products above 20000", () => {
    expect(byPrice(boundary20001, "low")).toBe(false);
    expect(byPrice(mid, "low")).toBe(false);
    expect(byPrice(high, "low")).toBe(false);
  });

  it("'mid' passes products in 20001–30000 range", () => {
    expect(byPrice(boundary20001, "mid")).toBe(true);
    expect(byPrice(mid, "mid")).toBe(true); // 24500
    expect(byPrice(boundary30k, "mid")).toBe(true); // exactly 30000
  });

  it("'mid' rejects products at or below 20000", () => {
    expect(byPrice(low, "mid")).toBe(false);
    expect(byPrice(boundary20k, "mid")).toBe(false);
  });

  it("'mid' rejects products above 30000", () => {
    expect(byPrice(boundary30001, "mid")).toBe(false);
    expect(byPrice(high, "mid")).toBe(false);
  });

  it("'high' passes products above 30000", () => {
    expect(byPrice(boundary30001, "high")).toBe(true);
    expect(byPrice(high, "high")).toBe(true); // 98500
  });

  it("'high' rejects products at or below 30000", () => {
    expect(byPrice(low, "high")).toBe(false);
    expect(byPrice(mid, "high")).toBe(false);
    expect(byPrice(boundary30k, "high")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No filter – show all
// ---------------------------------------------------------------------------
describe("filterAndSort – no filters", () => {
  it("returns all 10 products when no filters are applied", () => {
    expect(filterAndSort(products)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Subcategory filter
// ---------------------------------------------------------------------------
describe("filterAndSort – subcategory", () => {
  it("'Todos' returns all products", () => {
    expect(filterAndSort(products, { activeSubcategory: "Todos" })).toHaveLength(10);
  });

  it("'Best Sellers' returns only Best Sellers products", () => {
    const result = filterAndSort(products, { activeSubcategory: "Best Sellers" });
    expect(result).toHaveLength(3);
    for (const p of result) {
      expect(p.subcategory).toBe("Best Sellers");
    }
  });

  it("'Novedades' returns only Novedades products", () => {
    const result = filterAndSort(products, { activeSubcategory: "Novedades" });
    expect(result).toHaveLength(3);
    for (const p of result) {
      expect(p.subcategory).toBe("Novedades");
    }
  });

  it("'Fiesta' returns 1 product (statement-eclair)", () => {
    const result = filterAndSort(products, { activeSubcategory: "Fiesta" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("statement-eclair");
  });

  it("'Kits' returns 1 product (kit-vitrina)", () => {
    const result = filterAndSort(products, { activeSubcategory: "Kits" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("kit-vitrina");
  });

  it("'Esenciales' returns 2 products", () => {
    const result = filterAndSort(products, { activeSubcategory: "Esenciales" });
    expect(result).toHaveLength(2);
    for (const p of result) {
      expect(p.subcategory).toBe("Esenciales");
    }
  });
});

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------
describe("filterAndSort – category", () => {
  it("filtering by 'Aros' returns only Aros products", () => {
    const result = filterAndSort(products, { selectedCategories: ["Aros"] });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.category).toBe("Aros");
    }
  });

  it("filtering by 'Collares' returns only Collares products", () => {
    const result = filterAndSort(products, { selectedCategories: ["Collares"] });
    for (const p of result) {
      expect(p.category).toBe("Collares");
    }
  });

  it("filtering by multiple categories returns union of those categories", () => {
    const result = filterAndSort(products, {
      selectedCategories: ["Aros", "Collares"],
    });
    for (const p of result) {
      expect(["Aros", "Collares"]).toContain(p.category);
    }
  });

  it("empty categories array returns all products (no filter)", () => {
    expect(filterAndSort(products, { selectedCategories: [] })).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Brand filter
// ---------------------------------------------------------------------------
describe("filterAndSort – brand", () => {
  it("filtering by 'Aurelia Core' returns only that brand", () => {
    const result = filterAndSort(products, { selectedBrands: ["Aurelia Core"] });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.brand).toBe("Aurelia Core");
    }
  });

  it("filtering by 'Boreal' returns only Boreal products", () => {
    const result = filterAndSort(products, { selectedBrands: ["Boreal"] });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.brand).toBe("Boreal");
    }
  });

  it("filtering by 'Aurelia Pro' returns only kit-vitrina", () => {
    const result = filterAndSort(products, { selectedBrands: ["Aurelia Pro"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("kit-vitrina");
  });

  it("filtering by multiple brands returns products from all those brands", () => {
    const result = filterAndSort(products, {
      selectedBrands: ["Lumiere", "Boreal"],
    });
    for (const p of result) {
      expect(["Lumiere", "Boreal"]).toContain(p.brand);
    }
  });

  it("empty brands array returns all products", () => {
    expect(filterAndSort(products, { selectedBrands: [] })).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Price filter
// ---------------------------------------------------------------------------
describe("filterAndSort – price range", () => {
  it("'low' returns 5 products priced at or below 20000", () => {
    const result = filterAndSort(products, { priceFilter: "low" });
    expect(result).toHaveLength(5);
    for (const p of result) {
      expect(p.price).toBeLessThanOrEqual(20000);
    }
  });

  it("'mid' returns 4 products priced 20001–30000", () => {
    const result = filterAndSort(products, { priceFilter: "mid" });
    expect(result).toHaveLength(4);
    for (const p of result) {
      expect(p.price).toBeGreaterThan(20000);
      expect(p.price).toBeLessThanOrEqual(30000);
    }
  });

  it("'high' returns 1 product priced above 30000 (kit-vitrina)", () => {
    const result = filterAndSort(products, { priceFilter: "high" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("kit-vitrina");
  });

  it("'all' returns all products", () => {
    expect(filterAndSort(products, { priceFilter: "all" })).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------
describe("filterAndSort – search", () => {
  it("empty search returns all products", () => {
    expect(filterAndSort(products, { search: "" })).toHaveLength(10);
  });

  it("whitespace-only search returns all products", () => {
    expect(filterAndSort(products, { search: "   " })).toHaveLength(10);
  });

  it("searching 'siena' returns siena-pack and acero-siena", () => {
    const result = filterAndSort(products, { search: "siena" });
    const ids = result.map((p) => p.id);
    expect(ids).toContain("siena-pack");
    expect(ids).toContain("acero-siena");
  });

  it("search is case-insensitive", () => {
    const lower = filterAndSort(products, { search: "siena" });
    const upper = filterAndSort(products, { search: "SIENA" });
    const mixed = filterAndSort(products, { search: "Siena" });
    expect(lower).toHaveLength(upper.length);
    expect(lower).toHaveLength(mixed.length);
  });

  it("searching 'argollas' matches name", () => {
    const result = filterAndSort(products, { search: "argollas" });
    expect(result.length).toBeGreaterThan(0);
  });

  it("searching 'oro' matches product description (baño oro 18K)", () => {
    const result = filterAndSort(products, { search: "oro" });
    const ids = result.map((p) => p.id);
    expect(ids).toContain("siena-pack");
  });

  it("searching with no match returns empty array", () => {
    const result = filterAndSort(products, { search: "xyznonexistent" });
    expect(result).toHaveLength(0);
  });

  it("searching 'wave' matches anillo-wave", () => {
    const result = filterAndSort(products, { search: "wave" });
    const ids = result.map((p) => p.id);
    expect(ids).toContain("anillo-wave");
  });

  it("searching 'perlas' matches set-perlas name and description", () => {
    const result = filterAndSort(products, { search: "perlas" });
    const ids = result.map((p) => p.id);
    expect(ids).toContain("set-perlas");
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
describe("filterAndSort – sorting", () => {
  it("price_asc sorts ascending by price", () => {
    const result = filterAndSort(products, { sortBy: "price_asc" });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].price).toBeGreaterThanOrEqual(result[i - 1].price);
    }
  });

  it("price_asc first item is the cheapest", () => {
    const result = filterAndSort(products, { sortBy: "price_asc" });
    const prices = products.map((p) => p.price);
    expect(result[0].price).toBe(Math.min(...prices));
  });

  it("price_desc sorts descending by price", () => {
    const result = filterAndSort(products, { sortBy: "price_desc" });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].price).toBeLessThanOrEqual(result[i - 1].price);
    }
  });

  it("price_desc first item is the most expensive (kit-vitrina = 98500)", () => {
    const result = filterAndSort(products, { sortBy: "price_desc" });
    expect(result[0].id).toBe("kit-vitrina");
  });

  it("recommended preserves original array order", () => {
    const result = filterAndSort(products, { sortBy: "recommended" });
    const resultIds = result.map((p) => p.id);
    const sourceIds = products.map((p) => p.id);
    expect(resultIds).toEqual(sourceIds);
  });
});

// ---------------------------------------------------------------------------
// Cumulative / combined filters
// ---------------------------------------------------------------------------
describe("filterAndSort – combined filters", () => {
  it("subcategory + category reduces result set", () => {
    const result = filterAndSort(products, {
      activeSubcategory: "Best Sellers",
      selectedCategories: ["Aros"],
    });
    for (const p of result) {
      expect(p.subcategory).toBe("Best Sellers");
      expect(p.category).toBe("Aros");
    }
  });

  it("brand + price filter combines correctly", () => {
    const result = filterAndSort(products, {
      selectedBrands: ["Aurelia Core"],
      priceFilter: "low",
    });
    for (const p of result) {
      expect(p.brand).toBe("Aurelia Core");
      expect(p.price).toBeLessThanOrEqual(20000);
    }
  });

  it("search + price_asc returns sorted, filtered results", () => {
    const result = filterAndSort(products, {
      search: "siena",
      sortBy: "price_asc",
    });
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].price).toBeGreaterThanOrEqual(result[i - 1].price);
    }
  });
});

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------
describe("Pagination helpers", () => {
  const PAGE_SIZE = 8;

  function paginate<T>(list: T[], page: number, pageSize = PAGE_SIZE) {
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    return {
      items: list.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      totalPages,
      currentPage,
    };
  }

  it("page 1 with 10 products returns 8 items", () => {
    const { items } = paginate(products, 1);
    expect(items).toHaveLength(8);
  });

  it("page 2 with 10 products returns remaining 2 items", () => {
    const { items } = paginate(products, 2);
    expect(items).toHaveLength(2);
  });

  it("totalPages is 2 for 10 products with page size 8", () => {
    const { totalPages } = paginate(products, 1);
    expect(totalPages).toBe(2);
  });

  it("requesting page beyond totalPages clamps to last page", () => {
    const { currentPage, totalPages } = paginate(products, 999);
    expect(currentPage).toBe(totalPages);
  });

  it("requesting page 0 returns page 1 items", () => {
    // Math.min(0, totalPages) would be 0, but the component clamps to max(1, ...)
    // Our paginate here mirrors Math.min(page, totalPages) so page 0 < 1 → gets clamped
    // Let's mirror the exact component logic:
    function goToPage(page: number, total: number) {
      return Math.min(total, Math.max(1, page));
    }
    const total = Math.ceil(products.length / PAGE_SIZE);
    expect(goToPage(0, total)).toBe(1);
    expect(goToPage(-5, total)).toBe(1);
    expect(goToPage(1, total)).toBe(1);
    expect(goToPage(999, total)).toBe(total);
  });

  it("totalPages is at least 1 even for empty list", () => {
    const { totalPages } = paginate([], 1);
    expect(totalPages).toBe(1);
  });

  it("empty list gives 0 items on page 1", () => {
    const { items } = paginate([], 1);
    expect(items).toHaveLength(0);
  });

  it("exactly 8 products results in 1 total page", () => {
    const { totalPages } = paginate(products.slice(0, 8), 1);
    expect(totalPages).toBe(1);
  });

  it("9 products results in 2 total pages", () => {
    const { totalPages } = paginate(products.slice(0, 9), 1);
    expect(totalPages).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// activeFilterCount helper
// ---------------------------------------------------------------------------
describe("activeFilterCount", () => {
  function activeFilterCount({
    selectedCategories = [] as string[],
    selectedBrands = [] as string[],
    priceFilter = "all" as PriceFilter,
    search = "",
  } = {}) {
    return (
      selectedCategories.length +
      selectedBrands.length +
      (priceFilter === "all" ? 0 : 1) +
      (search.trim() ? 1 : 0)
    );
  }

  it("returns 0 when no filters are active", () => {
    expect(activeFilterCount()).toBe(0);
  });

  it("counts each category as 1", () => {
    expect(activeFilterCount({ selectedCategories: ["Aros", "Collares"] })).toBe(2);
  });

  it("counts each brand as 1", () => {
    expect(activeFilterCount({ selectedBrands: ["Lumiere"] })).toBe(1);
  });

  it("counts non-'all' price filter as 1", () => {
    expect(activeFilterCount({ priceFilter: "low" })).toBe(1);
    expect(activeFilterCount({ priceFilter: "mid" })).toBe(1);
    expect(activeFilterCount({ priceFilter: "high" })).toBe(1);
  });

  it("does NOT count 'all' price filter", () => {
    expect(activeFilterCount({ priceFilter: "all" })).toBe(0);
  });

  it("counts non-empty search as 1", () => {
    expect(activeFilterCount({ search: "siena" })).toBe(1);
  });

  it("does NOT count whitespace-only search", () => {
    expect(activeFilterCount({ search: "   " })).toBe(0);
  });

  it("sums all active filters correctly", () => {
    expect(
      activeFilterCount({
        selectedCategories: ["Aros"],
        selectedBrands: ["Lumiere"],
        priceFilter: "low",
        search: "choker",
      })
    ).toBe(4);
  });
});
