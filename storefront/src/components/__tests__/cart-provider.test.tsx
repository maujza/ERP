import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks (must be defined before vi.mock factory runs) ──────────────

const { mockPush, mockCartApi } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockCartApi = {
    retrieve: vi.fn(),
    create: vi.fn(),
    createLineItem: vi.fn(),
    updateLineItem: vi.fn(),
    deleteLineItem: vi.fn(),
  };
  return { mockPush, mockCartApi };
});

// ─── module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/medusa", () => ({
  sdk: {
    store: {
      cart: mockCartApi,
      customer: { retrieve: vi.fn() },
    },
  },
  MEDUSA_COUNTRY_CODE: "ar",
  MEDUSA_REGION_ID: "region_01",
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" }),
}));

vi.mock("lucide-react", () => ({ X: () => null }));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/safe-image", () => ({ SafeImage: () => null }));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    variant?: string;
  }) => (asChild ? <>{children}</> : <button onClick={onClick} disabled={disabled}>{children}</button>),
}));

vi.mock("@/lib/shop-data", () => ({
  formatArs: (n: number) => `$${n}`,
}));

// ─── test imports ─────────────────────────────────────────────────────────────

import { CartProvider, useCart } from "../cart-provider";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CART_ID_KEY = "aurelia-cart-id";

function makeRawItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_01",
    variant_id: "variant_01",
    title: "Aro Dorado",
    variant: { title: "Único" },
    thumbnail: null,
    quantity: 2,
    unit_price: 5000,
    ...overrides,
  };
}

function makeRawCart(items: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    id: "cart_01",
    items,
    completed_at: null,
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

// ─── useCart outside of CartProvider ─────────────────────────────────────────

describe("useCart – outside of CartProvider", () => {
  it("throws a descriptive error", () => {
    // Suppress expected error output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow("useCart must be used within CartProvider");
    consoleSpy.mockRestore();
  });
});

// ─── initial state ────────────────────────────────────────────────────────────

describe("CartProvider – initial state (no localStorage)", () => {
  beforeEach(() => {
    mockCartApi.retrieve.mockResolvedValue({ cart: makeRawCart() });
  });

  it("starts with cartId = null", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.cartId).toBeNull();
  });

  it("starts with an empty items array", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.items).toEqual([]);
  });

  it("starts with subtotal = 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.subtotal).toBe(0);
  });

  it("starts with totalItems = 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.totalItems).toBe(0);
  });

  it("starts with isDrawerOpen = false", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ─── hydration from localStorage ─────────────────────────────────────────────

describe("CartProvider – hydration from localStorage", () => {
  it("does not call sdk.store.cart.retrieve when localStorage has no cart id", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    // Give effects time to run
    await act(async () => {});
    expect(mockCartApi.retrieve).not.toHaveBeenCalled();
    expect(result.current.cartId).toBeNull();
  });

  it("loads cart items from SDK when a valid cart id is in localStorage", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    const rawItem = makeRawItem();
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([rawItem]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.cartId).toBe("cart_01");
    expect(result.current.items[0]).toMatchObject({
      id: "item_01",
      variantId: "variant_01",
      title: "Aro Dorado",
      variantTitle: "Único",
      quantity: 2,
      unitPrice: 5000,
    });
  });

  it("clears the cart when the retrieved cart is already completed", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({
      cart: makeRawCart([], { completed_at: "2024-01-01T00:00:00.000Z" }),
    });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.cartId).toBeNull());
    expect(localStorage.getItem(CART_ID_KEY)).toBeNull();
    expect(result.current.items).toEqual([]);
  });

  it("clears the cart when the SDK retrieve call fails", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockRejectedValueOnce(new Error("not found"));

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.cartId).toBeNull());
    expect(localStorage.getItem(CART_ID_KEY)).toBeNull();
  });
});

// ─── clearCart ────────────────────────────────────────────────────────────────

describe("CartProvider – clearCart", () => {
  it("removes the cart id from localStorage", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart() });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {});

    act(() => {
      result.current.clearCart();
    });

    expect(localStorage.getItem(CART_ID_KEY)).toBeNull();
  });

  it("resets cartId to null", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({
      cart: makeRawCart([makeRawItem()]),
    });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.cartId).toBe("cart_01"));

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartId).toBeNull();
  });

  it("resets items to empty array", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({
      cart: makeRawCart([makeRawItem()]),
    });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
  });
});

// ─── openDrawer / closeDrawer ─────────────────────────────────────────────────

describe("CartProvider – drawer open/close", () => {
  it("openDrawer sets isDrawerOpen to true", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });

    act(() => {
      result.current.openDrawer();
    });

    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("closeDrawer sets isDrawerOpen to false", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });

    act(() => {
      result.current.openDrawer();
    });
    act(() => {
      result.current.closeDrawer();
    });

    expect(result.current.isDrawerOpen).toBe(false);
  });
});

// ─── derived values: subtotal & totalItems ────────────────────────────────────

