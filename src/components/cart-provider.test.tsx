import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook, waitFor } from "@testing-library/react";
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

// ---- Medusa SDK mock -------------------------------------------------------
const mockCreate = vi.fn();
const mockRetrieve = vi.fn();
const mockCreateLineItem = vi.fn();
const mockUpdateLineItem = vi.fn();
const mockDeleteLineItem = vi.fn();

vi.mock("@/lib/medusa", () => ({
  sdk: {
    store: {
      cart: {
        create: (...args: unknown[]) => mockCreate(...args),
        retrieve: (...args: unknown[]) => mockRetrieve(...args),
        createLineItem: (...args: unknown[]) => mockCreateLineItem(...args),
        updateLineItem: (...args: unknown[]) => mockUpdateLineItem(...args),
        deleteLineItem: (...args: unknown[]) => mockDeleteLineItem(...args),
      },
    },
  },
}));

// ---- Cart response helpers -------------------------------------------------
type RawLineItem = {
  id: string;
  variant_id: string;
  title: string;
  variant: { title: string };
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
};

function makeLineItem(overrides: Partial<RawLineItem> = {}): RawLineItem {
  return {
    id: "li_1",
    variant_id: "var_1",
    title: "Test Product",
    variant: { title: "Default" },
    thumbnail: null,
    quantity: 1,
    unit_price: 5000,
    ...overrides,
  };
}

function makeCartResponse(items: RawLineItem[] = []) {
  return { cart: { id: "test-cart", items } };
}

function makeDeleteResponse(items: RawLineItem[] = []) {
  return { deleted: true, id: "li_1", object: "line-item", parent: { id: "test-cart", items } };
}

// ---- Test wrapper ----------------------------------------------------------
function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

// ---- Setup: clear mocks and localStorage between tests --------------------
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Default: no stored cart, retrieve rejects (no existing cart)
  mockRetrieve.mockRejectedValue(new Error("Not found"));
  mockCreate.mockResolvedValue(makeCartResponse());
  mockCreateLineItem.mockResolvedValue(makeCartResponse());
  mockUpdateLineItem.mockResolvedValue(makeCartResponse());
  mockDeleteLineItem.mockResolvedValue(makeDeleteResponse());
});

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
  it("creates a cart and adds an item on first addToCart", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1, unit_price: 5000 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addToCart("var_1");
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateLineItem).toHaveBeenCalledWith("test-cart", { variant_id: "var_1", quantity: 1 });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].variantId).toBe("var_1");
    expect(result.current.items[0].quantity).toBe(1);
  });

  it("reuses existing cart on second addToCart", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addToCart("var_1");
      await result.current.addToCart("var_2");
    });

    // create only called once (first addToCart), not a second time
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateLineItem).toHaveBeenCalledTimes(2);
  });

  it("opens drawer when openDrawer option is true", async () => {
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([makeLineItem()]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addToCart("var_1", 1, { openDrawer: true });
    });

    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("does NOT open drawer by default", async () => {
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([makeLineItem()]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addToCart("var_1");
    });

    expect(result.current.isDrawerOpen).toBe(false);
  });

  it("updates items state from cart response", async () => {
    const items = [
      makeLineItem({ id: "li_1", variant_id: "var_1", title: "Ring", quantity: 2, unit_price: 8000 }),
    ];
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse(items));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addToCart("var_1", 2);
    });

    expect(result.current.items[0].title).toBe("Ring");
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.items[0].unitPrice).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------
describe("CartProvider – updateQuantity", () => {
  it("calls updateLineItem with the new quantity", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));
    mockUpdateLineItem.mockResolvedValue(makeCartResponse([{ ...item, quantity: 3 }]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });
    await act(async () => { await result.current.updateQuantity("li_1", 3); });

    expect(mockUpdateLineItem).toHaveBeenCalledWith("test-cart", "li_1", { quantity: 3 });
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("calls deleteLineItem when quantity is set to 0", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));
    mockDeleteLineItem.mockResolvedValue(makeDeleteResponse([]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });
    await act(async () => { await result.current.updateQuantity("li_1", 0); });

    expect(mockDeleteLineItem).toHaveBeenCalledWith("test-cart", "li_1");
    expect(result.current.items).toHaveLength(0);
  });

  it("calls deleteLineItem when quantity is negative", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));
    mockDeleteLineItem.mockResolvedValue(makeDeleteResponse([]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });
    await act(async () => { await result.current.updateQuantity("li_1", -1); });

    expect(mockDeleteLineItem).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("does nothing when cartId is not set", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.updateQuantity("li_1", 3); });
    expect(mockUpdateLineItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removeFromCart
// ---------------------------------------------------------------------------
describe("CartProvider – removeFromCart", () => {
  it("calls deleteLineItem and updates items", async () => {
    const item = makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));
    mockDeleteLineItem.mockResolvedValue(makeDeleteResponse([]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });
    await act(async () => { await result.current.removeFromCart("li_1"); });

    expect(mockDeleteLineItem).toHaveBeenCalledWith("test-cart", "li_1");
    expect(result.current.items).toHaveLength(0);
  });

  it("leaves other items intact", async () => {
    const items = [
      makeLineItem({ id: "li_1", variant_id: "var_1", title: "Ring", quantity: 1 }),
      makeLineItem({ id: "li_2", variant_id: "var_2", title: "Necklace", quantity: 1 }),
    ];
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse(items));
    mockDeleteLineItem.mockResolvedValue(makeDeleteResponse([items[1]]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });
    await act(async () => { await result.current.removeFromCart("li_1"); });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("li_2");
  });

  it("does nothing when cartId is not set", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.removeFromCart("li_1"); });
    expect(mockDeleteLineItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Derived values: totalItems + subtotal
// ---------------------------------------------------------------------------
describe("CartProvider – totalItems", () => {
  it("reflects a single item with quantity 1", async () => {
    const item = makeLineItem({ quantity: 1 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });

    expect(result.current.totalItems).toBe(1);
  });

  it("sums quantities across multiple lines", async () => {
    const items = [
      makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 2 }),
      makeLineItem({ id: "li_2", variant_id: "var_2", quantity: 3 }),
    ];
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse(items));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });

    expect(result.current.totalItems).toBe(5);
  });

  it("returns 0 when cart is empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
  });
});

