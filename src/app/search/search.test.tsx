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
import { render, screen } from "@testing-library/react";
import SearchPage from "./page";

// ---------------------------------------------------------------------------
// Next.js mocks
// ---------------------------------------------------------------------------
let mockQ = "aros";

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

// ---------------------------------------------------------------------------
// Provider / data mocks
// ---------------------------------------------------------------------------
vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" as const }),
}));

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));

// Minimal deterministic product set for search tests
vi.mock("@/lib/shop-data", () => ({
  products: [
    {
      id: "p1",
      name: "Aros Siena",
      description: "Aros dorados de calidad",
      category: "Aros",
      subcategory: "Novedades",
      brand: "Aurelia",
      image: "/img/p1.jpg",
      price: 10000,
      stock: 5,
    },
    {
      id: "p2",
      name: "Collar Luna",
      description: "Collar elegante de plata",
      category: "Collares",
      subcategory: "Best Sellers",
      brand: "Aurelia",
      image: "/img/p2.jpg",
      price: 20000,
      stock: 3,
    },
    {
      id: "p3",
      name: "Pulsera Capri",
      description: "Pulsera de plata italiana",
      category: "Pulseras",
      subcategory: "Novedades",
      brand: "Lumiere",
      image: "/img/p3.jpg",
      price: 15000,
      stock: 0,
    },
  ],
  getProductName: (p: { name: string }) => p.name,
  formatArs: (n: number) => `$${n}`,
}));

// ---------------------------------------------------------------------------
// Reset query before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockQ = "";
});

// ---------------------------------------------------------------------------
// Empty query state
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Query-based search results
// ---------------------------------------------------------------------------
describe("SearchPage – query results", () => {
  it("shows matching product when query matches product name", () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();
  });

  it("does NOT show non-matching products", () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(screen.queryByText("Collar Luna")).toBeNull();
  });

  it("matches by product description (partial match)", () => {
    mockQ = "plata";
    render(<SearchPage />);
    expect(screen.getByText("Collar Luna")).toBeInTheDocument();
  });

  it("matches by category name", () => {
    mockQ = "collares";
    render(<SearchPage />);
    expect(screen.getByText("Collar Luna")).toBeInTheDocument();
  });

  it("search is case-insensitive", () => {
    mockQ = "AROS";
    render(<SearchPage />);
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();
  });

  it("shows all matching products when multiple match", () => {
    mockQ = "plata";
    render(<SearchPage />);
    // "Collar Luna" has "de plata" → matches; "Pulsera Capri" has "plata italiana" → matches
    expect(screen.getByText("Collar Luna")).toBeInTheDocument();
    expect(screen.getByText("Pulsera Capri")).toBeInTheDocument();
  });

  it("shows the result count in the header", () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(screen.getByText(/1.*productos encontrados/)).toBeInTheDocument();
  });

  it("shows the search term in the heading", () => {
    mockQ = "aros";
    render(<SearchPage />);
    // heading renders: Búsqueda: "aros" — use role to avoid ambiguity with product names
    expect(screen.getByRole("heading", { name: /aros/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Re-trigger on new query — the core bug fix
// Simulates navigating to /search?q=term2 while already on the search page.
// ---------------------------------------------------------------------------
describe("SearchPage – re-triggers on new query (useSearchParams fix)", () => {
  it("shows different results after query changes (re-render)", () => {
    mockQ = "aros";
    const { rerender } = render(<SearchPage />);
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();
    expect(screen.queryByText("Collar Luna")).toBeNull();

    // Simulate URL change: new search for "collar"
    mockQ = "collar";
    rerender(<SearchPage />);

    expect(screen.queryByText("Aros Siena")).toBeNull();
    expect(screen.getByText("Collar Luna")).toBeInTheDocument();
  });

  it("shows empty state after switching to a non-matching query", () => {
    mockQ = "aros";
    const { rerender } = render(<SearchPage />);
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();

    mockQ = "xyz_no_match";
    rerender(<SearchPage />);

    expect(screen.queryByText("Aros Siena")).toBeNull();
    expect(screen.getByText("No encontramos resultados.")).toBeInTheDocument();
  });

  it("restores results when switching back to a matching query", () => {
    mockQ = "collar";
    const { rerender } = render(<SearchPage />);
    expect(screen.getByText("Collar Luna")).toBeInTheDocument();

    mockQ = "aros";
    rerender(<SearchPage />);
    expect(screen.queryByText("Collar Luna")).toBeNull();
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// No results state
// ---------------------------------------------------------------------------
describe("SearchPage – no results", () => {
  it("shows no-results message when query has no matches", () => {
    mockQ = "xyz_nothing";
    render(<SearchPage />);
    expect(screen.getByText("No encontramos resultados.")).toBeInTheDocument();
  });

  it("shows a link to the full catalog when there are no results", () => {
    mockQ = "xyz_nothing";
    render(<SearchPage />);
    expect(screen.getByRole("link", { name: /colección completa/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Out-of-stock product
// ---------------------------------------------------------------------------
describe("SearchPage – out of stock product", () => {
  it("shows AGOTADO badge for out-of-stock products", () => {
    mockQ = "pulsera";
    render(<SearchPage />);
    // Pulsera Capri has stock: 0; both the <Badge> and the disabled <Button> render "AGOTADO"
    expect(screen.getAllByText("AGOTADO").length).toBeGreaterThanOrEqual(1);
  });

  it("add button is disabled for out-of-stock products", () => {
    mockQ = "pulsera";
    render(<SearchPage />);
    const buttons = screen.getAllByRole("button");
    const agotadoBtn = buttons.find((b) => b.textContent === "AGOTADO");
    expect(agotadoBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Button variant — primary (red) style
// ---------------------------------------------------------------------------
describe("SearchPage – button consistency", () => {
  it("add-to-cart CTA does NOT use the outline variant (regression guard)", () => {
    mockQ = "aros";
    render(<SearchPage />);
    // In-stock state renders CTA as link (Button asChild)
    const addBtn = screen.getByRole("link", { name: "Agregar" });
    // outline variant adds a specific border class; default (red) does not
    expect(addBtn).not.toHaveClass("border-black/20");
  });
});

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------
describe("SearchPage – breadcrumb", () => {
  it("renders a Home breadcrumb link", () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("Home breadcrumb links to /", () => {
    mockQ = "aros";
    render(<SearchPage />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });
});
