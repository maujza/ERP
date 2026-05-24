"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sdk } from "@/lib/medusa";
import { openWhatsAppDraft, readWhatsAppDraft } from "@/lib/whatsapp";

type NotifyStatus = "idle" | "loading" | "sent" | "error";

export default function OrderConfirmationPage() {
  const { language } = useLanguage();
  const [shouldShowWhatsAppActions, setShouldShowWhatsAppActions] = useState(false);
  const [orderIdFromQuery, setOrderIdFromQuery] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShouldShowWhatsAppActions(params.get("wa") === "1");
    setOrderIdFromQuery(params.get("order_id") ?? "");
    setHasDraft(Boolean(readWhatsAppDraft()));
  }, []);

  const t = language === "ko"
    ? {
        confirmed: "주문 확인",
        title: "구매해 주셔서 감사합니다",
        desc: "이메일로 주문 상세와 배송 추적 정보를 전송했습니다.",
        retryWpp: "WhatsApp 재시도",
        notifyAgent: "상담원에게 알리기",
        notifyAgentSent: "상담원에게 전달됨",
        notifyAgentError: "전송 실패 — 재시도",
        wppHint: "링크가 실패하면 재시도하거나 상담원에게 알릴 수 있습니다.",
        continue: "쇼핑 계속하기",
        home: "홈으로",
        orderNumber: "주문 번호",
      }
    : {
        confirmed: "Orden confirmada",
        title: "Gracias por tu compra",
        desc: "Te enviamos el detalle de pedido y seguimiento por email.",
        retryWpp: "Reintentar por WhatsApp",
        notifyAgent: "Notificar al agente",
        notifyAgentSent: "Agente notificado ✓",
        notifyAgentError: "Error al notificar — reintentar",
        wppHint: "Si el enlace falló, podés reintentarlo o avisar a un agente para que te contacte.",
        continue: "Seguir comprando",
        home: "Volver al home",
        orderNumber: "N° pedido",
      };

  const openDraft = () => {
    const draft = readWhatsAppDraft();
    if (!draft) return;
    openWhatsAppDraft(draft);
  };

  const notifyAgent = async () => {
    if (!orderIdFromQuery || notifyStatus === "loading" || notifyStatus === "sent") return;
    setNotifyStatus("loading");
    try {
      await sdk.client.fetch("/store/notify-agent", {
        method: "POST",
        body: { order_id: orderIdFromQuery },
      });
      setNotifyStatus("sent");
    } catch {
      setNotifyStatus("error");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-10">
      <Card className="space-y-4 p-6 text-center md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.confirmed}</p>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.title}</h1>
        <p className="text-sm text-[#555555]">{t.desc}</p>
        {orderIdFromQuery && (
          <p className="text-sm font-semibold text-[#222222]">{t.orderNumber}: {orderIdFromQuery}</p>
        )}
        {shouldShowWhatsAppActions && hasDraft && (
          <div className="space-y-2 rounded-2xl border border-[#25d366]/30 bg-[#f0faf4] p-4">
            <p className="text-sm text-[#1a7a3a]">{t.wppHint}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                className="bg-[#25d366] hover:bg-[#1fb558]"
                onClick={openDraft}
              >
                {t.retryWpp}
              </Button>
              <Button
                variant="outline"
                disabled={notifyStatus === "loading" || notifyStatus === "sent"}
                onClick={notifyAgent}
              >
                {notifyStatus === "sent"
                  ? t.notifyAgentSent
                  : notifyStatus === "error"
                    ? t.notifyAgentError
                    : t.notifyAgent}
              </Button>
            </div>
          </div>
        )}
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
