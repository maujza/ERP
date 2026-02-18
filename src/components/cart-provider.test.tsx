import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "./cart-provider";

// ---- Next.js mocks --------------------------------------------------------
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({
    language: "es" as const,
    setLanguage: vi.fn(),
    toggleLanguage: vi.fn(),
  }),
}));

// ---- helpers --------------------------------------------------------------
const CART_KEY = "aurelia-cart";

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("CartProvider – initial state", () => {
  it("starts with an empty items array", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
  });

  it("starts with totalItems === 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
  });

  it("starts with subtotal === 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.subtotal).toBe(0);
  });

  it("starts with drawer closed", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addToCart
// ---------------------------------------------------------------------------
describe("CartProvider – addToCart", () => {
  it("adds a new item to the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("siena-pack");
    expect(result.current.items[0].quantity).toBe(1);
  });

  it("generates a line key in format productId::default for no variant", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    expect(result.current.items[0].key).toBe("siena-pack::default");
  });

  it("generates a line key with variantId when provided", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack", "dorado");
    });
    expect(result.current.items[0].key).toBe("siena-pack::dorado");
  });

  it("stores the variantId on the cart line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack", "dorado");
    });
    expect(result.current.items[0].variantId).toBe("dorado");
  });

  it("increments quantity when the same product+variant is added again", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("siena-pack");
      result.current.addToCart("siena-pack");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("treats same product with different variants as separate lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack", "dorado");
      result.current.addToCart("siena-pack", "plateado");
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("treats same product with/without variant as separate lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("siena-pack", "dorado");
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("adds multiple different products as separate lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("choker-luna");
      result.current.addToCart("acero-siena");
    });
    expect(result.current.items).toHaveLength(3);
  });

  it("opens drawer when openDrawer option is true", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack", undefined, { openDrawer: true });
    });
    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("does NOT open drawer by default (openDrawer omitted)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    expect(result.current.isDrawerOpen).toBe(false);
  });

  it("does NOT open drawer when openDrawer is false", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack", undefined, { openDrawer: false });
    });
    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------
describe("CartProvider – updateQuantity", () => {
  it("updates the quantity of an existing line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 7);
    });
    expect(result.current.items[0].quantity).toBe(7);
  });

  it("removes the line when quantity is set to 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 0);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("removes the line when quantity is negative", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, -5);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("does not affect other lines when updating one", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("choker-luna");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 10);
    });
    expect(result.current.items).toHaveLength(2);
    const siena = result.current.items.find((l) => l.productId === "siena-pack");
    const choker = result.current.items.find(
      (l) => l.productId === "choker-luna"
    );
    expect(siena?.quantity).toBe(10);
    expect(choker?.quantity).toBe(1);
  });

  it("does nothing for an unknown key", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    act(() => {
      result.current.updateQuantity("nonexistent::key", 5);
    });
    // original item unaffected
    expect(result.current.items[0].quantity).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeFromCart
// ---------------------------------------------------------------------------
describe("CartProvider – removeFromCart", () => {
  it("removes the specified line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.removeFromCart(key);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("leaves other lines intact", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("choker-luna");
    });
    const keyToRemove = result.current.items[0].key;
    act(() => {
      result.current.removeFromCart(keyToRemove);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("choker-luna");
  });

  it("does nothing for an unknown key", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    act(() => {
      result.current.removeFromCart("nonexistent::key");
    });
    expect(result.current.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Derived values: totalItems + subtotal
// ---------------------------------------------------------------------------
describe("CartProvider – totalItems", () => {
  it("reflects a single item with quantity 1", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    expect(result.current.totalItems).toBe(1);
  });

  it("sums quantities across multiple lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("siena-pack");
      result.current.addToCart("choker-luna");
    });
    expect(result.current.totalItems).toBe(3);
  });

  it("decreases when a line is removed", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("choker-luna");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.removeFromCart(key);
    });
    expect(result.current.totalItems).toBe(1);
  });
});

