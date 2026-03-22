"use client";

import type { CheckoutTranslations } from "./translations";

type Props = {
  email: string;
  setEmail: (v: string) => void;
  onEmailBlur: () => void;
  phone: string;
  setPhone: (v: string) => void;
  phoneError: string;
  setPhoneError: (v: string) => void;
  showLoginHint: boolean;
  isWhatsAppPaymentMethod: boolean;
  t: CheckoutTranslations;
  onLoginClick: () => void;
  onPhoneBlur: () => void;
};

export function ContactForm({
  email, setEmail, onEmailBlur,
  phone, setPhone, phoneError, setPhoneError,
  showLoginHint, isWhatsAppPaymentMethod,
  t, onLoginClick, onPhoneBlur,
}: Props) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[#3f3f3f]">{t.step1}</p>
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
          {t.loginHint}{" "}
          <button type="button" className="underline" onClick={onLoginClick}>
            {t.loginAction}
          </button>
        </p>
      )}
      <label className="mt-3 block text-sm font-medium text-[#111111]">
        {t.phone}
        {!isWhatsAppPaymentMethod && (
          <span className="ml-1 text-xs font-normal text-[#888888]">(opcional)</span>
        )}
      </label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={onPhoneBlur}
        className="mt-1 w-full rounded-2xl border border-black/15 px-3 py-2 text-sm outline-none"
        placeholder={t.phonePlaceholder}
        type="tel"
      />
      {phoneError && <p className="mt-1 text-xs text-[#b00020]">{phoneError}</p>}
      {isWhatsAppPaymentMethod && !phoneError && (
        <p className="mt-1 text-xs text-[#666666]">{t.phoneHint}</p>
      )}
    </div>
  );
}
