"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { formatArs, type UiLanguage } from "@/lib/shop-data";
import { sdk } from "@/lib/medusa";
import { saveWhatsAppDraft, openWhatsAppDraft, type WhatsAppDraft } from "@/lib/whatsapp";
import { getCheckoutTranslations } from "./translations";
import type { CheckoutErrors, PaymentMethod, PaymentState, ShippingAddress, ShippingMethod } from "./types";

const requiredShippingFields = ["firstName", "lastName", "address", "postalCode", "city", "province"] as const;
const fallbackShippingMethodIds = new Set(["standard", "express"]);
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
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>("");

  // ── Discount ─────────────────────────────────────────────────────────────
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  // ── Payment ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mp");
  const [payment, setPayment] = useState<PaymentState>({
    useShippingAsBilling: true,
    billingAddress: "",
    billingCity: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<CheckoutErrors>({});

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

  const shippingAmount = useMemo(() => {
    const method = shippingMethods.find((item) => item.id === selectedShippingMethod);
    return method?.amount ?? 0;
  }, [selectedShippingMethod, shippingMethods]);

  const total = subtotal + shippingAmount - discountAmount;
  const isWhatsAppPaymentMethod = paymentMethod === "wpp" || paymentMethod === "cash" || paymentMethod === "transfer";

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
    if (!/^\S+@\S+\.\S+$/.test(value)) return t.invalidEmail;
    return "";
  }, [t]);

  const validatePhone = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (isWhatsAppPaymentMethod && !digits) return t.requiredField;
    if (digits && digits.length < 8) return t.invalidPhone;
    return "";
  }, [isWhatsAppPaymentMethod, t]);

  const validateShippingField = useCallback((key: string, value: string) => {
    if (!value.trim()) return t.requiredField;
    if (key === "postalCode" && value.trim().length < 4) return t.invalidPostal;
    return "";
  }, [t]);

  const validatePayment = useCallback(() => {
    const nextErrors: CheckoutErrors = {};
    if (!payment.useShippingAsBilling) {
      if (!payment.billingAddress.trim()) nextErrors.billingAddress = t.requiredAddress;
      if (!payment.billingCity.trim()) nextErrors.billingCity = t.requiredCity;
    }
    setPaymentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [payment, t]);

  // ── Shipping methods ──────────────────────────────────────────────────────
  const maybeLoadShippingMethods = useCallback(() => {
    if (!allShippingRequiredComplete) return;
    if (loadingShippingMethods) return;
    const errors: CheckoutErrors = {};
    requiredShippingFields.forEach((field) => {
      const error = validateShippingField(field, shipping[field]);
      if (error) errors[field] = error;
    });
    setShippingErrors((prev) => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0) return;
    if (!cartId) return;

    setLoadingShippingMethods(true);
    setShippingMethods([]);

    sdk.store.cart.update(cartId, {
      shipping_address: {
        first_name: shipping.firstName,
        last_name: shipping.lastName,
        address_1: shipping.address,
        postal_code: shipping.postalCode,
        city: shipping.city,
        country_code: "ar",
      },
      email,
    }).then(() =>
      sdk.store.fulfillment.listCartOptions({ cart_id: cartId })
    ).then(({ shipping_options }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const methods: ShippingMethod[] = (shipping_options ?? []).map((opt: any) => ({
        id: opt.id as string,
        label: (opt.name ?? "") as string,
        amount: (opt.amount ?? 0) as number,
        eta: "",
      }));
      setShippingMethods(methods);
      setSelectedShippingMethod(methods[0]?.id ?? "");
    }).catch((err: unknown) => {
      console.error("[checkout] Failed to load shipping methods", err);
      const standardAmount = Number(process.env.NEXT_PUBLIC_SHIPPING_STANDARD_ARS ?? 3900);
      const expressAmount = Number(process.env.NEXT_PUBLIC_SHIPPING_EXPRESS_ARS ?? 7200);
      const estimateLabel = language === "ko" ? " (예상)" : " (est.)";
      const methods: ShippingMethod[] = [
        { id: "standard", label: (language === "ko" ? "일반 배송" : "Envio estandar") + estimateLabel, amount: standardAmount, eta: "48/72h" },
        { id: "express", label: (language === "ko" ? "익스프레스 배송" : "Envio express") + estimateLabel, amount: expressAmount, eta: "24h" },
      ];
      setShippingMethods(methods);
      setSelectedShippingMethod(methods[0]?.id ?? "");
    }).finally(() => {
      setLoadingShippingMethods(false);
    });
  }, [allShippingRequiredComplete, cartId, email, language, loadingShippingMethods, shipping, validateShippingField]);

  const onEmailBlur = useCallback(() => {
    const emailError = validateEmail(email);
    if (emailError) { setContactComplete(false); return; }
    setContactComplete(true);
    setShowLoginHint(true);
  }, [email, validateEmail]);

  const onShippingBlur = useCallback((field: string) => {
    const error = validateShippingField(field, shipping[field as keyof ShippingAddress] as string);
    setShippingErrors((prev) => ({ ...prev, [field]: error }));
    maybeLoadShippingMethods();
  }, [maybeLoadShippingMethods, shipping, validateShippingField]);

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

  // ── Order submission ──────────────────────────────────────────────────────
  const resolveRealShippingOptionId = useCallback(async () => {
    if (!cartId) return "";
    if (selectedShippingMethod && !fallbackShippingMethodIds.has(selectedShippingMethod)) {
      return selectedShippingMethod;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { shipping_options } = await sdk.store.fulfillment.listCartOptions({ cart_id: cartId } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((shipping_options ?? []) as any[]).find((opt) => opt?.id)?.id ?? "";
    } catch {
      return "";
    }
  }, [cartId, selectedShippingMethod]);

  const savePhoneToProfile = useCallback(async (phoneNumber: string) => {
    if (!isCustomerAuthenticated || !phoneNumber) return;
    await sdk.store.customer.update({ phone: phoneNumber }).catch((err: unknown) => {
      console.error("[checkout] Failed to save phone to profile", err);
    });
  }, [isCustomerAuthenticated]);

  const resolvePaymentLabel = useCallback((method: PaymentMethod) => {
    if (method === "mp") return t.mp;
    if (method === "cash") return t.cash;
    if (method === "transfer") return t.transfer;
    return t.wpp;
  }, [t]);

  const completeCartAsOrder = useCallback(async (options?: {
    phone?: string;
    whatsapp?: { paymentMethod: PaymentMethod; customerPhone?: string };
  }) => {
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
          phone: options?.phone || undefined,
        },
      } : {}),
      ...(options?.whatsapp ? {
        metadata: {
          whatsapp_required: true,
          whatsapp_message_sent: false,
          whatsapp_payment_method: options.whatsapp.paymentMethod,
          whatsapp_assignee: "aurelia",
          customer_phone: options.whatsapp.customerPhone || undefined,
        },
      } : {}),
    });
    const realOptionId = await resolveRealShippingOptionId();
    if (realOptionId) {
      await sdk.store.cart.addShippingMethod(cartId, { option_id: realOptionId }).catch((err: unknown) => {
        console.error("[checkout] addShippingMethod failed", err);
      });
    }
    const { cart: cartObj } = await sdk.store.cart.retrieve(cartId);
    await sdk.store.payment.initiatePaymentSession(cartObj, { provider_id: "pp_system_default" }).catch((err: unknown) => {
      console.error("[checkout] initiatePaymentSession failed", err);
    });
    const result = await sdk.store.cart.complete(cartId).catch(() => ({ type: "error" as const }));
    if ((result as { type: string }).type === "order") {
      const orderId = (result as { order?: { id: string } }).order?.id ?? "";
      clearCart();
      return orderId;
    }
    return "";
  }, [cartId, clearCart, email, resolveRealShippingOptionId, shipping]);

  const submitOrder = useCallback(async (forceGuest = false) => {
    if (isSubmitting) return;
    const isAuthenticated = checkedCustomerAuth ? isCustomerAuthenticated : await checkCustomerAuth(true);
    if (!isAuthenticated && !(allowGuestCheckout || forceGuest)) {
      setShowCheckoutChoice(true);
      return;
    }
    if (forceGuest && !allowGuestCheckout) setAllowGuestCheckout(true);

    try {
      if (isWhatsAppPaymentMethod) {
        const emailError = validateEmail(email);
        if (emailError) { setContactComplete(false); return; }
        const phoneValidationError = validatePhone(phone);
        if (phoneValidationError) { setPhoneError(phoneValidationError); return; }

        let orderId = "";
        if (cartId) {
          setIsSubmitting(true);
          try {
            orderId = await completeCartAsOrder({
              phone: phone.trim() || undefined,
              whatsapp: { paymentMethod, customerPhone: phone.trim() || undefined },
            });
          } catch {
            // Keep WhatsApp fallback even when order creation fails.
          } finally {
            setIsSubmitting(false);
          }
        }

        const lines = cartLines
          .map((line) => `• ${line.title} x${line.quantity} - ${formatArs(line.lineTotal, language)}`)
          .join("\n");
        const shippingMethodObj = shippingMethods.find((m) => m.id === selectedShippingMethod);
        const addressParts = [shipping.address, shipping.city, shipping.province, shipping.postalCode]
          .filter(Boolean).join(", ");
        const msg = [
          language === "ko" ? "안녕하세요! WhatsApp으로 주문을 완료하고 싶습니다:" : "Hola! Quiero finalizar mi pedido:",
          "",
          lines,
          "",
          `${t.subtotal}: ${formatArs(subtotal, language)}`,
          shippingMethodObj ? `${t.shipping}: ${formatArs(shippingAmount, language)} (${shippingMethodObj.label})` : null,
          discountAmount > 0 ? `${t.discount}: -${formatArs(discountAmount, language)}` : null,
          `${t.total}: ${formatArs(total, language)}`,
          "",
          shipping.firstName.trim() ? `${t.firstName}: ${shipping.firstName} ${shipping.lastName}` : null,
          addressParts ? `${t.address}: ${addressParts}` : null,
          `${t.email}: ${email}`,
          phone.trim() ? `${t.phone}: ${phone.trim()}` : null,
          `${t.paymentVia}: ${resolvePaymentLabel(paymentMethod)}`,
          orderId ? `N° pedido: ${orderId}` : null,
        ].filter(Boolean).join("\n");

        const draft: WhatsAppDraft = {
          createdAt: new Date().toISOString(),
          message: msg,
          orderId,
          paymentMethod,
          phone: WHATSAPP_NUMBER,
        };
        saveWhatsAppDraft(draft);
        openWhatsAppDraft(draft);
        if (orderId) {
          void savePhoneToProfile(phone.trim());
          router.push(`/order-confirmation?wa=1&order_id=${encodeURIComponent(orderId)}`);
        }
        return;
      }

      const emailError = validateEmail(email);
      if (emailError) { setContactComplete(false); return; }

      const shippingValidation: CheckoutErrors = {};
      requiredShippingFields.forEach((field) => {
        const error = validateShippingField(field, shipping[field]);
        if (error) shippingValidation[field] = error;
      });
      setShippingErrors(shippingValidation);
      if (Object.keys(shippingValidation).length > 0) return;

      if (paymentMethod === "mp") {
        if (!cartId) return;
        setIsSubmitting(true);
        try {
          const orderId = await completeCartAsOrder({ phone: phone.trim() || undefined });
          if (orderId) {
            void savePhoneToProfile(phone.trim());
            router.push(`/order-confirmation?order_id=${encodeURIComponent(orderId)}`);
            return;
          }
        } catch {
          // Fallback until MP checkout integration is configured.
        } finally {
          setIsSubmitting(false);
        }
        window.location.href = "https://www.mercadopago.com.ar/";
        return;
      }

      const paymentOk = validatePayment();
      if (!paymentOk) return;

      if (!cartId) return;
      setIsSubmitting(true);
      try {
        const orderId = await completeCartAsOrder({ phone: phone.trim() || undefined });
        if (orderId) {
          void savePhoneToProfile(phone.trim());
          router.push(`/order-confirmation?order_id=${encodeURIComponent(orderId)}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Checkout submission failed", error);
      setDiscountError(language === "ko" ? "처리 중 오류가 발생했습니다" : "Ocurrió un error al procesar el pedido");
      setIsSubmitting(false);
    }
  }, [
    allowGuestCheckout, cartId, cartLines, checkedCustomerAuth, completeCartAsOrder,
    discountAmount, email, isCustomerAuthenticated, isSubmitting, isWhatsAppPaymentMethod,
    language, paymentMethod, phone, resolvePaymentLabel, router, savePhoneToProfile,
    selectedShippingMethod, shipping, shippingAmount, shippingMethods, subtotal, t, total,
    validateEmail, validatePayment, validatePhone, validateShippingField,
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
    loadingShippingMethods,
    shippingMethods,
    selectedShippingMethod, setSelectedShippingMethod,
    allShippingRequiredComplete,
    onShippingBlur,
    // discount
    discountCode, setDiscountCode,
    discountError, setDiscountError,
    discountAmount,
    applyDiscount,
    // payment
    paymentMethod, setPaymentMethod,
    payment, setPayment,
    paymentErrors,
    // order flow
    isSubmitting,
    isCustomerAuthenticated,
    showCheckoutChoice, setShowCheckoutChoice,
    submitOrder,
    // derived
    cartLines,
    shippingAmount,
    total,
    subtotal,
    isWhatsAppPaymentMethod,
    // UI
    summaryOpenMobile, setSummaryOpenMobile,
  };
}
