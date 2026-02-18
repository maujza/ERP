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
import {
  formatArs,
  getProductById,
  getProductName,
  translateLabel,
} from "@/lib/shop-data";

type CartLine = {
  key: string;
  productId: string;
  variantId?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartLine[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (
    productId: string,
    variantId?: string,
    options?: { openDrawer?: boolean },
  ) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  totalItems: number;
  subtotal: number;
};

const CART_STORAGE_KEY = "aurelia-cart";

const CartContext = createContext<CartContextValue | null>(null);

function getLineKey(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? "default"}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CartLine[];
      setItems(parsed);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback(
    (productId: string, variantId?: string, options?: { openDrawer?: boolean }) => {
      const key = getLineKey(productId, variantId);
      setItems((prev) => {
        const current = prev.find((line) => line.key === key);
        if (current) {
          return prev.map((line) =>
            line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }
        return [...prev, { key, productId, variantId, quantity: 1 }];
      });
      if (options?.openDrawer) {
        setIsDrawerOpen(true);
      }
    },
    [],
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.key !== key);
      return prev.map((line) => (line.key === key ? { ...line, quantity } : line));
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setItems((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce((acc, line) => {
        const product = getProductById(line.productId);
        if (!product) return acc;
        return acc + product.price * line.quantity;
      }, 0),
    [items],
  );

  const totalItems = useMemo(
    () => items.reduce((acc, line) => acc + line.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
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
    [items, isDrawerOpen, addToCart, updateQuantity, removeFromCart, totalItems, subtotal],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <MiniCartDrawer />
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

function MiniCartDrawer() {
  const { language } = useLanguage();
  const { items, isDrawerOpen, closeDrawer, subtotal, updateQuantity, removeFromCart } = useCart();
  const t = language === "ko"
    ? {
        cart: "장바구니",
        closeCart: "장바구니 닫기",
        empty: "장바구니가 비어 있습니다.",
        backHome: "홈으로",
        variant: "옵션",
        singleVariant: "단일 옵션",
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
        variant: "Variante",
        singleVariant: "Variante unica",
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
            items.map((line) => {
              const product = getProductById(line.productId);
              if (!product) return null;
              const variant = product.variants?.find((item) => item.id === line.variantId);
              return (
                <div key={line.key} className="rounded-2xl border border-black/10 p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                      <Image src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-[#111111]">
                        {getProductName(product, language)}
                      </p>
                      <p className="text-xs text-[#666666]">
                        {variant
                          ? `${t.variant}: ${translateLabel(variant.label, language)}`
                          : t.singleVariant}
                      </p>
                      <p className="text-sm font-medium text-[#111111]">{formatArs(product.price, language)}</p>
                    </div>
                    <button
                      className="h-fit rounded-full p-1 text-[#666666] hover:bg-[#f3f3f3]"
                      onClick={() => removeFromCart(line.key)}
                      aria-label={t.removeProduct}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity - 1)}
                      className="h-7 w-7 rounded-full border border-black/15"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity + 1)}
                      className="h-7 w-7 rounded-full border border-black/15"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
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
