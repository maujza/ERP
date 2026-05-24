"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { sdk } from "@/lib/medusa";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const { language } = useLanguage();
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

  const t = useMemo(
    () =>
      language === "ko"
        ? {
            titleLogin: "로그인",
            titleSignup: "회원 가입",
            subtitle: "주문 추적, 내역, 프로모션을 보려면 로그인하세요.",
            tabLogin: "로그인",
            tabSignup: "회원 가입",
            firstName: "이름",
            lastName: "성",
            email: "이메일",
            password: "비밀번호",
            loading: "처리 중...",
            submitLogin: "로그인",
            submitSignup: "회원 가입",
            errorFallback: "인증을 완료할 수 없습니다.",
            footerText: "카탈로그로 돌아가시겠어요?",
            footerLink: "쇼핑하러 가기",
          }
        : {
            titleLogin: "Iniciar sesión",
            titleSignup: "Crear cuenta",
            subtitle: "Accede para ver seguimiento de pedidos, historial y promociones aplicadas.",
            tabLogin: "Ingresar",
            tabSignup: "Registrarme",
            firstName: "Nombre",
            lastName: "Apellido",
            email: "Email",
            password: "Contraseña",
            loading: "Procesando...",
            submitLogin: "Ingresar",
            submitSignup: "Crear cuenta",
            errorFallback: "No se pudo completar la autenticación.",
            footerText: "¿Querés volver al catálogo?",
            footerLink: "Ir a tienda",
          },
    [language],
  );

  const title = useMemo(() => (mode === "login" ? t.titleLogin : t.titleSignup), [mode, t]);

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
      setError(err instanceof Error ? err.message : t.errorFallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>

        <div className="mt-5 inline-flex rounded-full border border-black/10 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "login" ? "bg-black text-white" : "text-slate-700"
            }`}
          >
            {t.tabLogin}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "signup" ? "bg-black text-white" : "text-slate-700"
            }`}
          >
            {t.tabSignup}
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">{t.firstName}</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-black/40"
                  autoComplete="given-name"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">{t.lastName}</span>
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
            <span className="mb-1 block text-slate-700">{t.email}</span>
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
            <span className="mb-1 block text-slate-700">{t.password}</span>
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
            {loading ? t.loading : mode === "login" ? t.submitLogin : t.submitSignup}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {t.footerText}{" "}
          <Link href="/catalog" className="font-medium text-black underline">
            {t.footerLink}
          </Link>
        </p>
      </section>
    </main>
  );
}
