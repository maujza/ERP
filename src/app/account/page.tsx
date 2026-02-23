"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const DEFAULT_PROMO_CODES = ["AURELIA10"];

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
    return "bg-slate-200 text-slate-700";
  }
  if (type === "fulfillment") {
    if (status.includes("delivered")) return "bg-emerald-100 text-emerald-700";
    if (status.includes("shipped")) return "bg-sky-100 text-sky-700";
    if (status.includes("fulfilled")) return "bg-blue-100 text-blue-700";
    if (status.includes("not fulfilled") || status.includes("pending")) return "bg-amber-100 text-amber-700";
    if (status.includes("canceled") || status.includes("cancelled")) return "bg-rose-100 text-rose-700";
    return "bg-slate-200 text-slate-700";
  }
  if (status.includes("completed")) return "bg-emerald-100 text-emerald-700";
  if (status.includes("pending")) return "bg-amber-100 text-amber-700";
  if (status.includes("canceled") || status.includes("cancelled")) return "bg-rose-100 text-rose-700";
  return "bg-slate-200 text-slate-700";
}

function statusLabel(type: "order" | "payment" | "fulfillment", value?: string) {
  const status = normalizeStatus(value);
  if (!status) return "Sin datos";
  if (type === "order") {
    if (status.includes("pending")) return "Pendiente";
    if (status.includes("completed")) return "Completado";
    if (status.includes("canceled") || status.includes("cancelled")) return "Cancelado";
  }
  if (type === "payment") {
    if (status.includes("captured")) return "Cobrado";
    if (status.includes("authorized")) return "Autorizado";
    if (status.includes("awaiting")) return "Esperando pago";
    if (status.includes("pending")) return "Pendiente";
  }
  if (type === "fulfillment") {
    if (status.includes("not fulfilled")) return "Aun no despachado";
    if (status.includes("partially shipped")) return "Parcialmente enviado";
    if (status.includes("shipped")) return "En camino";
    if (status.includes("delivered")) return "Entregado";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildTracking(order: OrderSummary) {
  const payment = normalizeStatus(order.payment_status);
  const fulfillment = normalizeStatus(order.fulfillment_status);
  const isCanceled = normalizeStatus(order.status).includes("cancel");

  if (isCanceled) {
    const canceledSteps: TrackingStep[] = [
      { key: "confirmed", label: "Pedido confirmado", done: true, current: false },
      { key: "canceled", label: "Pedido cancelado", done: true, current: true },
    ];
    return { steps: canceledSteps, progress: 100 };
  }

  const paymentApproved = payment.includes("authorized") || payment.includes("captured") || payment.includes("paid");
  const preparingShipment = fulfillment.includes("fulfilled") || fulfillment.includes("shipped") || fulfillment.includes("delivered");
  const delivered = fulfillment.includes("delivered");

  const steps: TrackingStep[] = [
    { key: "confirmed", label: "Pedido confirmado", done: true, current: false },
    {
      key: "payment",
      label: paymentApproved ? "Pago validado" : "Validando pago",
      done: paymentApproved,
      current: !paymentApproved,
    },
    {
      key: "shipping",
      label: preparingShipment ? "Preparando / enviando" : "Pendiente de despacho",
      done: preparingShipment,
      current: paymentApproved && !preparingShipment,
    },
    {
      key: "delivered",
      label: delivered ? "Entregado" : "Entrega pendiente",
      done: delivered,
      current: preparingShipment && !delivered,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round(((completed - 1) / (steps.length - 1)) * 100);
  return { steps, progress: Math.max(0, Math.min(progress, 100)) };
}

export default function AccountPage() {
  const [state, setState] = useState<AccountState>("loading");
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [priceListTier, setPriceListTier] = useState("General");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
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
        const message = err instanceof Error ? err.message : "No se pudo cargar tu cuenta.";
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

  const customerLabel = useMemo(() => customerName || customerEmail || "Cliente", [customerEmail, customerName]);
  const promoCodes = useMemo(() => {
    const used = orders
      .flatMap((order) => order.promotions ?? [])
      .map((promotion) => String(promotion.code || "").toUpperCase())
      .filter(Boolean);
    return Array.from(new Set([...DEFAULT_PROMO_CODES, ...used]));
  }, [orders]);
  const priceListMessage = useMemo(() => {
    if (priceListTier === "VIP") {
      return "Tu cuenta tiene condiciones VIP. Veras precios preferenciales cuando aplique.";
    }
    if (priceListTier === "Mayorista") {
      return "Tu cuenta mayorista usa lista de precios especial en productos habilitados.";
    }
    return "Tu cuenta usa lista General. Si activas una cuenta VIP o Mayorista, el precio cambia automaticamente.";
  }, [priceListTier]);

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
        <p className="text-sm text-slate-600">Cargando cuenta...</p>
      </main>
    );
  }

  if (state === "unauthenticated") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black">Tu cuenta</h1>
          <p className="mt-2 text-sm text-slate-600">
            Necesitas iniciar sesión para ver tus pedidos y seguimiento.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/auth?next=/account"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold !text-white hover:bg-black/90"
            >
              Iniciar sesión
            </Link>
            <Link href="/catalog" className="rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold">
              Ir a tienda
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
          {error || "Error al cargar tu cuenta."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">Hola, {customerLabel}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Aquí puedes revisar tu historial de compras, estados y seguimiento.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-black/15 px-3 py-2 text-sm font-semibold text-black"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="mt-8">
          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-2xl border border-black/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Promociones disponibles</p>
              <p className="mt-2 text-sm text-slate-700">
                Aplica estos codigos en checkout. Las reglas dependen de la campana y del carrito.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {promoCodes.map((code) => (
                  <button
                    key={code}
                    onClick={() => onCopyPromoCode(code)}
                    className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-black transition hover:border-black/35"
                  >
                    {code} {copiedPromoCode === code ? "copiado" : "copiar"}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-black/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lista de precios</p>
              <p className="mt-2 text-sm font-semibold text-black">Nivel actual: {priceListTier}</p>
              <p className="mt-1 text-sm text-slate-700">{priceListMessage}</p>
            </section>
          </div>

          <h2 className="text-lg font-semibold text-black">Mis pedidos</h2>

          {orders.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-600">
              Aún no tienes pedidos. Cuando completes una compra aparecerá aquí.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {orders.map((order) => {
                const amount = Number(order.total ?? 0);
                const currency = String(order.currency_code || "usd").toUpperCase();
                const date = order.created_at ? new Date(order.created_at) : null;
                const discountTotal = Number(order.discount_total ?? 0);
                const tracking = buildTracking(order);
                const isExpanded = expandedOrderId === order.id;
                const trackingHint =
                  tracking.progress >= 100
                    ? "Pedido finalizado."
                    : tracking.steps.find((step) => step.current)?.label || "Actualizando estado.";
                return (
                  <article key={order.id} className="rounded-2xl border border-black/10 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-black">
                        Pedido #{order.display_id ?? order.id.slice(-6)}
                      </p>
                      <p className="text-sm font-semibold text-black">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency,
                        }).format(amount)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Fecha: {date ? date.toLocaleString("es-AR") : "-"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadgeClasses("order", order.status)}`}
                      >
                        Estado: {statusLabel("order", order.status)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadgeClasses("payment", order.payment_status)}`}
                      >
                        Pago: {statusLabel("payment", order.payment_status)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadgeClasses("fulfillment", order.fulfillment_status)}`}
                      >
                        Envio: {statusLabel("fulfillment", order.fulfillment_status)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-black transition-all"
                          style={{ width: `${tracking.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Seguimiento: {trackingHint}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {discountTotal > 0 ? `Descuentos aplicados: -${discountTotal.toLocaleString("es-AR")}` : "Sin descuento aplicado"}
                      </p>
                      <button
                        onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                        className="rounded-lg border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-black hover:border-black/35"
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>
                    {isExpanded ? (
                      <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Timeline</p>
                        <div className="mt-2 space-y-2">
                          {tracking.steps.map((step) => (
                            <div key={step.key} className="flex items-center gap-2 text-xs">
                              <span
                                className={`inline-block size-2 rounded-full ${
                                  step.done ? "bg-emerald-500" : step.current ? "bg-black" : "bg-slate-300"
                                }`}
                              />
                              <span className={step.done || step.current ? "text-slate-800" : "text-slate-500"}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
