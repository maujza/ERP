"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { useCart, type CartLineItem } from "@/components/cart-provider";
import { formatArs } from "@/lib/shop-data";
import { sdk } from "@/lib/medusa";

function QuantityInput({
  lineId,
  quantity,
  ariaLabel,
  onUpdate,
}: {
  lineId: string;
  quantity: number;
  ariaLabel: string;
  onUpdate: (id: string, qty: number) => void;
}) {
  const [local, setLocal] = useState(String(quantity));

  useEffect(() => {
    setLocal(String(quantity));
  }, [quantity]);

  const commit = () => {
    const parsed = Number.parseInt(local, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      if (parsed !== quantity) onUpdate(lineId, parsed);
    } else {
      setLocal(String(quantity));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      min={1}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      className="h-8 w-16 rounded-xl border border-[#9595db]/35 px-2 text-center text-sm font-semibold"
    />
  );
}

export function CartToast({
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
    <div className="toast-enter fixed left-4 right-4 top-20 z-[90] rounded-2xl border border-[#9595db]/25 bg-white p-3 shadow-xl md:left-auto md:right-5 md:w-72">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f2e6f7]">
          {item.thumbnail && (
            <SafeImage src={item.thumbnail} alt={item.title} fill className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#4660bc]">{t.added}</p>
          <p className="line-clamp-2 text-sm font-semibold text-[#2a2148]">{item.title}</p>
          {item.variantTitle && (
            <p className="text-xs text-[#5a4f7a]">{item.variantTitle}</p>
          )}
          <p className="text-sm font-medium text-[#2a2148]">{formatArs(item.unitPrice, language)}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 text-[#5a4f7a] hover:bg-[#f2e6f7]"
          aria-label={t.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MiniCartDrawer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { items, isDrawerOpen, closeDrawer, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const [showCheckoutChoice, setShowCheckoutChoice] = useState(false);
  const t = language === "ko"
    ? {
        cart: "장바구니",
        closeCart: "장바구니 닫기",
        empty: "장바구니가 비어 있습니다.",
        backHome: "홈으로",
        removeProduct: "상품 제거",
        quantity: "수량",
        subtotal: "소계",
        clear: "장바구니 비우기",
        continueShopping: "쇼핑 계속하기",
        goCheckout: "결제로 이동",
        checkoutChoiceTitle: "주문을 어떻게 진행할까요?",
        checkoutChoiceBody: "계정으로 계속하거나 비회원으로 바로 결제할 수 있습니다.",
        checkoutChoiceGuest: "비회원으로 계속",
        checkoutChoiceLogin: "계정으로 계속",
        checkoutChoiceCancel: "닫기",
      }
    : {
        cart: "Carrito",
        closeCart: "Cerrar carrito",
        empty: "Tu carrito esta vacio.",
        backHome: "Volver al home",
        removeProduct: "Quitar producto",
        quantity: "Cantidad",
        subtotal: "Subtotal",
        clear: "Vaciar carrito",
        continueShopping: "Continuar comprando",
        goCheckout: "Finalizar compra",
        checkoutChoiceTitle: "¿Cómo querés finalizar?",
        checkoutChoiceBody: "Podés continuar con tu cuenta o terminar como invitado.",
        checkoutChoiceGuest: "Continuar sin cuenta",
        checkoutChoiceLogin: "Entrar con mi cuenta",
        checkoutChoiceCancel: "Cancelar",
      };

  const onCheckoutClick = async () => {
    try {
      await sdk.store.customer.retrieve();
      closeDrawer();
      router.push("/checkout");
    } catch {
      setShowCheckoutChoice(true);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-[#2a2148]/45 transition ${
          isDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
      />
      <aside
        className={`fixed right-0 top-0 z-[75] flex h-full w-full max-w-md flex-col border-l border-[#9595db]/25 bg-white shadow-2xl transition-transform ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#9595db]/25 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2a2148]">{t.cart}</h2>
          <button
            onClick={closeDrawer}
            className="rounded-full border border-[#9595db]/35 p-2 text-[#2a2148]"
            aria-label={t.closeCart}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-[#9595db]/45 p-5 text-sm text-[#5a4f7a]">
              <p>{t.empty}</p>
              <Button asChild className="w-full">
                <Link href="/" onClick={closeDrawer}>
                  {t.backHome}
                </Link>
              </Button>
            </div>
          ) : (
            items.map((line) => (
              <div key={line.id} className="rounded-2xl border border-[#9595db]/25 p-3">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-[#f2e6f7]">
                    {line.thumbnail && (
                      <SafeImage src={line.thumbnail} alt={line.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#2a2148]">{line.title}</p>
                    {line.variantTitle && (
                      <p className="text-xs text-[#5a4f7a]">{line.variantTitle}</p>
                    )}
                    <p className="text-sm font-medium text-[#2a2148]">{formatArs(line.unitPrice, language)}</p>
                  </div>
                  <button
                    className="h-fit rounded-full p-1 text-[#5a4f7a] hover:bg-[#f2e6f7]"
                    onClick={() => removeFromCart(line.id)}
                    aria-label={t.removeProduct}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(line.id, line.quantity - 1)}
                    className="h-7 w-7 rounded-full border border-[#9595db]/35"
                  >
                    -
                  </button>
                  <QuantityInput
                    lineId={line.id}
                    quantity={line.quantity}
                    ariaLabel={`${t.quantity} ${line.title}`}
                    onUpdate={updateQuantity}
                  />
                  <button
                    onClick={() => updateQuantity(line.id, line.quantity + 1)}
                    className="h-7 w-7 rounded-full border border-[#9595db]/35"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-[#9595db]/25 px-5 py-4">
          <div className="mb-4 flex items-center justify-between text-sm text-[#5a4f7a]">
            <span>{t.subtotal}</span>
            <span className="font-semibold text-[#2a2148]">{formatArs(subtotal, language)}</span>
          </div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={clearCart} disabled={items.length === 0}>
              {t.clear}
            </Button>
            <Button variant="outline" onClick={closeDrawer}>
              {t.continueShopping}
            </Button>
            <Button onClick={() => void onCheckoutClick()}>
              {t.goCheckout}
            </Button>
          </div>
        </div>
      </aside>
      {showCheckoutChoice && (
        <>
          <div className="fixed inset-0 z-[80] bg-[#2a2148]/50" onClick={() => setShowCheckoutChoice(false)} />
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border border-[#9595db]/25 bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-black">{t.checkoutChoiceTitle}</h3>
              <p className="mt-2 text-sm text-[#5a4f7a]">{t.checkoutChoiceBody}</p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutChoice(false);
                    closeDrawer();
                    router.push("/checkout?guest=1");
                  }}
                  className="rounded-xl border border-[#9595db]/35 bg-white px-4 py-2.5 text-sm font-semibold text-black"
                >
                  {t.checkoutChoiceGuest}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutChoice(false);
                    closeDrawer();
                    router.push("/auth?next=/checkout");
                  }}
                  className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a2148]/90"
                >
                  {t.checkoutChoiceLogin}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckoutChoice(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-[#5a4f7a]"
                >
                  {t.checkoutChoiceCancel}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
