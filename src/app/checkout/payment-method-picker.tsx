"use client";

import type { UiLanguage } from "@/lib/shop-data";
import type { CheckoutTranslations } from "./translations";
import type { PaymentMethod } from "./types";

type Props = {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  t: CheckoutTranslations;
  language: UiLanguage;
};

export function PaymentMethodPicker({ paymentMethod, setPaymentMethod, t, language }: Props) {
  const options: { value: PaymentMethod; label: string }[] = [
    { value: "mp", label: t.mp },
    { value: "cash", label: t.cash },
    { value: "transfer", label: t.transfer },
  ];

  return (
    <div className="space-y-3 rounded-3xl border border-black/10 bg-white p-5">
      <p className="text-sm font-semibold text-[#111111]">{t.paymentTitle}</p>
      <div className="grid gap-2">
        {options.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPaymentMethod(value)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
              paymentMethod === value
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-black/15 bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {(paymentMethod === "cash" || paymentMethod === "transfer") && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#25d366]/40 bg-[#f0faf4] p-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-[#25d366]" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <p className="text-sm text-[#1a7a3a]">
            {language === "ko"
              ? "주문 정보가 WhatsApp 메시지로 전송됩니다. 이메일만 입력하면 바로 보낼 수 있습니다."
              : "Coordinaremos el pago por WhatsApp. Al confirmar, te enviamos el resumen y un asesor te contacta."}
          </p>
        </div>
      )}
    </div>
  );
}
