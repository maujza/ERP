"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArs } from "@/lib/shop-data";
import { sdk } from "@/lib/medusa";

type CheckoutErrors = Record<string, string>;

type ShippingMethod = {
  id: string;
  label: string;
  amount: number;
  eta: string;
};

const requiredShippingFields = ["firstName", "lastName", "address", "postalCode", "city", "province"] as const;
const fallbackShippingMethodIds = new Set(["standard", "express"]);

export default function CheckoutPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { cartId, items, subtotal, clearCart } = useCart();

  const t = language === "ko"
    ? {
        requiredField: "필수 입력 항목",
        invalidPostal: "우편번호 형식이 올바르지 않습니다",
        invalidEmail: "이메일 형식이 올바르지 않습니다",
        enterEmail: "이메일을 입력하세요",
        invalidCard: "카드 번호가 올바르지 않습니다",
        expiryFormat: "형식 MM/AA",
        invalidCvc: "보안코드가 올바르지 않습니다",
        selectInstallments: "할부를 선택하세요",
        requiredAddress: "주소가 필요합니다",
        requiredCity: "도시를 입력하세요",
        enterCode: "코드를 입력하세요",
        invalidCode: "유효하지 않은 코드",
        step1: "1단계 - 연락처",
        step2: "2단계 - 배송지",
        step3: "3단계 - 배송 방식",
        step4: "4단계 - 결제",
        email: "이메일",
        emailPlaceholder: "mail@store.com",
        loginHint: "이미 계정이 있습니다.",
        loginAction: "로그인",
        firstName: "이름",
        lastName: "성",
        address: "주소",
        postalCode: "우편번호",
        city: "도시",
        province: "주",
        saveInfo: "내 정보 저장",
        completeAddress: "배송 계산을 위해 주소를 완료하세요.",
        card: "신용카드",
        mp: "메르카도파고",
        cardHolder: "카드 소유자",
        cardNumber: "카드 번호",
        expiry: "유효기간",
        cvc: "보안코드",
        installments: "할부",
        loadingInstallments: "할부 불러오는 중...",
        installmentsHint: "BIN 감지 후 할부 옵션이 표시됩니다.",
        sameBilling: "배송지 주소를 청구지로 사용",
        billingAddress: "청구지 주소",
        summary: "주문 요약",
        summaryMobile: "주문 요약",
        variant: "옵션 없음",
        discountCode: "할인 코드",
        apply: "적용",
        subtotal: "소계",
        shipping: "배송",
        discount: "할인",
        total: "총합",
        payNow: "지금 결제",
        wpp: "WhatsApp으로 주문",
        wppSend: "WhatsApp으로 보내기",
        paymentTitle: "결제 방법 선택",
        emptyCartTitle: "장바구니가 비어 있습니다",
        emptyCartDesc: "결제를 시작하려면 상품을 추가하세요.",
        backHome: "홈으로",
        checkout: "결제로 이동",
        continueUnits: "개",
        noStockVariant: "단일 옵션",
        checkoutChoiceTitle: "주문을 어떻게 진행할까요?",
        checkoutChoiceBody: "계정으로 계속하거나 비회원으로 바로 결제할 수 있습니다.",
        checkoutChoiceGuest: "비회원으로 계속",
        checkoutChoiceLogin: "계정으로 계속",
        checkoutChoiceCancel: "닫기",
      }
    : {
        requiredField: "Campo obligatorio",
        invalidPostal: "Código postal inválido",
        invalidEmail: "Email inválido",
        enterEmail: "Ingresa tu email",
        invalidCard: "Número de tarjeta inválido",
        expiryFormat: "Formato MM/AA",
        invalidCvc: "Código inválido",
        selectInstallments: "Seleccioná las cuotas",
        requiredAddress: "Dirección requerida",
        requiredCity: "Ciudad requerida",
        enterCode: "Ingresá un código",
        invalidCode: "Código inválido",
        step1: "Paso 1 - Contacto",
        step2: "Paso 2 - Dirección de envío",
        step3: "Paso 3 - Método de envío",
        step4: "Paso 4 - Pago",
        email: "Email",
        emailPlaceholder: "mail@tienda.com",
        loginHint: "Ya existe una cuenta con este email.",
        loginAction: "Iniciar sesión",
        firstName: "Nombre",
        lastName: "Apellidos",
        address: "Dirección",
        postalCode: "Código postal",
        city: "Ciudad",
        province: "Provincia",
        saveInfo: "Guardar mi información",
        completeAddress: "Completá la dirección para calcular envíos.",
        card: "Tarjeta de crédito",
        mp: "Mercado Pago",
        cardHolder: "Titular",
        cardNumber: "Número de tarjeta",
        expiry: "Fecha de vencimiento",
        cvc: "Código de seguridad",
        installments: "Cuotas",
        loadingInstallments: "Cargando cuotas...",
        installmentsHint: "Las cuotas aparecen luego de detectar el BIN.",
        sameBilling: "Usar dirección de envío como facturación",
        billingAddress: "Dirección de facturación",
        summary: "Resumen del pedido",
        summaryMobile: "Resumen del pedido",
        variant: "Variante única",
        discountCode: "Código de descuento",
        apply: "Aplicar",
        subtotal: "Subtotal",
        shipping: "Envío",
        discount: "Descuento",
        total: "Total",
        payNow: "Pagar ahora",
        wpp: "Pedir por WhatsApp",
        wppSend: "Enviar pedido por WhatsApp",
        paymentTitle: "¿Cómo querés pagar?",
        emptyCartTitle: "Tu carrito está vacío",
        emptyCartDesc: "Agregá productos para iniciar la finalización de compra.",
        backHome: "Volver al inicio",
        checkout: "Finalizar compra",
        continueUnits: "unidades",
        noStockVariant: "Variante única",
        checkoutChoiceTitle: "¿Cómo querés finalizar?",
        checkoutChoiceBody: "Podés continuar con tu cuenta o terminar como invitado.",
        checkoutChoiceGuest: "Continuar sin cuenta",
        checkoutChoiceLogin: "Entrar con mi cuenta",
        checkoutChoiceCancel: "Cancelar",
      };

  const [summaryOpenMobile, setSummaryOpenMobile] = useState(false);
  const [email, setEmail] = useState("");
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [contactComplete, setContactComplete] = useState(false);

  const [shipping, setShipping] = useState({
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

  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "mp" | "wpp">("card");
  const [payment, setPayment] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    installments: "",
    useShippingAsBilling: true,
    billingAddress: "",
    billingCity: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<CheckoutErrors>({});
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [installments, setInstallments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const [checkedCustomerAuth, setCheckedCustomerAuth] = useState(false);
  const [showCheckoutChoice, setShowCheckoutChoice] = useState(false);
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(false);
  const [hasPromptedCheckoutChoice, setHasPromptedCheckoutChoice] = useState(false);

  const checkCustomerAuth = async (syncState = true) => {
    try {
      await sdk.store.customer.retrieve();
      if (syncState) {
        setIsCustomerAuthenticated(true);
        setCheckedCustomerAuth(true);
      }
      return true;
    } catch {
      if (syncState) {
        setIsCustomerAuthenticated(false);
        setCheckedCustomerAuth(true);
      }
      return false;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("guest") === "1") {
      setAllowGuestCheckout(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void checkCustomerAuth(false).then((isAuthenticated) => {
      if (!mounted) return;
      setIsCustomerAuthenticated(isAuthenticated);
      setCheckedCustomerAuth(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const cartLines = useMemo(
    () => items.map((line) => ({
      ...line,
      lineTotal: line.unitPrice * line.quantity,
    })),
    [items],
  );

  useEffect(() => {
    if (hasPromptedCheckoutChoice) return;
    if (!checkedCustomerAuth) return;
    if (isCustomerAuthenticated) return;
    if (allowGuestCheckout) return;
    if (cartLines.length === 0) return;
    setShowCheckoutChoice(true);
    setHasPromptedCheckoutChoice(true);
  }, [
    allowGuestCheckout,
    cartLines.length,
    checkedCustomerAuth,
    hasPromptedCheckoutChoice,
    isCustomerAuthenticated,
  ]);

  const shippingAmount = useMemo(() => {
    const method = shippingMethods.find((item) => item.id === selectedShippingMethod);
    return method?.amount ?? 0;
  }, [selectedShippingMethod, shippingMethods]);

  const total = subtotal + shippingAmount - discountAmount;

  const resolveRealShippingOptionId = async () => {
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
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return t.enterEmail;
    if (!/^\S+@\S+\.\S+$/.test(value)) return t.invalidEmail;
    return "";
  };

  const validateShippingField = (key: string, value: string) => {
    if (!value.trim()) return t.requiredField;
    if (key === "postalCode" && value.trim().length < 4) return t.invalidPostal;
    return "";
  };

  const allShippingRequiredComplete = requiredShippingFields.every((key) =>
    shipping[key].trim(),
  );

  const maybeLoadShippingMethods = () => {
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

    // Update shipping address on the cart first
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
    }).catch(() => {
      // Fallback to hardcoded methods if Medusa shipping not configured
      const methods: ShippingMethod[] = [
        { id: "standard", label: language === "ko" ? "일반 배송" : "Envio estandar", amount: 3900, eta: "48/72h" },
        { id: "express", label: language === "ko" ? "익스프레스 배송" : "Envio express", amount: 7200, eta: "24h" },
      ];
      setShippingMethods(methods);
      setSelectedShippingMethod(methods[0]?.id ?? "");
    }).finally(() => {
      setLoadingShippingMethods(false);
    });
  };

  const onEmailBlur = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setContactComplete(false);
      return;
    }
    setContactComplete(true);
    const accountExists = email.toLowerCase().includes("gmail") || email.toLowerCase().includes("empresa");
    setShowLoginHint(accountExists);
  };

  const onShippingBlur = (field: string) => {
    const error = validateShippingField(field, shipping[field as keyof typeof shipping] as string);
    setShippingErrors((prev) => ({ ...prev, [field]: error }));
    maybeLoadShippingMethods();
  };

  const onCardNumberBlur = () => {
    const digits = payment.cardNumber.replace(/\D/g, "");
    if (digits.length < 16) {
      setPaymentErrors((prev) => ({ ...prev, cardNumber: t.invalidCard }));
      return;
    }

    setPaymentErrors((prev) => ({ ...prev, cardNumber: "" }));

    if (digits.length >= 6) {
      setLoadingInstallments(true);
      setInstallments([]);
      window.setTimeout(() => {
        const bin = Number(digits.slice(0, 1));
        const options = bin % 2 === 0
          ? (language === "ko" ? ["1회", "3회 무이자", "6회"] : ["1 cuota", "3 cuotas sin interes", "6 cuotas"])
          : (language === "ko" ? ["1회", "3회", "12회"] : ["1 cuota", "3 cuotas", "12 cuotas"]);
        setInstallments(options);
        setPayment((prev) => ({ ...prev, installments: options[0] ?? "" }));
        setLoadingInstallments(false);
      }, 1000);
    }
  };

  const applyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountAmount(0);
      setDiscountError(t.enterCode);
      return;
    }
    if (!cartId) {
      setDiscountError(t.invalidCode);
      return;
    }
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
      // Some configured promotions may not change discount_total immediately (e.g. shipping-related rules).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promoApplied = ((updatedCart as any).promotions ?? []).some(
        (promo: { code?: string }) => promo.code?.toUpperCase() === code,
      );
      if (discount > 0 || promoApplied) {
        setDiscountAmount(discount);
        setDiscountError("");
      } else {
        // Code accepted but produced no discount — remove it and show error
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
  };

  const validatePayment = () => {
    const nextErrors: CheckoutErrors = {};

    if (paymentMethod === "card") {
      if (!payment.cardName.trim()) nextErrors.cardName = t.requiredField;
      if (payment.cardNumber.replace(/\D/g, "").length < 16)
        nextErrors.cardNumber = t.invalidCard;
      if (!/^[0-9]{2}\/[0-9]{2}$/.test(payment.expiry)) nextErrors.expiry = t.expiryFormat;
      if (!/^[0-9]{3,4}$/.test(payment.cvc)) nextErrors.cvc = t.invalidCvc;
      if (installments.length > 0 && !payment.installments) nextErrors.installments = t.selectInstallments;
      if (!payment.useShippingAsBilling) {
        if (!payment.billingAddress.trim()) nextErrors.billingAddress = t.requiredAddress;
        if (!payment.billingCity.trim()) nextErrors.billingCity = t.requiredCity;
      }
    }

    setPaymentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeCartAsOrder = async () => {
    if (!cartId) return "";

    await sdk.store.cart.update(cartId, {
      email,
      ...(shipping.address
        ? {
            shipping_address: {
              first_name: shipping.firstName || "Cliente",
              last_name: shipping.lastName || "Store",
              address_1: shipping.address,
              postal_code: shipping.postalCode || "1000",
              city: shipping.city || "Buenos Aires",
              country_code: "ar",
            },
          }
        : {}),
    });

    const realOptionId = await resolveRealShippingOptionId();
    if (realOptionId) {
      await sdk.store.cart.addShippingMethod(cartId, { option_id: realOptionId }).catch(() => {});
    }

    const { cart: cartObj } = await sdk.store.cart.retrieve(cartId);
    await sdk.store.payment.initiatePaymentSession(cartObj, { provider_id: "pp_system_default" }).catch(() => {});
    const result = await sdk.store.cart.complete(cartId).catch(() => ({ type: "error" as const }));
    if ((result as { type: string }).type === "order") {
      const orderId = (result as { order?: { id: string } }).order?.id ?? "";
      clearCart();
      return orderId;
    }
    return "";
  };

  const submitOrder = async (forceGuest = false) => {
    if (isSubmitting) return;
    const isAuthenticated = checkedCustomerAuth ? isCustomerAuthenticated : await checkCustomerAuth(true);
    if (!isAuthenticated && !(allowGuestCheckout || forceGuest)) {
      setShowCheckoutChoice(true);
      return;
    }
    if (forceGuest && !allowGuestCheckout) {
      setAllowGuestCheckout(true);
    }

    try {
      // WhatsApp path: create a Medusa order then open WhatsApp
      if (paymentMethod === "wpp") {
        const emailError = validateEmail(email);
        if (emailError) {
          setContactComplete(false);
          return;
        }

        let orderId = "";
        if (cartId) {
          setIsSubmitting(true);
          try {
            orderId = await completeCartAsOrder();
          } catch {
            // Keep WhatsApp fallback even when order creation fails.
          } finally {
            setIsSubmitting(false);
          }
        }

        const lines = cartLines
          .map((line) => `• ${line.title} x${line.quantity} - ${formatArs(line.lineTotal, language)}`)
          .join("\n");
        const shippingMethod = shippingMethods.find((m) => m.id === selectedShippingMethod);
        const addressParts = [shipping.address, shipping.city, shipping.province, shipping.postalCode]
          .filter(Boolean)
          .join(", ");
        const msg = [
          language === "ko" ? "안녕하세요! WhatsApp으로 주문을 완료하고 싶습니다:" : "Hola! Quiero finalizar mi pedido:",
          "",
          lines,
          "",
          `${t.subtotal}: ${formatArs(subtotal, language)}`,
          shippingMethod
            ? `${t.shipping}: ${formatArs(shippingAmount, language)} (${shippingMethod.label})`
            : null,
          discountAmount > 0 ? `${t.discount}: -${formatArs(discountAmount, language)}` : null,
          `${t.total}: ${formatArs(total, language)}`,
          "",
          shipping.firstName.trim()
            ? `${t.firstName}: ${shipping.firstName} ${shipping.lastName}`
            : null,
          addressParts ? `${t.address}: ${addressParts}` : null,
          `${t.email}: ${email}`,
          orderId ? `N° pedido: ${orderId}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        // Replace this number with the store's WhatsApp number (country code + number, no spaces or +)
        const WPP_NUMBER = "5491100000000";
        window.open(`https://wa.me/${WPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
        return;
      }

      // Card / Mercado Pago path: full validation
      const emailError = validateEmail(email);
      if (emailError) {
        setContactComplete(false);
        return;
      }

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
          const orderId = await completeCartAsOrder();
          if (orderId) {
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
        const orderId = await completeCartAsOrder();
        if (orderId) {
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
  };

  if (cartLines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-4 py-8">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-semibold text-[#111111]">{t.emptyCartTitle}</h1>
          <p className="mt-2 text-sm text-[#555555]">{t.emptyCartDesc}</p>
          <Button asChild className="mt-5">
            <Link href="/">{t.backHome}</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <div className="bg-[#f4f4f4] pb-28 md:pb-10">
      <main className="mx-auto grid w-full max-w-[1300px] gap-5 px-4 py-6 md:grid-cols-[1fr_360px] md:px-6 md:py-8">
        <section className="space-y-4">
          {/* Payment method selector — at top so user chooses their path first */}
          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#111111]">{t.paymentTitle}</p>
            <div className="grid gap-2">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                  paymentMethod === "card" ? "border-[#111111] bg-[#111111] text-white" : "border-black/15 bg-white"
                }`}
              >
                {t.card}
              </button>
              <button
                onClick={() => setPaymentMethod("mp")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                  paymentMethod === "mp" ? "border-[#111111] bg-[#111111] text-white" : "border-black/15 bg-white"
                }`}
              >
                {t.mp}
              </button>
              <button
                onClick={() => setPaymentMethod("wpp")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                  paymentMethod === "wpp" ? "border-[#25d366] bg-[#25d366] text-white" : "border-black/15 bg-white"
                }`}
              >
                {t.wpp}
              </button>
            </div>
            {paymentMethod === "wpp" && (
              <p className="rounded-2xl bg-[#f0faf4] p-3 text-sm text-[#1a7a3a]">
                {language === "ko"
                  ? "주문 정보가 WhatsApp 메시지로 전송됩니다. 이메일만 입력하면 바로 보낼 수 있습니다."
                  : "Completa solo tu email y te enviamos el resumen. Un asesor coordina el pago por WhatsApp."}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#3f3f3f]">{t.step1}</p>
            <label className="mt-3 block text-sm font-medium text-[#111111]">{t.email}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={onEmailBlur}
              className="mt-1 w-full rounded-2xl border border-black/15 px-3 py-2 text-sm outline-none"
              placeholder={t.emailPlaceholder}
            />
            {showLoginHint && (
            <p className="mt-2 text-xs text-[#666666]">
                {t.loginHint}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => router.push("/auth?next=/checkout")}
                >
                  {t.loginAction}
                </button>
              </p>
            )}
          </Card>

          <Card className={`p-5 ${contactComplete ? "" : "opacity-60"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#3f3f3f]">{t.step2}</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Field
                label={t.firstName}
                value={shipping.firstName}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, firstName: value }))}
                onBlur={() => onShippingBlur("firstName")}
                error={shippingErrors.firstName}
              />
              <Field
                label={t.lastName}
                value={shipping.lastName}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, lastName: value }))}
                onBlur={() => onShippingBlur("lastName")}
                error={shippingErrors.lastName}
              />
              <Field
                label={t.address}
                value={shipping.address}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, address: value }))}
                onBlur={() => onShippingBlur("address")}
                error={shippingErrors.address}
              />
              <Field
                label={t.postalCode}
                value={shipping.postalCode}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, postalCode: value }))}
                onBlur={() => onShippingBlur("postalCode")}
                error={shippingErrors.postalCode}
              />
              <Field
                label={t.city}
                value={shipping.city}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, city: value }))}
                onBlur={() => onShippingBlur("city")}
                error={shippingErrors.city}
              />
              <Field
                label={t.province}
                value={shipping.province}
                disabled={!contactComplete}
                onChange={(value) => setShipping((prev) => ({ ...prev, province: value }))}
                onBlur={() => onShippingBlur("province")}
                error={shippingErrors.province}
              />
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#444444]">
              <input
                type="checkbox"
                checked={shipping.saveInfo}
                onChange={(e) => setShipping((prev) => ({ ...prev, saveInfo: e.target.checked }))}
                disabled={!contactComplete}
              />
              {t.saveInfo}
            </label>
          </Card>

          <Card className={`p-5 ${allShippingRequiredComplete ? "" : "opacity-60"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#3f3f3f]">{t.step3}</p>
            <div className="mt-3 space-y-2">
              {loadingShippingMethods && (
                <div className="space-y-2">
                  <div className="h-12 animate-pulse rounded-2xl bg-[#ececec]" />
                  <div className="h-12 animate-pulse rounded-2xl bg-[#ececec]" />
                </div>
              )}
              {!loadingShippingMethods && shippingMethods.length === 0 && (
                <p className="text-sm text-[#666666]">{t.completeAddress}</p>
              )}
              {!loadingShippingMethods &&
                shippingMethods.map((method) => (
                  <button
                    key={method.id}
                    disabled={!allShippingRequiredComplete}
                    onClick={() => setSelectedShippingMethod(method.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                      selectedShippingMethod === method.id
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-black/15 bg-white text-[#111111]"
                    }`}
                  >
                    <span>
                      {method.label} · {method.eta}
                    </span>
                    <span>{formatArs(method.amount, language)}</span>
                  </button>
                ))}
            </div>
          </Card>

          {paymentMethod === "card" && (
            <Card className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#3f3f3f]">{t.step4}</p>
              <div className="space-y-3">
                <Field
                  label={t.cardHolder}
                  value={payment.cardName}
                  onChange={(value) => setPayment((prev) => ({ ...prev, cardName: value }))}
                  onBlur={() =>
                    setPaymentErrors((prev) => ({
                      ...prev,
                      cardName: payment.cardName.trim() ? "" : t.requiredField,
                    }))
                  }
                  error={paymentErrors.cardName}
                />
                <Field
                  label={t.cardNumber}
                  value={payment.cardNumber}
                  onChange={(value) => setPayment((prev) => ({ ...prev, cardNumber: value }))}
                  onBlur={onCardNumberBlur}
                  error={paymentErrors.cardNumber}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label={t.expiry}
                    value={payment.expiry}
                    onChange={(value) => setPayment((prev) => ({ ...prev, expiry: value }))}
                    onBlur={() =>
                      setPaymentErrors((prev) => ({
                        ...prev,
                        expiry: /^[0-9]{2}\/[0-9]{2}$/.test(payment.expiry) ? "" : t.expiryFormat,
                      }))
                    }
                    error={paymentErrors.expiry}
                  />
                  <Field
                    label={t.cvc}
                    value={payment.cvc}
                    onChange={(value) => setPayment((prev) => ({ ...prev, cvc: value }))}
                    onBlur={() =>
                      setPaymentErrors((prev) => ({
                        ...prev,
                        cvc: /^[0-9]{3,4}$/.test(payment.cvc) ? "" : t.invalidCvc,
                      }))
                    }
                    error={paymentErrors.cvc}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#111111]">{t.installments}</label>
                  {loadingInstallments ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-black/15 px-3 py-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.loadingInstallments}
                    </div>
                  ) : installments.length > 0 ? (
                    <select
                      value={payment.installments}
                      onChange={(e) => setPayment((prev) => ({ ...prev, installments: e.target.value }))}
                      className="w-full rounded-2xl border border-black/15 px-3 py-2 text-sm"
                    >
                      {installments.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-[#666666]">{t.installmentsHint}</p>
                  )}
                  {paymentErrors.installments && (
                    <p className="text-xs text-[#b00020]">{paymentErrors.installments}</p>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-[#444444]">
                  <input
                    type="checkbox"
                    checked={payment.useShippingAsBilling}
                    onChange={(e) =>
                      setPayment((prev) => ({ ...prev, useShippingAsBilling: e.target.checked }))
                    }
                  />
                  {t.sameBilling}
                </label>

                {!payment.useShippingAsBilling && (
                  <div className="space-y-3 rounded-2xl border border-black/10 p-3">
                    <Field
                      label={t.billingAddress}
                      value={payment.billingAddress}
                      onChange={(value) => setPayment((prev) => ({ ...prev, billingAddress: value }))}
                      onBlur={() =>
                        setPaymentErrors((prev) => ({
                          ...prev,
                          billingAddress: payment.billingAddress.trim() ? "" : t.requiredAddress,
                        }))
                      }
                      error={paymentErrors.billingAddress}
                    />
                    <Field
                      label={t.city}
                      value={payment.billingCity}
                      onChange={(value) => setPayment((prev) => ({ ...prev, billingCity: value }))}
                      onBlur={() =>
                        setPaymentErrors((prev) => ({
                          ...prev,
                          billingCity: payment.billingCity.trim() ? "" : t.requiredCity,
                        }))
                      }
                      error={paymentErrors.billingCity}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>

        <aside className="order-first space-y-4 md:order-last md:sticky md:top-24 md:h-fit">
          <button
            onClick={() => setSummaryOpenMobile((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left md:hidden"
          >
            <span className="text-sm font-semibold text-[#111111]">{t.summaryMobile} · {formatArs(total, language)}</span>
            <ChevronDown className={`h-4 w-4 transition ${summaryOpenMobile ? "rotate-180" : "rotate-0"}`} />
          </button>

          <Card className={`${summaryOpenMobile ? "block" : "hidden"} p-4 md:block md:p-5`}>
            <h2 className="text-lg font-semibold text-[#111111]">{t.summary}</h2>
            <div className="mt-4 space-y-3">
              {cartLines.map((line) => (
                <div key={line.id} className="flex gap-2 rounded-2xl border border-black/10 p-2">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-[#f3f3f3]">
                    {line.thumbnail && (
                      <SafeImage src={line.thumbnail} alt={line.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#111111]">{line.title}</p>
                    <p className="text-xs text-[#666666]">
                      {line.variantTitle || t.noStockVariant} · x{line.quantity}
                    </p>
                    <p className="text-sm font-semibold text-[#111111]">{formatArs(line.lineTotal, language)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-[#111111]">{t.discountCode}</label>
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="h-10 flex-1 rounded-2xl border border-black/15 px-3 text-sm"
                  placeholder="AURELIA10"
                />
                <Button variant="outline" onClick={applyDiscount}>
                  {t.apply}
                </Button>
              </div>
              {discountError && <p className="text-xs text-[#b00020]">{discountError}</p>}
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-[#f3f3f3] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{t.subtotal}</span>
                <span>{formatArs(subtotal, language)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.shipping}</span>
                <span>{formatArs(shippingAmount, language)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.discount}</span>
                <span>-{formatArs(discountAmount, language)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 pt-2 font-semibold text-[#111111]">
                <span>{t.total}</span>
                <span>{formatArs(total, language)}</span>
              </div>
            </div>
          </Card>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-45 border-t border-black/10 bg-white p-3 md:hidden">
        <Button
          disabled={isSubmitting}
          className={`w-full ${paymentMethod === "wpp" ? "bg-[#25d366] hover:bg-[#1fb558]" : ""}`}
          onClick={() => {
            void submitOrder();
          }}
        >
          {paymentMethod === "wpp" ? t.wppSend : t.payNow}
        </Button>
      </div>

      {showCheckoutChoice && (
        <>
          <div className="fixed inset-0 z-[95] bg-black/50" onClick={() => setShowCheckoutChoice(false)} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-black">{t.checkoutChoiceTitle}</h3>
              <p className="mt-2 text-sm text-slate-600">{t.checkoutChoiceBody}</p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutChoice(false);
                    void submitOrder(true);
                  }}
                  className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-black"
                >
                  {t.checkoutChoiceGuest}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/auth?next=/checkout")}
                  className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold !text-white hover:bg-black/90"
                >
                  {t.checkoutChoiceLogin}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckoutChoice(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600"
                >
                  {t.checkoutChoiceCancel}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="hidden md:fixed md:bottom-5 md:right-5 md:block">
        <Button
          size="lg"
          disabled={isSubmitting}
          className={paymentMethod === "wpp" ? "bg-[#25d366] hover:bg-[#1fb558]" : ""}
          onClick={() => {
            void submitOrder();
          }}
        >
          {paymentMethod === "wpp" ? t.wppSend : t.payNow}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-[#111111]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className="w-full rounded-2xl border border-black/15 px-3 py-2 text-sm outline-none disabled:bg-[#f0f0f0]"
      />
      {error && <p className="text-xs text-[#b00020]">{error}</p>}
    </div>
  );
}
