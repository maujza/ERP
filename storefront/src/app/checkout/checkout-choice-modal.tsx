"use client";

import type { CheckoutTranslations } from "./translations";

type Props = {
  onGuest: () => void;
  onLogin: () => void;
  onCancel: () => void;
  t: CheckoutTranslations;
};

export function CheckoutChoiceModal({ onGuest, onLogin, onCancel, t }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[95] bg-[#2a2148]/50" onClick={onCancel} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#9595db]/25 bg-white p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-black">{t.checkoutChoiceTitle}</h3>
          <p className="mt-2 text-sm text-[#5a4f7a]">{t.checkoutChoiceBody}</p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={onGuest}
              className="rounded-xl border border-[#9595db]/35 bg-white px-4 py-2.5 text-sm font-semibold text-black"
            >
              {t.checkoutChoiceGuest}
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold !text-white hover:bg-[#2a2148]/90"
            >
              {t.checkoutChoiceLogin}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#5a4f7a]"
            >
              {t.checkoutChoiceCancel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
