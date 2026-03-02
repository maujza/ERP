/**
 * Search page unit tests
 *
 * Key behaviours under test:
 *  - Query is read from useSearchParams (not a stale useEffect)  ← bug fix
 *  - Re-renders with new query when URL params change
 *  - Shows results matching the query
 *  - Shows "no results" state when query has no matches
 *  - Shows empty prompt when there is no query
 *  - Add-to-cart button uses the primary (red) variant
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SearchPage from "./page";

let mockQ = "aros";
const mockProductList = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(`q=${encodeURIComponent(mockQ)}`),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" as const }),
}));

vi.mock("@/components/product-quick-view", () => ({
  ProductQuickView: ({ className }: { className?: string }) => (
    <button className={className}>Vista rapida</button>
  ),
}));

vi.mock("@/lib/medusa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/medusa")>();
  return {
    ...actual,
    withStorePricingContext: <T extends Record<string, unknown>>(params: T) => params,
    sdk: {
      ...actual.sdk,
      store: {
        ...actual.sdk.store,
        product: {
          ...actual.sdk.store.product,
          list: (...args: unknown[]) => mockProductList(...args),
        },
      },
    },
  };
});

const products = [
  {
    id: "p1",
    title: "Aros Siena",
    description: "Aros dorados de calidad",
    thumbnail: "/img/p1.jpg",
    metadata: { category: "Aros", subcategory: "Novedades", brand: "Aurelia" },
    variants: [{ id: "v1", title: "default", inventory_quantity: 5, calculated_price: { calculated_amount: 10000 } }],
  },
  {
    id: "p2",
    title: "Collar Luna",
    description: "Collar elegante de plata",
    thumbnail: "/img/p2.jpg",
    metadata: { category: "Collares", subcategory: "Best Sellers", brand: "Aurelia" },
    variants: [{ id: "v2", title: "default", inventory_quantity: 3, calculated_price: { calculated_amount: 20000 } }],
  },
  {
    id: "p3",
    title: "Pulsera Capri",
    description: "Pulsera de plata italiana",
    thumbnail: "/img/p3.jpg",
    metadata: { category: "Pulseras", subcategory: "Novedades", brand: "Lumiere" },
    variants: [{ id: "v3", title: "default", inventory_quantity: 0, calculated_price: { calculated_amount: 15000 } }],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockQ = "";
  mockProductList.mockImplementation(async (params?: { q?: string }) => {
    const query = String(params?.q || "").trim().toLowerCase();
    const filtered = !query
      ? []
      : products.filter((product) => {
          const haystack = `${product.title} ${product.description} ${product.metadata.category}`.toLowerCase();
          return haystack.includes(query);
        });

    return { products: filtered };
  });
});

describe("SearchPage – empty query", () => {
  it("shows the 'type to search' prompt when query is empty", () => {
    mockQ = "";
    render(<SearchPage />);
    expect(screen.getByText("Escribí algo para buscar")).toBeInTheDocument();
  });

  it("shows 0 products found when query is empty", () => {
    mockQ = "";
    render(<SearchPage />);
    expect(screen.getByText(/0.*productos encontrados/)).toBeInTheDocument();
  });
});

describe("SearchPage – query results", () => {
  it("shows matching product when query matches product name", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(await screen.findByText("Aros Siena")).toBeInTheDocument();
  });

  it("does NOT show non-matching products", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    await screen.findByText("Aros Siena");
    expect(screen.queryByText("Collar Luna")).toBeNull();
  });

  it("matches by product description (partial match)", async () => {
    mockQ = "plata";
    render(<SearchPage />);
    expect(await screen.findByText("Collar Luna")).toBeInTheDocument();
  });

  it("matches by category name", async () => {
    mockQ = "collares";
    render(<SearchPage />);
    expect(await screen.findByText("Collar Luna")).toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    mockQ = "AROS";
    render(<SearchPage />);
    expect(await screen.findByText("Aros Siena")).toBeInTheDocument();
  });

  it("shows all matching products when multiple match", async () => {
    mockQ = "plata";
    render(<SearchPage />);
    expect(await screen.findByText("Collar Luna")).toBeInTheDocument();
    expect(await screen.findByText("Pulsera Capri")).toBeInTheDocument();
  });

  it("shows the result count in the header", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(await screen.findByText(/1.*productos encontrados/)).toBeInTheDocument();
  });

  it("shows the search term in the heading", () => {
    mockQ = "aros";
    render(<SearchPage />);
    // heading renders: Búsqueda: "aros" — use role to avoid ambiguity with product names
    expect(screen.getByRole("heading", { name: /aros/i })).toBeInTheDocument();
  });
});

describe("SearchPage – re-triggers on new query (useSearchParams fix)", () => {
  it("shows different results after query changes (re-render)", async () => {
    mockQ = "aros";
    const { rerender } = render(<SearchPage />);
    expect(await screen.findByText("Aros Siena")).toBeInTheDocument();
    expect(screen.queryByText("Collar Luna")).toBeNull();

    mockQ = "collar";
    rerender(<SearchPage />);

    await waitFor(() => {
      expect(screen.queryByText("Aros Siena")).toBeNull();
      expect(screen.getByText("Collar Luna")).toBeInTheDocument();
    });
  });

  it("shows empty state after switching to a non-matching query", async () => {
    mockQ = "aros";
    const { rerender } = render(<SearchPage />);
    expect(await screen.findByText("Aros Siena")).toBeInTheDocument();

    mockQ = "xyz_no_match";
    rerender(<SearchPage />);

    await waitFor(() => {
      expect(screen.queryByText("Aros Siena")).toBeNull();
      expect(screen.getByText("No encontramos resultados.")).toBeInTheDocument();
    });
  });

  it("restores results when switching back to a matching query", async () => {
    mockQ = "collar";
    const { rerender } = render(<SearchPage />);
    expect(await screen.findByText("Collar Luna")).toBeInTheDocument();

    mockQ = "aros";
    rerender(<SearchPage />);

    await waitFor(() => {
      expect(screen.queryByText("Collar Luna")).toBeNull();
      expect(screen.getByText("Aros Siena")).toBeInTheDocument();
    });
  });
});

describe("SearchPage – no results", () => {
  it("shows no-results message when query has no matches", async () => {
    mockQ = "xyz_nothing";
    render(<SearchPage />);
    expect(await screen.findByText("No encontramos resultados.")).toBeInTheDocument();
  });

  it("shows a link to the full catalog when there are no results", async () => {
    mockQ = "xyz_nothing";
    render(<SearchPage />);
    expect(await screen.findByRole("link", { name: /colección completa/i })).toBeInTheDocument();
  });
});

describe("SearchPage – out of stock product", () => {
  it("shows AGOTADO badge for out-of-stock products", async () => {
    mockQ = "pulsera";
    render(<SearchPage />);
    const agotadoLabels = await screen.findAllByText("AGOTADO");
    expect(agotadoLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("add button is disabled for out-of-stock products", async () => {
    mockQ = "pulsera";
    render(<SearchPage />);
    const agotadoBtn = await screen.findByRole("button", { name: "AGOTADO" });
    expect(agotadoBtn).toBeDisabled();
  });
});

describe("SearchPage – button consistency", () => {
  it("add-to-cart CTA does NOT use the outline variant (regression guard)", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    const addBtn = await screen.findByRole("link", { name: "Agregar" });
    expect(addBtn).not.toHaveClass("border-black/20");
  });
});

describe("SearchPage – breadcrumb", () => {
  it("renders a Home breadcrumb link", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(await screen.findByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("Home breadcrumb links to /", async () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(await screen.findByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });
});
