"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OrderConfirmationPage() {
  const { language } = useLanguage();
  const t = language === "ko"
    ? {
        confirmed: "주문 확인",
        title: "구매해 주셔서 감사합니다",
        desc: "이메일로 주문 상세와 배송 추적 정보를 전송했습니다.",
        continue: "쇼핑 계속하기",
        home: "홈으로",
      }
    : {
        confirmed: "Orden confirmada",
        title: "Gracias por tu compra",
        desc: "Te enviamos el detalle de pedido y seguimiento por email.",
        continue: "Seguir comprando",
        home: "Volver al home",
      };

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-10">
      <Card className="space-y-4 p-6 text-center md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.confirmed}</p>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.title}</h1>
        <p className="text-sm text-[#555555]">{t.desc}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/catalog">{t.continue}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t.home}</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
