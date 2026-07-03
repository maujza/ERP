"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Home, Package2, ShoppingBag, XCircle } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { sdk } from "@/lib/medusa";

type AccountState = "loading" | "ready" | "unauthenticated" | "error";

type OrderSummary = {
  id: string;
  display_id?: number;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  total?: number;
  currency_code?: string;
  created_at?: string;
  discount_total?: number;
  promotions?: { code?: string }[];
};

type TrackingStep = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
};

const DEFAULT_PROMO_CODES = ["AURORA10"];

function normalizeStatus(value?: string) {
  return String(value || "").toLowerCase().replaceAll("_", " ").trim();
}

function statusBadgeClasses(type: "order" | "payment" | "fulfillment", value?: string) {
  const status = normalizeStatus(value);
  if (type === "payment") {
    if (status.includes("captured") || status.includes("paid")) return "bg-emerald-100 text-emerald-700";
    if (status.includes("authorized")) return "bg-blue-100 text-blue-700";
    if (status.includes("awaiting") || status.includes("pending")) return "bg-amber-100 text-amber-700";
    if (status.includes("canceled") || status.includes("cancelled") || status.includes("failed")) {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-[#e8daf2] text-[#4a4068]";
  }
  if (type === "fulfillment") {
    if (status.includes("delivered")) return "bg-emerald-100 text-emerald-700";
    if (status.includes("shipped")) return "bg-sky-100 text-sky-700";
    if (status.includes("fulfilled")) return "bg-blue-100 text-blue-700";
    if (status.includes("not fulfilled") || status.includes("pending")) return "bg-amber-100 text-amber-700";
    if (status.includes("canceled") || status.includes("cancelled")) return "bg-rose-100 text-rose-700";
    return "bg-[#e8daf2] text-[#4a4068]";
  }
  if (status.includes("completed")) return "bg-emerald-100 text-emerald-700";
  if (status.includes("pending")) return "bg-amber-100 text-amber-700";
  if (status.includes("canceled") || status.includes("cancelled")) return "bg-rose-100 text-rose-700";
  return "bg-[#e8daf2] text-[#4a4068]";
}

type AccountLang = {
  noData: string;
  order: { pending: string; completed: string; canceled: string };
  payment: { captured: string; authorized: string; awaiting: string; pending: string };
  fulfillment: { notFulfilled: string; partiallyShipped: string; shipped: string; delivered: string };
  tracking: {
    orderConfirmed: string;
    orderCanceled: string;
    paymentValidated: string;
    validatingPayment: string;
    preparingShipping: string;
    pendingDispatch: string;
    delivered: string;
    deliveryPending: string;
  };
};

const accountLangEs: AccountLang = {
  noData: "Sin datos",
  order: { pending: "Pendiente", completed: "Completado", canceled: "Cancelado" },
  payment: { captured: "Cobrado", authorized: "Autorizado", awaiting: "Esperando pago", pending: "Pendiente" },
  fulfillment: { notFulfilled: "Aun no despachado", partiallyShipped: "Parcialmente enviado", shipped: "En camino", delivered: "Entregado" },
  tracking: {
    orderConfirmed: "Pedido confirmado",
    orderCanceled: "Pedido cancelado",
    paymentValidated: "Pago validado",
    validatingPayment: "Validando pago",
    preparingShipping: "Preparando / enviando",
    pendingDispatch: "Pendiente de despacho",
    delivered: "Entregado",
    deliveryPending: "Entrega pendiente",
  },
};

const accountLangKo: AccountLang = {
  noData: "데이터 없음",
  order: { pending: "대기 중", completed: "완료", canceled: "취소됨" },
  payment: { captured: "결제 완료", authorized: "승인됨", awaiting: "결제 대기 중", pending: "대기 중" },
  fulfillment: { notFulfilled: "미발송", partiallyShipped: "일부 발송", shipped: "배송 중", delivered: "배달 완료" },
  tracking: {
    orderConfirmed: "주문 확인",
    orderCanceled: "주문 취소",
    paymentValidated: "결제 확인됨",
    validatingPayment: "결제 확인 중",
    preparingShipping: "준비 / 발송 중",
    pendingDispatch: "발송 대기",
    delivered: "배달 완료",
    deliveryPending: "배달 대기",
  },
};

function statusLabel(type: "order" | "payment" | "fulfillment", value: string | undefined, lang: AccountLang) {
  const status = normalizeStatus(value);
  if (!status) return lang.noData;
  if (type === "order") {
    if (status.includes("pending")) return lang.order.pending;
    if (status.includes("completed")) return lang.order.completed;
    if (status.includes("canceled") || status.includes("cancelled")) return lang.order.canceled;
  }
  if (type === "payment") {
    if (status.includes("captured")) return lang.payment.captured;
    if (status.includes("authorized")) return lang.payment.authorized;
    if (status.includes("awaiting")) return lang.payment.awaiting;
    if (status.includes("pending")) return lang.payment.pending;
  }
  if (type === "fulfillment") {
    if (status.includes("not fulfilled")) return lang.fulfillment.notFulfilled;
    if (status.includes("partially shipped")) return lang.fulfillment.partiallyShipped;
    if (status.includes("shipped")) return lang.fulfillment.shipped;
    if (status.includes("delivered")) return lang.fulfillment.delivered;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildTracking(order: OrderSummary, lang: AccountLang) {
  const payment = normalizeStatus(order.payment_status);
  const fulfillment = normalizeStatus(order.fulfillment_status);
  const isCanceled = normalizeStatus(order.status).includes("cancel");

  if (isCanceled) {
    const canceledSteps: TrackingStep[] = [
      { key: "confirmed", label: lang.tracking.orderConfirmed, done: true, current: false },
      { key: "canceled", label: lang.tracking.orderCanceled, done: true, current: true },
    ];
    return { steps: canceledSteps, progress: 100 };
  }

  const paymentApproved = payment.includes("captured") || payment.includes("paid");
  // Use exact-match set — "not fulfilled".includes("fulfilled") would incorrectly return true
  const PREPARING_STATUSES = new Set(["partially fulfilled", "fulfilled", "partially shipped", "shipped", "delivered"]);
  const preparingShipment = PREPARING_STATUSES.has(fulfillment);
  const delivered = fulfillment === "delivered";

  const steps: TrackingStep[] = [
    { key: "confirmed", label: lang.tracking.orderConfirmed, done: true, current: false },
    {
      key: "payment",
      label: paymentApproved ? lang.tracking.paymentValidated : lang.tracking.validatingPayment,
      done: paymentApproved,
      current: !paymentApproved,
    },
    {
      key: "shipping",
      label: preparingShipment ? lang.tracking.preparingShipping : lang.tracking.pendingDispatch,
      done: preparingShipment,
      current: paymentApproved && !preparingShipment,
    },
    {
      key: "delivered",
      label: delivered ? lang.tracking.delivered : lang.tracking.deliveryPending,
      done: delivered,
      current: preparingShipment && !delivered,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round(((completed - 1) / (steps.length - 1)) * 100);
  return { steps, progress: Math.max(0, Math.min(progress, 100)) };
}

export default function AccountPage() {
  const { language } = useLanguage();
  const lang = language === "ko" ? accountLangKo : accountLangEs;
  const t = useMemo(
    () =>
      language === "ko"
        ? {
            pageTitle: "내 계정",
            loading: "계정 로딩 중...",
            needsLogin: "주문 내역을 보려면 로그인이 필요합니다.",
            loginCta: "로그인",
            shopCta: "쇼핑하러 가기",
            greeting: (name: string) => `안녕하세요, ${name}`,
            subtitle: "구매 내역, 상태, 배송을 확인하세요.",
            logout: "로그아웃",
            promos: "사용 가능한 프로모션",
            promosHint: "체크아웃에서 이 코드를 사용하세요. 규칙은 캠페인 및 장바구니에 따라 다릅니다.",
            copyLabel: "복사",
            copiedLabel: "복사됨",
            priceListTitle: "가격 등급",
            tierCurrent: "현재 등급:",
            orders: "내 주문",
            emptyOrders: "아직 주문이 없습니다. 구매를 완료하면 여기에 표시됩니다.",
            orderPrefix: "주문 #",
            datePrefix: "날짜:",
            statusPrefix: "상태:",
            paymentPrefix: "결제:",
            shippingPrefix: "배송:",
            trackingPrefix: "배송 추적:",
            discountsPrefix: "할인 적용:",
            error: "계정을 로딩할 수 없습니다.",
            priceListVip: "VIP 계정입니다. 해당 제품에 우대 가격이 표시됩니다.",
            priceListWholesale: "도매 계정으로 특별 가격 목록을 사용합니다.",
            priceListGeneral: "일반 계정입니다. VIP 또는 도매 계정을 활성화하면 가격이 변경됩니다.",
          }
        : {
            pageTitle: "Tu cuenta",
            loading: "Cargando cuenta...",
            needsLogin: "Necesitas iniciar sesión para ver tus pedidos y seguimiento.",
            loginCta: "Iniciar sesión",
            shopCta: "Ir a tienda",
            greeting: (name: string) => `Hola, ${name}`,
            subtitle: "Aquí puedes revisar tu historial de compras, estados y seguimiento.",
            logout: "Cerrar sesión",
            promos: "Promociones disponibles",
            promosHint: "Aplica estos codigos en checkout. Las reglas dependen de la campana y del carrito.",
            copyLabel: "copiar",
            copiedLabel: "copiado",
            priceListTitle: "Lista de precios",
            tierCurrent: "Nivel actual:",
            orders: "Mis pedidos",
            emptyOrders: "Aún no tienes pedidos. Cuando completes una compra aparecerá aquí.",
            orderPrefix: "Pedido #",
            datePrefix: "Fecha:",
            statusPrefix: "Estado:",
            paymentPrefix: "Pago:",
            shippingPrefix: "Envio:",
            trackingPrefix: "Seguimiento:",
            discountsPrefix: "Descuentos aplicados:",
            error: "Error al cargar tu cuenta.",
            priceListVip: "Tu cuenta tiene condiciones VIP. Veras precios preferenciales cuando aplique.",
            priceListWholesale: "Tu cuenta mayorista usa lista de precios especial en productos habilitados.",
            priceListGeneral: "Tu cuenta usa lista General. Si activas una cuenta VIP o Mayorista, el precio cambia automaticamente.",
          },
    [language],
  );
  const [state, setState] = useState<AccountState>("loading");
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [priceListTier, setPriceListTier] = useState("General");
  const [copiedPromoCode, setCopiedPromoCode] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState("loading");
      setError("");

      try {
        const [{ customer }, orderData] = await Promise.all([
          sdk.store.customer.retrieve(),
          sdk.store.order.list({ limit: 20, order: "-created_at" }),
        ]);

        if (!mounted) {
          return;
        }

        const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
        const customerGroups = (((customer as unknown as { groups?: { name?: string }[] }).groups ?? []) as {
          name?: string;
        }[]).map((group) => String(group.name || "").toLowerCase());
        const hasVip = customerGroups.some((name) => name.includes("vip"));
        const hasWholesale = customerGroups.some((name) => name.includes("mayor") || name.includes("wholesale"));
        setCustomerName(fullName);
        setCustomerEmail(customer.email ?? "");
        setOrders(orderData.orders as OrderSummary[]);
        setPriceListTier(hasVip ? "VIP" : hasWholesale ? "Mayorista" : "General");
        setState("ready");
      } catch (err) {
        if (!mounted) {
          return;
        }
        const message = err instanceof Error ? err.message : t.error;
        if (message.includes("(401)") || message.toLowerCase().includes("unauthorized")) {
          setState("unauthenticated");
          return;
        }
        setError(message);
        setState("error");
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const title = t.pageTitle;
  const customerLabel = useMemo(() => customerName || customerEmail || (language === "ko" ? "고객" : "Cliente"), [customerEmail, customerName, language]);
  const promoCodes = useMemo(() => {
    const used = orders
      .flatMap((order) => order.promotions ?? [])
      .map((promotion) => String(promotion.code || "").toUpperCase())
      .filter(Boolean);
    return Array.from(new Set([...DEFAULT_PROMO_CODES, ...used]));
  }, [orders]);
  const priceListMessage = useMemo(() => {
    if (priceListTier === "VIP") return t.priceListVip;
    if (priceListTier === "Mayorista") return t.priceListWholesale;
    return t.priceListGeneral;
  }, [priceListTier, t]);

  const onLogout = async () => {
    await sdk.auth.logout().catch(() => {});
    window.location.href = "/auth";
  };
  const onCopyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPromoCode(code);
      window.setTimeout(() => setCopiedPromoCode(""), 1800);
    } catch {
      setCopiedPromoCode("");
    }
  };

  if (state === "loading") {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className="text-sm text-[#5a4f7a]">{t.loading}</p>
      </main>
    );
  }

  if (state === "unauthenticated") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <section className="rounded-3xl border border-[#9595db]/25 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black">{title}</h1>
          <p className="mt-2 text-sm text-[#5a4f7a]">{t.needsLogin}</p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/auth?next=/account"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold !text-white hover:bg-[#2a2148]/90"
            >
              {t.loginCta}
            </Link>
            <Link href="/catalog" className="rounded-xl border border-[#9595db]/35 px-4 py-2 text-sm font-semibold">
              {t.shopCta}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || t.error}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <section className="rounded-3xl border border-[#9595db]/25 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">{t.greeting(customerLabel)}</h1>
            <p className="mt-1 text-sm text-[#5a4f7a]">{t.subtitle}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-[#9595db]/35 px-3 py-2 text-sm font-semibold text-black"
          >
            {t.logout}
          </button>
        </div>

        <div className="mt-8">
          {/* Orders — primary section */}
          <h2 className="text-lg font-semibold text-black">{t.orders}</h2>

          {orders.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-[#9595db]/25 bg-[#faf6fd] p-4 text-sm text-[#5a4f7a]">
              {t.emptyOrders}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {orders.map((order) => {
                const amount = Number(order.total ?? 0);
                const currency = String(order.currency_code || "usd").toUpperCase();
                const date = order.created_at ? new Date(order.created_at) : null;
                const discountTotal = Number(order.discount_total ?? 0);
                const tracking = buildTracking(order, lang);
                const trackingHint =
                  tracking.progress >= 100
                    ? lang.tracking.orderConfirmed
                    : tracking.steps.find((step) => step.current)?.label || lang.tracking.orderConfirmed;
                return (
                  <article key={order.id} className="rounded-2xl border border-[#9595db]/25 bg-[#faf6fd] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-black">
                        {t.orderPrefix}{order.display_id ?? order.id.slice(-6)}
                      </p>
                      <p className="text-sm font-semibold text-black">
                        {new Intl.NumberFormat(language === "ko" ? "ko-KR" : "es-AR", {
                          style: "currency",
                          currency,
                        }).format(amount)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#5a4f7a]">
                      {t.datePrefix} {date ? date.toLocaleString(language === "ko" ? "ko-KR" : "es-AR") : "-"}
                    </p>
                    <div className="mt-3">
                      <OrderStepper steps={tracking.steps} />
                      <p className="mt-2 text-xs text-[#6f6593]">{t.trackingPrefix} {trackingHint}</p>
                    </div>
                    {discountTotal > 0 && (
                      <p className="mt-2 text-xs text-[#6f6593]">
                        {t.discountsPrefix} -{discountTotal.toLocaleString(language === "ko" ? "ko-KR" : "es-AR")}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Promos + price tier — secondary section */}
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <section className="rounded-2xl border border-[#9595db]/25 bg-[#faf6fd] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6593]">{t.promos}</p>
              <p className="mt-2 text-sm text-[#4a4068]">{t.promosHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {promoCodes.map((code) => (
                  <button
                    key={code}
                    onClick={() => onCopyPromoCode(code)}
                    className="rounded-full border border-[#9595db]/35 bg-white px-3 py-1 text-xs font-semibold text-black transition hover:border-[#9595db]/55"
                  >
                    {code} {copiedPromoCode === code ? t.copiedLabel : t.copyLabel}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-[#9595db]/25 bg-[#faf6fd] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6593]">{t.priceListTitle}</p>
              <p className="mt-2 text-sm font-semibold text-black">{t.tierCurrent} {priceListTier}</p>
              <p className="mt-1 text-sm text-[#4a4068]">{priceListMessage}</p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  confirmed: ShoppingBag,
  payment: CreditCard,
  shipping: Package2,
  delivered: Home,
  canceled: XCircle,
};

function OrderStepper({ steps }: { steps: TrackingStep[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const Icon = STEP_ICONS[step.key] ?? CheckCircle2;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  step.done
                    ? "border-[#4660bc] bg-[#4660bc] text-white"
                    : step.current
                      ? "border-black bg-black text-white"
                      : "border-[#9595db]/50 bg-white text-[#8a80ab]"
                }`}
                title={step.label}
              >
                {step.done && !step.current ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`max-w-[60px] text-center text-[10px] leading-tight ${
                  step.done || step.current ? "text-[#4a4068]" : "text-[#8a80ab]"
                } ${step.current ? "font-semibold" : ""}`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`mb-4 h-0.5 flex-1 ${step.done ? "bg-[#4660bc]" : "bg-[#e8daf2]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