describe("CartProvider – derived values (subtotal and totalItems)", () => {
  it("computes subtotal as sum of unitPrice * quantity for all items", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    const items = [
      makeRawItem({ id: "i1", unit_price: 5000, quantity: 2 }),   // 10_000
      makeRawItem({ id: "i2", unit_price: 3000, quantity: 3 }),   // 9_000
    ];
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart(items) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.subtotal).toBe(19000);
  });

  it("computes totalItems as sum of all quantities", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    const items = [
      makeRawItem({ id: "i1", quantity: 2 }),
      makeRawItem({ id: "i2", quantity: 3 }),
    ];
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart(items) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.totalItems).toBe(5);
  });

  it("subtotal is 0 for an empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.subtotal).toBe(0);
  });

  it("totalItems is 0 for an empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    expect(result.current.totalItems).toBe(0);
  });
});

// ─── addToCart ────────────────────────────────────────────────────────────────

describe("CartProvider – addToCart", () => {
  it("creates a cart when cartId is null and calls createLineItem", async () => {
    mockCartApi.create.mockResolvedValueOnce({ cart: makeRawCart() });
    const newItem = makeRawItem({ id: "i_new" });
    mockCartApi.createLineItem.mockResolvedValueOnce({
      cart: makeRawCart([newItem]),
    });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.addToCart("variant_01");
    });

    expect(mockCartApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ region_id: "region_01" }),
    );
    expect(mockCartApi.createLineItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ variant_id: "variant_01", quantity: 1 }),
    );
    expect(result.current.items).toHaveLength(1);
  });

  it("reuses existing cartId instead of creating a new cart", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_existing");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart() });
    const newItem = makeRawItem();
    mockCartApi.createLineItem.mockResolvedValueOnce({ cart: makeRawCart([newItem]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.cartId).toBe("cart_existing"));

    await act(async () => {
      await result.current.addToCart("variant_01");
    });

    expect(mockCartApi.create).not.toHaveBeenCalled();
    expect(mockCartApi.createLineItem).toHaveBeenCalledWith("cart_existing", expect.any(Object));
  });

  it("opens the drawer when openDrawer option is true", async () => {
    mockCartApi.create.mockResolvedValueOnce({ cart: makeRawCart() });
    mockCartApi.createLineItem.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.addToCart("variant_01", 1, { openDrawer: true });
    });

    expect(result.current.isDrawerOpen).toBe(true);
  });

  it("clears the cart when the error message includes 'already completed'", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_done");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });
    mockCartApi.createLineItem.mockRejectedValueOnce(new Error("Cart already completed"));

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.cartId).toBe("cart_done"));

    await act(async () => {
      await result.current.addToCart("variant_01");
    });

    expect(result.current.cartId).toBeNull();
    expect(result.current.items).toEqual([]);
  });
});

// ─── updateQuantity ───────────────────────────────────────────────────────────

describe("CartProvider – updateQuantity", () => {
  beforeEach(async () => {
    // no-op
  });

  it("calls updateLineItem when quantity > 0", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });
    const updatedItem = makeRawItem({ quantity: 3 });
    mockCartApi.updateLineItem.mockResolvedValueOnce({ cart: makeRawCart([updatedItem]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateQuantity("item_01", 3);
    });

    expect(mockCartApi.updateLineItem).toHaveBeenCalledWith("cart_01", "item_01", { quantity: 3 });
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("calls deleteLineItem when quantity <= 0", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });
    mockCartApi.deleteLineItem.mockResolvedValueOnce({ parent: makeRawCart([]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateQuantity("item_01", 0);
    });

    expect(mockCartApi.deleteLineItem).toHaveBeenCalledWith("cart_01", "item_01");
    expect(result.current.items).toHaveLength(0);
  });

  it("is a no-op when cartId is null", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.updateQuantity("item_01", 2);
    });
    expect(mockCartApi.updateLineItem).not.toHaveBeenCalled();
  });
});

// ─── removeFromCart ───────────────────────────────────────────────────────────

describe("CartProvider – removeFromCart", () => {
  it("calls deleteLineItem and removes the item from state", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });
    mockCartApi.deleteLineItem.mockResolvedValueOnce({ parent: makeRawCart([]) });

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.removeFromCart("item_01");
    });

    expect(mockCartApi.deleteLineItem).toHaveBeenCalledWith("cart_01", "item_01");
    expect(result.current.items).toHaveLength(0);
  });

  it("is a no-op when cartId is null", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.removeFromCart("item_01");
    });
    expect(mockCartApi.deleteLineItem).not.toHaveBeenCalled();
  });

  it("clears cart when removeFromCart error message includes 'already completed'", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_01");
    mockCartApi.retrieve.mockResolvedValueOnce({ cart: makeRawCart([makeRawItem()]) });
    mockCartApi.deleteLineItem.mockRejectedValueOnce(new Error("Cart already completed"));

    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.cartId).toBe("cart_01"));

    await act(async () => {
      await result.current.removeFromCart("item_01");
    });

    expect(result.current.cartId).toBeNull();
  });
});