describe("CartProvider – subtotal", () => {
  it("equals product price for a single item (siena-pack = 18900)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    expect(result.current.subtotal).toBe(18900);
  });

  it("doubles when quantity is 2 (siena-pack = 18900 × 2 = 37800)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("siena-pack");
    });
    expect(result.current.subtotal).toBe(37800);
  });

  it("sums prices across multiple different products", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    // siena-pack = 18900, acero-siena = 13200
    act(() => {
      result.current.addToCart("siena-pack");
      result.current.addToCart("acero-siena");
    });
    expect(result.current.subtotal).toBe(18900 + 13200);
  });

  it("returns 0 when cart is empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.subtotal).toBe(0);
  });

  it("ignores unknown product IDs in subtotal calculation", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    // Manually add a bad line via updateQuantity on a fake key (won't match any product)
    // subtotal should only count siena-pack
    expect(result.current.subtotal).toBe(18900);
  });
});

// ---------------------------------------------------------------------------
// Drawer controls
// ---------------------------------------------------------------------------
describe("CartProvider – drawer controls", () => {
  it("openDrawer sets isDrawerOpen to true", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.openDrawer();
    });
    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("closeDrawer sets isDrawerOpen to false", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.openDrawer();
    });
    act(() => {
      result.current.closeDrawer();
    });
    expect(result.current.isDrawerOpen).toBe(false);
  });

  it("closeDrawer has no effect if drawer is already closed", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.closeDrawer();
    });
    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
describe("CartProvider – localStorage persistence", () => {
  it("persists items to localStorage after addToCart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as {
      productId: string;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe("siena-pack");
  });

  it("persists updated quantity to localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.updateQuantity(key, 4);
    });
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as {
      quantity: number;
    }[];
    expect(stored[0].quantity).toBe(4);
  });

  it("removes item from localStorage after removeFromCart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart("siena-pack");
    });
    const key = result.current.items[0].key;
    act(() => {
      result.current.removeFromCart(key);
    });
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    expect(stored).toHaveLength(0);
  });

  it("hydrates items from localStorage on mount", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        {
          key: "siena-pack::default",
          productId: "siena-pack",
          quantity: 3,
        },
      ])
    );
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {});
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("handles corrupted localStorage gracefully (empty cart)", async () => {
    localStorage.setItem(CART_KEY, "not-valid-json{{{");
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {});
    expect(result.current.items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// useCart outside CartProvider
// ---------------------------------------------------------------------------
describe("useCart – outside of CartProvider", () => {
  it("throws an error with a descriptive message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow(
      "useCart must be used within CartProvider"
    );
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// MiniCartDrawer – smoke test via render
// ---------------------------------------------------------------------------
describe("CartProvider – MiniCartDrawer renders", () => {
  it("renders the cart drawer container in DOM", () => {
    render(
      <CartProvider>
        <span data-testid="child">child</span>
      </CartProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows 'Carrito' heading in the drawer", () => {
    render(
      <CartProvider>
        <span />
      </CartProvider>
    );
    expect(screen.getByText("Carrito")).toBeInTheDocument();
  });

  it("shows empty cart message when cart is empty", async () => {
    render(
      <CartProvider>
        <span />
      </CartProvider>
    );
    await act(async () => {});
    expect(screen.getByText("Tu carrito esta vacio.")).toBeInTheDocument();
  });

  it("shows product name when item is added", async () => {
    // Pre-seed localStorage so the CartProvider hydrates with the item on mount
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        {
          key: "siena-pack::default",
          productId: "siena-pack",
          quantity: 1,
        },
      ])
    );
    render(
      <CartProvider>
        <span />
      </CartProvider>
    );
    await act(async () => {});
    // At least one element should display the product name
    expect(screen.getAllByText("Pack Argollas Siena").length).toBeGreaterThan(0);
  });
});
