"use client";

import Link from "next/link";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/shop-data";
import { sdk } from "@/lib/medusa";

const CART_ID_KEY = "aurelia-cart-id";
const REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? "";

type CartLineItem = {
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
    thumbnail: (item.thumbnail as string | null) ?? null,
    quantity: (item.quantity as number) ?? 0,
    unitPrice: (item.unit_price as number) ?? 0,
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLineItem | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), 2500);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  // Hydrate cart from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(CART_ID_KEY);
    if (!storedId) return;
    sdk.store.cart.retrieve(storedId).then(({ cart }) => {
      setCartId(storedId);
      setItems(lineItemsFromCart(cart));
    }).catch(() => {
      localStorage.removeItem(CART_ID_KEY);
    });
  }, []);

  const getOrCreateCart = useCallback(async (): Promise<string> => {
    if (cartId) return cartId;
    const { cart } = await sdk.store.cart.create({ region_id: REGION_ID });
    const id = cart.id;
    localStorage.setItem(CART_ID_KEY, id);
    setCartId(id);
    return id;
  }, [cartId]);

  const addToCart = useCallback(async (
    variantId: string,
    quantity = 1,
    options?: { openDrawer?: boolean },
  ) => {
    const id = await getOrCreateCart();
    const { cart } = await sdk.store.cart.createLineItem(id, {
      variant_id: variantId,
      quantity,
    });
    const updatedItems = lineItemsFromCart(cart);
    setItems(updatedItems);
    if (options?.openDrawer) {
      setIsDrawerOpen(true);
    } else {
      const added = updatedItems.find((li) => li.variantId === variantId);
      if (added) setLastAdded(added);
    }
  }, [getOrCreateCart]);

  const updateQuantity = useCallback(async (lineItemId: string, quantity: number) => {
    if (!cartId) return;
    if (quantity <= 0) {
      const { parent: cart } = await sdk.store.cart.deleteLineItem(cartId, lineItemId);
      setItems(lineItemsFromCart(cart ?? null));
    } else {
      const { cart } = await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity });
      setItems(lineItemsFromCart(cart));
    }
  }, [cartId]);

  const removeFromCart = useCallback(async (lineItemId: string) => {
    if (!cartId) return;
    const { parent: cart } = await sdk.store.cart.deleteLineItem(cartId, lineItemId);
    setItems(lineItemsFromCart(cart ?? null));
  }, [cartId]);

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
      addToCart,
      updateQuantity,
      removeFromCart,
      totalItems,
      subtotal,
    }),
    [cartId, items, isDrawerOpen, addToCart, updateQuantity, removeFromCart, totalItems, subtotal],
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

function CartToast({
  item,
  onDismiss,
}: {
  item: CartLineItem;
  onDismiss: () => void;
}) {
  const { language } = useLanguage();
  const t = language === "ko"
    ? { added: "장바구니에 추가됨", dismiss: "닫기" }
    : { added: "Agregado al carrito", dismiss: "Cerrar" };

  return (
    <div className="toast-enter fixed left-4 right-4 top-20 z-[90] rounded-2xl border border-black/10 bg-white p-3 shadow-xl md:left-auto md:right-5 md:w-72">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f3f3f3]">
          {item.thumbnail && (
            <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#ff2d55]">{t.added}</p>
          <p className="line-clamp-2 text-sm font-semibold text-[#111111]">{item.title}</p>
          {item.variantTitle && (
            <p className="text-xs text-[#666666]">{item.variantTitle}</p>
          )}
          <p className="text-sm font-medium text-[#111111]">{formatArs(item.unitPrice, language)}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 text-[#666666] hover:bg-[#f3f3f3]"
          aria-label={t.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MiniCartDrawer() {
  const { language } = useLanguage();
  const { items, isDrawerOpen, closeDrawer, subtotal, updateQuantity, removeFromCart } = useCart();
  const t = language === "ko"
    ? {
        cart: "장바구니",
        closeCart: "장바구니 닫기",
        empty: "장바구니가 비어 있습니다.",
        backHome: "홈으로",
        removeProduct: "상품 제거",
        subtotal: "소계",
        continueShopping: "쇼핑 계속하기",
        goCheckout: "결제로 이동",
      }
    : {
        cart: "Carrito",
        closeCart: "Cerrar carrito",
        empty: "Tu carrito esta vacio.",
        backHome: "Volver al home",
        removeProduct: "Quitar producto",
        subtotal: "Subtotal",
        continueShopping: "Continuar comprando",
        goCheckout: "Ir al checkout",
      };

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/45 transition ${
          isDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
      />
      <aside
        className={`fixed right-0 top-0 z-[75] flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white shadow-2xl transition-transform ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#111111]">{t.cart}</h2>
          <button
            onClick={closeDrawer}
            className="rounded-full border border-black/15 p-2 text-[#111111]"
            aria-label={t.closeCart}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-black/20 p-5 text-sm text-[#666666]">
              <p>{t.empty}</p>
              <Button asChild className="w-full">
                <Link href="/" onClick={closeDrawer}>
                  {t.backHome}
                </Link>
              </Button>
            </div>
          ) : (
            items.map((line) => (
              <div key={line.id} className="rounded-2xl border border-black/10 p-3">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-[#f3f3f3]">
                    {line.thumbnail && (
                      <Image src={line.thumbnail} alt={line.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#111111]">{line.title}</p>
                    {line.variantTitle && (
                      <p className="text-xs text-[#666666]">{line.variantTitle}</p>
                    )}
                    <p className="text-sm font-medium text-[#111111]">{formatArs(line.unitPrice, language)}</p>
                  </div>
                  <button
                    className="h-fit rounded-full p-1 text-[#666666] hover:bg-[#f3f3f3]"
                    onClick={() => removeFromCart(line.id)}
                    aria-label={t.removeProduct}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(line.id, line.quantity - 1)}
                    className="h-7 w-7 rounded-full border border-black/15"
                  >
                    -
                  </button>
                  <span className="text-sm font-semibold">{line.quantity}</span>
                  <button
                    onClick={() => updateQuantity(line.id, line.quantity + 1)}
                    className="h-7 w-7 rounded-full border border-black/15"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-black/10 px-5 py-4">
          <div className="mb-4 flex items-center justify-between text-sm text-[#555555]">
            <span>{t.subtotal}</span>
            <span className="font-semibold text-[#111111]">{formatArs(subtotal, language)}</span>
          </div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={closeDrawer}>
              {t.continueShopping}
            </Button>
            <Button asChild>
              <Link href="/checkout" onClick={closeDrawer}>
                {t.goCheckout}
              </Link>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
