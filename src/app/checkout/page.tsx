"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArs, getProductById, getProductName, translateLabel } from "@/lib/shop-data";

type CheckoutErrors = Record<string, string>;

type ShippingMethod = {
  id: string;
  label: string;
  amount: number;
  eta: string;
};

const requiredShippingFields = ["firstName", "lastName", "address", "postalCode", "city", "province"] as const;

export default function CheckoutPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { items, subtotal } = useCart();

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
        emptyCartTitle: "장바구니가 비어 있습니다",
        emptyCartDesc: "결제를 시작하려면 상품을 추가하세요.",
        backHome: "홈으로",
        checkout: "결제로 이동",
        continueUnits: "개",
        noStockVariant: "단일 옵션",
      }
    : {
        requiredField: "Campo obligatorio",
        invalidPostal: "Codigo postal invalido",
        invalidEmail: "Email invalido",
        enterEmail: "Ingresa tu email",
        invalidCard: "Numero de tarjeta invalido",
        expiryFormat: "Formato MM/AA",
        invalidCvc: "Codigo invalido",
        selectInstallments: "Selecciona cuotas",
        requiredAddress: "Direccion requerida",
        requiredCity: "Ciudad requerida",
        enterCode: "Ingresa un codigo",
        invalidCode: "Codigo invalido",
        step1: "Step 1 - Contact",
        step2: "Step 2 - Shipping address",
        step3: "Step 3 - Shipping method",
        step4: "Step 4 - Payment",
        email: "Email",
        emailPlaceholder: "mail@tienda.com",
        loginHint: "Ya existe una cuenta con este email.",
        loginAction: "Iniciar sesion",
        firstName: "Nombre",
        lastName: "Apellidos",
        address: "Direccion",
        postalCode: "Codigo postal",
        city: "Ciudad",
        province: "Provincia",
        saveInfo: "Guardar mi informacion",
        completeAddress: "Completa direccion para calcular envios.",
        card: "Tarjeta de credito",
        mp: "Mercado Pago",
        cardHolder: "Titular",
        cardNumber: "Numero de tarjeta",
        expiry: "Fecha de vencimiento",
        cvc: "Codigo de seguridad",
        installments: "Cuotas",
        loadingInstallments: "Cargando cuotas...",
        installmentsHint: "Las cuotas aparecen luego de detectar BIN.",
        sameBilling: "Use shipping address as billing",
        billingAddress: "Direccion de facturacion",
        summary: "Resumen del pedido",
        summaryMobile: "Resumen del pedido",
        variant: "Variante unica",
        discountCode: "Codigo de descuento",
        apply: "Aplicar",
        subtotal: "Subtotal",
        shipping: "Envio",
        discount: "Descuento",
        total: "Total",
        payNow: "Pagar ahora",
        emptyCartTitle: "Tu carrito esta vacio",
        emptyCartDesc: "Agrega productos para iniciar checkout.",
        backHome: "Volver al home",
        checkout: "Ir al checkout",
        continueUnits: "unidades",
        noStockVariant: "Variante unica",
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

  const [paymentMethod, setPaymentMethod] = useState<"card" | "mp">("card");
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

  const cartLines = useMemo(
    () =>
      items
        .map((line) => {
          const product = getProductById(line.productId);
          if (!product) return null;
          const variant = product.variants?.find((item) => item.id === line.variantId);
          return {
            ...line,
            product,
            variant,
            lineTotal: product.price * line.quantity,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items],
  );

  const shippingAmount = useMemo(() => {
    const method = shippingMethods.find((item) => item.id === selectedShippingMethod);
    return method?.amount ?? 0;
  }, [selectedShippingMethod, shippingMethods]);

  const total = subtotal + shippingAmount - discountAmount;

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

    setLoadingShippingMethods(true);
    setShippingMethods([]);

    window.setTimeout(() => {
      const province = shipping.province.toLowerCase();
      const methods: ShippingMethod[] = province.includes("buenos")
        ? [
            { id: "normal", label: language === "ko" ? "일반 배송" : "Envio estandar", amount: 3900, eta: "48/72h" },
            { id: "express", label: language === "ko" ? "익스프레스 배송" : "Envio express", amount: 7200, eta: "24h" },
          ]
        : [
            { id: "normal", label: language === "ko" ? "전국 택배" : "Correo nacional", amount: 5600, eta: language === "ko" ? "3-5일" : "3 a 5 dias" },
            { id: "pickup", label: language === "ko" ? "운영사 픽업" : "Retiro por operador", amount: 2900, eta: language === "ko" ? "2-4일" : "2 a 4 dias" },
          ];
      setShippingMethods(methods);
      setSelectedShippingMethod(methods[0]?.id ?? "");
      setLoadingShippingMethods(false);
    }, 1200);
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

  const applyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountAmount(0);
      setDiscountError(t.enterCode);
      return;
    }
    if (code === "AURELIA10") {
      const value = Math.round(subtotal * 0.1);
      setDiscountAmount(value);
      setDiscountError("");
      return;
    }
    setDiscountAmount(0);
    setDiscountError(t.invalidCode);
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

  const submitOrder = () => {
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

    if (!selectedShippingMethod) return;

    if (paymentMethod === "mp") {
      window.location.href = "https://www.mercadopago.com.ar/";
      return;
    }

    const paymentOk = validatePayment();
    if (!paymentOk) return;

    router.push("/order-confirmation");
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
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.step1}</p>
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
                {t.loginHint} <button className="underline">{t.loginAction}</button>
              </p>
            )}
          </Card>

          <Card className={`p-5 ${contactComplete ? "" : "opacity-60"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.step2}</p>
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
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.step3}</p>
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

          <Card className={`space-y-4 p-5 ${selectedShippingMethod ? "" : "opacity-60"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.step4}</p>
            <div className="grid gap-2">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  paymentMethod === "card" ? "border-[#111111] bg-[#111111] text-white" : "border-black/15"
                }`}
              >
                {t.card}
              </button>
              <button
                onClick={() => setPaymentMethod("mp")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  paymentMethod === "mp" ? "border-[#111111] bg-[#111111] text-white" : "border-black/15"
                }`}
              >
                {t.mp}
              </button>
            </div>

            {paymentMethod === "card" && (
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
            )}
          </Card>
        </section>

        <aside className="space-y-4 md:sticky md:top-24 md:h-fit">
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
                <div key={line.key} className="flex gap-2 rounded-2xl border border-black/10 p-2">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                    <Image src={line.product.image} alt={getProductName(line.product, language)} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#111111]">{getProductName(line.product, language)}</p>
                    <p className="text-xs text-[#666666]">
                      {line.variant ? translateLabel(line.variant.label, language) : t.noStockVariant} · x{line.quantity}
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
        <Button className="w-full" onClick={submitOrder}>
          {t.payNow}
        </Button>
      </div>

      <div className="hidden md:fixed md:bottom-5 md:right-5 md:block">
        <Button size="lg" onClick={submitOrder}>
          {t.payNow}
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