describe("CartProvider – subtotal", () => {
  it("equals unitPrice × quantity for a single item", async () => {
    const item = makeLineItem({ quantity: 2, unit_price: 5000 });
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([item]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1", 2); });

    expect(result.current.subtotal).toBe(10000);
  });

  it("sums prices across multiple different items", async () => {
    const items = [
      makeLineItem({ id: "li_1", variant_id: "var_1", quantity: 1, unit_price: 5000 }),
      makeLineItem({ id: "li_2", variant_id: "var_2", quantity: 2, unit_price: 3000 }),
    ];
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse(items));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });

    expect(result.current.subtotal).toBe(11000);
  });

  it("returns 0 when cart is empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.subtotal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Drawer controls
// ---------------------------------------------------------------------------
describe("CartProvider – drawer controls", () => {
  it("openDrawer sets isDrawerOpen to true", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.openDrawer(); });
    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("closeDrawer sets isDrawerOpen to false", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.openDrawer(); });
    act(() => { result.current.closeDrawer(); });
    expect(result.current.isDrawerOpen).toBe(false);
  });

  it("closeDrawer has no effect if drawer is already closed", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.closeDrawer(); });
    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence (cart_id only)
// ---------------------------------------------------------------------------
describe("CartProvider – localStorage persistence", () => {
  it("persists cart ID to localStorage after first addToCart", async () => {
    mockCreate.mockResolvedValue(makeCartResponse());
    mockCreateLineItem.mockResolvedValue(makeCartResponse([makeLineItem()]));

    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => { await result.current.addToCart("var_1"); });

    expect(localStorage.getItem("aurelia-cart-id")).toBe("test-cart");
  });

  it("hydrates cart from localStorage on mount when cart exists", async () => {
    localStorage.setItem("aurelia-cart-id", "existing-cart");
    const item = makeLineItem({ quantity: 3 });
    mockRetrieve.mockResolvedValue({ cart: { id: "existing-cart", items: [item] } });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });
    expect(result.current.items[0].quantity).toBe(3);
    expect(mockRetrieve).toHaveBeenCalledWith("existing-cart");
  });

  it("clears localStorage when cart retrieve fails on mount", async () => {
    localStorage.setItem("aurelia-cart-id", "bad-cart-id");
    mockRetrieve.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => {
      expect(localStorage.getItem("aurelia-cart-id")).toBeNull();
    });
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
});
