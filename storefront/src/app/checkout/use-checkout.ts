"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { formatArs, type UiLanguage } from "@/lib/shop-data";
import { sdk } from "@/lib/medusa";
import { saveWhatsAppDraft, openWhatsAppDraft, type WhatsAppDraft } from "@/lib/whatsapp";
import { getCheckoutTranslations } from "./translations";
import type { CheckoutErrors, ShippingAddress } from "./types";

const requiredShippingFields = ["firstName", "lastName", "address", "postalCode", "city", "province"] as const;
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export type CartLineWithTotal = {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function useCheckout() {
  const { language } = useLanguage() as { language: UiLanguage; setLanguage: (l: UiLanguage) => void; toggleLanguage: () => void };
  const router = useRouter();
  const { cartId, items, subtotal, clearCart } = useCart();
  const t = useMemo(() => getCheckoutTranslations(language), [language]);

  // ── Contact ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [contactComplete, setContactComplete] = useState(false);

  // ── Shipping ─────────────────────────────────────────────────────────────
  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    address: "",
    postalCode: "",
    city: "",
    province: "",
    saveInfo: true,
  });
  const [shippingErrors, setShippingErrors] = useState<CheckoutErrors>({});

  // ── Discount ─────────────────────────────────────────────────────────────
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  // ── Auth / flow ───────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const [checkedCustomerAuth, setCheckedCustomerAuth] = useState(false);
  const [showCheckoutChoice, setShowCheckoutChoice] = useState(false);
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(false);
  const [hasPromptedCheckoutChoice, setHasPromptedCheckoutChoice] = useState(false);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [summaryOpenMobile, setSummaryOpenMobile] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const cartLines = useMemo<CartLineWithTotal[]>(
    () => (items as CartLineWithTotal[]).map((line) => ({ ...line, lineTotal: line.unitPrice * line.quantity })),
    [items],
  );

  const total = subtotal - discountAmount;

  const allShippingRequiredComplete = requiredShippingFields.every((key) => shipping[key].trim());

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("guest") === "1") setAllowGuestCheckout(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    void checkCustomerAuth(false).then((isAuthenticated) => {
      if (!mounted) return;
      setIsCustomerAuthenticated(isAuthenticated);
      setCheckedCustomerAuth(true);
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasPromptedCheckoutChoice) return;
    if (!checkedCustomerAuth) return;
    if (isCustomerAuthenticated) return;
    if (allowGuestCheckout) return;
    if (cartLines.length === 0) return;
    setShowCheckoutChoice(true);
    setHasPromptedCheckoutChoice(true);
  }, [allowGuestCheckout, cartLines.length, checkedCustomerAuth, hasPromptedCheckoutChoice, isCustomerAuthenticated]);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  async function checkCustomerAuth(syncState = true) {
    try {
      await sdk.store.customer.retrieve();
      if (syncState) { setIsCustomerAuthenticated(true); setCheckedCustomerAuth(true); }
      return true;
    } catch {
      if (syncState) { setIsCustomerAuthenticated(false); setCheckedCustomerAuth(true); }
      return false;
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) return t.enterEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t.invalidEmail;
    return "";
  }, [t]);

  const validatePhone = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return t.requiredField;
    if (digits.length < 8) return t.invalidPhone;
    return "";
  }, [t]);

  const validateShippingField = useCallback((key: string, value: string) => {
    if (!value.trim()) return t.requiredField;
    if (key === "postalCode" && value.trim().length < 4) return t.invalidPostal;
    return "";
  }, [t]);

  const onEmailBlur = useCallback(() => {
    const emailError = validateEmail(email);
    if (emailError) { setContactComplete(false); return; }
    setContactComplete(true);
    setShowLoginHint(true);
  }, [email, validateEmail]);

  const onShippingBlur = useCallback((field: string) => {
    const error = validateShippingField(field, shipping[field as keyof ShippingAddress] as string);
    setShippingErrors((prev) => ({ ...prev, [field]: error }));
  }, [shipping, validateShippingField]);

  // ── Discount ──────────────────────────────────────────────────────────────
  const applyDiscount = useCallback(async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) { setDiscountAmount(0); setDiscountError(t.enterCode); return; }
    if (!cartId) { setDiscountError(t.invalidCode); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { cart: updatedCart } = await sdk.store.cart.update(cartId, { promo_codes: [code] } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((updatedCart as any)?.completed_at) {
        clearCart();
        setDiscountAmount(0);
        setDiscountError(language === "ko" ? "이미 완료된 주문입니다. 새 카트를 시작하세요." : "Ese carrito ya fue finalizado. Inicia un carrito nuevo.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const discount = (updatedCart as any).discount_total ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promoApplied = ((updatedCart as any).promotions ?? []).some(
        (promo: { code?: string }) => promo.code?.toUpperCase() === code,
      );
      if (discount > 0 || promoApplied) {
        setDiscountAmount(discount);
        setDiscountError("");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await sdk.store.cart.update(cartId, { promo_codes: [] } as any).catch(() => {});
        setDiscountAmount(0);
        setDiscountError(t.invalidCode);
      }
    } catch (error) {
      setDiscountAmount(0);
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      if (msg.includes("already completed")) {
        clearCart();
        setDiscountError(language === "ko" ? "이미 완료된 주문입니다. 새 카트를 시작하세요." : "Ese carrito ya fue finalizado. Inicia un carrito nuevo.");
      } else {
        setDiscountError(t.invalidCode);
      }
    }
  }, [cartId, clearCart, discountCode, language, t]);

  const savePhoneToProfile = useCallback(async (phoneNumber: string) => {
    if (!isCustomerAuthenticated || !phoneNumber) return;
    await sdk.store.customer.update({ phone: phoneNumber }).catch((err: unknown) => {
      console.error("[checkout] Failed to save phone to profile", err);
    });
  }, [isCustomerAuthenticated]);

  // ── Order submission ──────────────────────────────────────────────────────
  const completeCartAsOrder = useCallback(async (phone?: string) => {
    if (!cartId) return "";

    await sdk.store.cart.update(cartId, {
      email,
      ...(shipping.address ? {
        shipping_address: {
          first_name: shipping.firstName || "Cliente",
          last_name: shipping.lastName || "Store",
          address_1: shipping.address,
          postal_code: shipping.postalCode || "1000",
          city: shipping.city || "Buenos Aires",
          country_code: "ar",
          phone: phone || undefined,
        },
      } : {}),
      metadata: {
        whatsapp_required: true,
        whatsapp_message_sent: false,
        whatsapp_payment_method: "transfer",
        whatsapp_assignee: "aurelia",
        customer_phone: phone || undefined,
      },
    });

    // Auto-pick the first available shipping option — not shown to the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { shipping_options } = await (sdk.store.fulfillment.listCartOptions({ cart_id: cartId } as any) as Promise<{ shipping_options: any[] }>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstOptionId: string = (shipping_options ?? [])[0]?.id ?? "";
    if (!firstOptionId) {
      throw new Error(
        language === "ko"
          ? "이 배송지에 사용 가능한 배송 옵션이 없습니다."
          : "No hay opciones de envío disponibles para esta dirección.",
      );
    }
    await sdk.store.cart.addShippingMethod(cartId, { option_id: firstOptionId });

    const { cart: cartObj } = await sdk.store.cart.retrieve(cartId, { fields: "+payment_collection" });
    await sdk.store.payment.initiatePaymentSession(cartObj, { provider_id: "pp_system_default" });

    const result = await sdk.store.cart.complete(cartId);
    if ((result as { type: string }).type === "order") {
      const orderId = (result as { order?: { id: string } }).order?.id ?? "";
      clearCart();
      return orderId;
    }
    const cartResult = result as { cart?: { id?: string } };
    throw new Error(
      language === "ko"
        ? `주문을 완료할 수 없습니다 (${cartResult.cart?.id ?? cartId}): 배송 방법 또는 결제 세션이 누락되었습니다.`
        : `No se pudo completar el pedido (${cartResult.cart?.id ?? cartId}): método de envío o sesión de pago ausente.`,
    );
  }, [cartId, clearCart, email, language, shipping]);

  const submitOrder = useCallback(async (forceGuest = false) => {
    if (isSubmitting) return;
    const isAuthenticated = checkedCustomerAuth ? isCustomerAuthenticated : await checkCustomerAuth(true);
    if (!isAuthenticated && !(allowGuestCheckout || forceGuest)) {
      setShowCheckoutChoice(true);
      return;
    }
    if (forceGuest && !allowGuestCheckout) setAllowGuestCheckout(true);

    try {
      const emailError = validateEmail(email);
      if (emailError) { setContactComplete(false); return; }
      const phoneValidationError = validatePhone(phone);
      if (phoneValidationError) { setPhoneError(phoneValidationError); return; }

      let orderId = "";
      if (cartId) {
        setIsSubmitting(true);
        try {
          orderId = await completeCartAsOrder(phone.trim() || undefined);
        } catch (err) {
          console.error("[checkout] Order creation failed", err);
          const msg = err instanceof Error ? err.message : "";
          setDiscountError(
            language === "ko"
              ? `주문 처리 중 오류가 발생했습니다${msg ? `: ${msg}` : ""}`
              : `No se pudo crear el pedido${msg ? `: ${msg}` : ""}. Revisá los datos e intentá nuevamente.`,
          );
          setIsSubmitting(false);
          return;
        } finally {
          setIsSubmitting(false);
        }
      }

      const lines = cartLines
        .map((line) => `• ${line.title} x${line.quantity} - ${formatArs(line.lineTotal, language)}`)
        .join("\n");
      const addressParts = [shipping.address, shipping.city, shipping.province, shipping.postalCode]
        .filter(Boolean).join(", ");
      const msg = [
        language === "ko" ? "안녕하세요! WhatsApp으로 주문을 완료하고 싶습니다:" : "Hola! Quiero finalizar mi pedido:",
        "",
        lines,
        "",
        `${t.subtotal}: ${formatArs(subtotal, language)}`,
        discountAmount > 0 ? `${t.discount}: -${formatArs(discountAmount, language)}` : null,
        `${t.total}: ${formatArs(total, language)}`,
        "",
        shipping.firstName.trim() ? `${t.firstName}: ${shipping.firstName} ${shipping.lastName}` : null,
        addressParts ? `${t.address}: ${addressParts}` : null,
        `${t.email}: ${email}`,
        phone.trim() ? `${t.phone}: ${phone.trim()}` : null,
        `${t.paymentVia}: ${t.transfer}`,
        orderId ? `${t.orderNumber}: ${orderId}` : null,
      ].filter(Boolean).join("\n");

      const draft: WhatsAppDraft = {
        createdAt: new Date().toISOString(),
        message: msg,
        orderId,
        paymentMethod: "transfer",
        phone: WHATSAPP_NUMBER,
      };
      saveWhatsAppDraft(draft);
      openWhatsAppDraft(draft);
      if (orderId) {
        void savePhoneToProfile(phone.trim());
        router.push(`/order-confirmation?wa=1&order_id=${encodeURIComponent(orderId)}`);
      }
    } catch (error) {
      console.error("Checkout submission failed", error);
      setDiscountError(language === "ko" ? "처리 중 오류가 발생했습니다" : "Ocurrió un error al procesar el pedido");
      setIsSubmitting(false);
    }
  }, [
    allowGuestCheckout, cartId, cartLines, checkedCustomerAuth, completeCartAsOrder,
    discountAmount, email, isCustomerAuthenticated, isSubmitting,
    language, phone, router, savePhoneToProfile,
    shipping, subtotal, t, total,
    validateEmail, validatePhone,
  ]);

  return {
    // translations
    t,
    language,
    // contact
    email, setEmail,
    phone, setPhone,
    phoneError, setPhoneError,
    showLoginHint,
    contactComplete,
    onEmailBlur,
    // shipping
    shipping, setShipping,
    shippingErrors,
    allShippingRequiredComplete,
    onShippingBlur,
    // discount
    discountCode, setDiscountCode,
    discountError, setDiscountError,
    discountAmount,
    applyDiscount,
    // order flow
    isSubmitting,
    isCustomerAuthenticated,
    showCheckoutChoice, setShowCheckoutChoice,
    submitOrder,
    // derived
    cartLines,
    total,
    subtotal,
    // UI
    summaryOpenMobile, setSummaryOpenMobile,
  };
}
