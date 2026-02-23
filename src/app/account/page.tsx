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
};

export default function AccountPage() {
  const [state, setState] = useState<AccountState>("loading");
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);

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
        setCustomerName(fullName);
        setCustomerEmail(customer.email ?? "");
        setOrders(orderData.orders as OrderSummary[]);
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

  const onLogout = async () => {
    await sdk.auth.logout().catch(() => {});
    window.location.href = "/auth";
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
                    <p className="mt-1 text-xs text-slate-600">
                      Estado: {order.status || "-"} | Pago: {order.payment_status || "-"} | Envío:{" "}
                      {order.fulfillment_status || "-"}
                    </p>
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
