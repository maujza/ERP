"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { sdk } from "@/lib/medusa";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/account");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPathParam = params.get("next") || "/account";
    setNextPath(nextPathParam.startsWith("/") ? nextPathParam : "/account");
  }, []);

  const title = useMemo(() => (mode === "login" ? "Iniciar sesión" : "Crear cuenta"), [mode]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const registrationToken = await sdk.auth.register("customer", "emailpass", {
          email,
          password,
        });

        await sdk.store.customer.create(
          {
            email,
            first_name: firstName || undefined,
            last_name: lastName || undefined,
          },
          {},
          {
            Authorization: `Bearer ${registrationToken}`,
          }
        );
      }

      const result = await sdk.auth.login("customer", "emailpass", { email, password });
      if (typeof result !== "string" && "location" in result) {
        window.location.href = result.location;
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accede para ver seguimiento de pedidos, historial y promociones aplicadas.
        </p>

        <div className="mt-5 inline-flex rounded-full border border-black/10 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "login" ? "bg-black text-white" : "text-slate-700"
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "signup" ? "bg-black text-white" : "text-slate-700"
            }`}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Nombre</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-black/40"
                  autoComplete="given-name"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Apellido</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-black/40"
                  autoComplete="family-name"
                />
              </label>
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-black/40"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-black/40"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          ¿Querés volver al catálogo?{" "}
          <Link href="/catalog" className="font-medium text-black underline">
            Ir a tienda
          </Link>
        </p>
      </section>
    </main>
  );
}
