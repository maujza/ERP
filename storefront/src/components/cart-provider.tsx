"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CartToast, MiniCartDrawer } from "@/components/cart-drawer";
import { MEDUSA_COUNTRY_CODE, MEDUSA_REGION_ID, sdk } from "@/lib/medusa";

const CART_ID_KEY = "aurelia-cart-id";

export type CartLineItem = {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: number;
};

type CartContextValue = {
  cartId: string | null;
  items: CartLineItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCart: () => void;
  addToCart: (variantId: string, quantity?: number, options?: { openDrawer?: boolean }) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineItemId: string) => Promise<void>;
  totalItems: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineItemsFromCart(cart: { items?: unknown[] | null } | null): CartLineItem[] {
  if (!cart?.items) return [];
  return (cart.items as Record<string, unknown>[]).map((item) => ({
    id: item.id as string,
    variantId: (item.variant_id as string) ?? "",
    title: (item.title as string) ?? "",
    variantTitle: ((item.variant as Record<string, unknown>)?.title as string) ?? "",
    thumbnail: (item.thumbnail as string | null)
      ?? ((item.variant as Record<string, unknown>)?.product as Record<string, unknown>)?.thumbnail as string | null
      ?? (((item.variant as Record<string, unknown>)?.product as Record<string, unknown>)?.images as { url: string }[] | null)?.[0]?.url
      ?? null,
    quantity: (item.quantity as number) ?? 0,
    unitPrice: (item.unit_price as number) ?? 0,
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const resolvedRegionIdRef = useRef<string>(MEDUSA_REGION_ID);
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLineItem | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), 2500);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY);
    setCartId(null);
    setItems([]);
    setLastAdded(null);
  }, []);

  // Hydrate cart from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(CART_ID_KEY);
    if (!storedId) return;
    sdk.store.cart.retrieve(storedId, { fields: "+items.variant.product.thumbnail,+items.variant.product.images.url" }).then(({ cart }) => {
      if ((cart as { completed_at?: string | null })?.completed_at) {
        clearCart();
        return;
      }
      setCartId(storedId);
      setItems(lineItemsFromCart(cart));
    }).catch(() => {
      clearCart();
    });
  }, [clearCart]);

  const resolveRegionId = useCallback(async () => {
    if (resolvedRegionIdRef.current) return resolvedRegionIdRef.current;

    type StoreRegion = {
      id?: string;
      countries?: Array<{ iso_2?: string }>;
    };
    const storeApi = sdk.store as unknown as {
      region: { list: (query: { limit: number }) => Promise<{ regions: StoreRegion[] }> };
    };
    const { regions } = await storeApi.region.list({ limit: 50 });
    const matched = regions.find((region) =>
      region.countries?.some((country) => country.iso_2?.toLowerCase() === MEDUSA_COUNTRY_CODE),
    );
    const resolved = matched?.id ?? regions[0]?.id;
    if (!resolved) {
      throw new Error("No Medusa region available");
    }
    resolvedRegionIdRef.current = resolved;
    return resolved;
  }, []);

  const getOrCreateCart = useCallback(async (): Promise<string> => {
    if (cartId) return cartId;
    const regionId = await resolveRegionId();
    const { cart } = await sdk.store.cart.create({ region_id: regionId });
    const id = cart.id;
    localStorage.setItem(CART_ID_KEY, id);
    setCartId(id);
    return id;
  }, [cartId, resolveRegionId]);

  const addToCart = useCallback(async (
    variantId: string,
    quantity = 1,
    options?: { openDrawer?: boolean },
  ) => {
    try {
      const id = await getOrCreateCart();
      const { cart } = await sdk.store.cart.createLineItem(id, {
        variant_id: variantId,
        quantity,
      }, { fields: "+items.variant.product.thumbnail,+items.variant.product.images.url" });
      const updatedItems = lineItemsFromCart(cart);
      setItems(updatedItems);
      if (options?.openDrawer) {
        setIsDrawerOpen(true);
      } else {
        const added = updatedItems.find((li) => li.variantId === variantId);
        if (added) setLastAdded(added);
      }
    } catch (error) {
      console.error("Failed to add item to cart", error);
      if (error instanceof Error && error.message.toLowerCase().includes("already completed")) {
        clearCart();
      }
    }
  }, [clearCart, getOrCreateCart]);

  const updateQuantity = useCallback(async (lineItemId: string, quantity: number) => {
    if (!cartId) return;
    try {
      if (quantity <= 0) {
        const { parent: cart } = await sdk.store.cart.deleteLineItem(cartId, lineItemId, { fields: "+items.variant.product.thumbnail,+items.variant.product.images.url" });
        setItems(lineItemsFromCart(cart ?? null));
      } else {
        const { cart } = await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity }, { fields: "+items.variant.product.thumbnail,+items.variant.product.images.url" });
        setItems(lineItemsFromCart(cart));
      }
    } catch (error) {
      console.error("Failed to update cart line item", error);
      if (error instanceof Error && error.message.toLowerCase().includes("already completed")) {
        clearCart();
      }
    }
  }, [cartId, clearCart]);

  const removeFromCart = useCallback(async (lineItemId: string) => {
    if (!cartId) return;
    try {
      const { parent: cart } = await sdk.store.cart.deleteLineItem(cartId, lineItemId, { fields: "+items.variant.product.thumbnail,+items.variant.product.images.url" });
      setItems(lineItemsFromCart(cart ?? null));
    } catch (error) {
      console.error("Failed to remove cart line item", error);
      if (error instanceof Error && error.message.toLowerCase().includes("already completed")) {
        clearCart();
      }
    }
  }, [cartId, clearCart]);

  const subtotal = useMemo(
    () => items.reduce((acc, li) => acc + li.unitPrice * li.quantity, 0),
    [items],
  );

  const totalItems = useMemo(
    () => items.reduce((acc, li) => acc + li.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cartId,
      items,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      clearCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      totalItems,
      subtotal,
    }),
    [cartId, items, isDrawerOpen, clearCart, addToCart, updateQuantity, removeFromCart, totalItems, subtotal],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <MiniCartDrawer />
      {lastAdded && (
        <CartToast item={lastAdded} onDismiss={() => setLastAdded(null)} />
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
