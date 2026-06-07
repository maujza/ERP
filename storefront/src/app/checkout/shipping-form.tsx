"use client";

import { formatArs, type UiLanguage } from "@/lib/shop-data";
import { Field } from "./field";
import type { CheckoutTranslations } from "./translations";
import type { CheckoutErrors, ShippingAddress, ShippingMethod } from "./types";

type Props = {
  contactComplete: boolean;
  shipping: ShippingAddress;
  setShipping: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  shippingErrors: CheckoutErrors;
  onShippingBlur: (field: string) => void;
  loadingShippingMethods: boolean;
  shippingMethods: ShippingMethod[];
  selectedShippingMethod: string;
  setSelectedShippingMethod: (id: string) => void;
  allShippingRequiredComplete: boolean;
  t: CheckoutTranslations;
  language: UiLanguage;
};

export function ShippingForm({
  contactComplete,
  shipping, setShipping, shippingErrors, onShippingBlur,
  loadingShippingMethods, shippingMethods, selectedShippingMethod, setSelectedShippingMethod,
  allShippingRequiredComplete,
  t, language,
}: Props) {
  const fields: { key: keyof ShippingAddress; label: string }[] = [
    { key: "firstName", label: t.firstName },
    { key: "lastName", label: t.lastName },
    { key: "address", label: t.address },
    { key: "postalCode", label: t.postalCode },
    { key: "city", label: t.city },
    { key: "province", label: t.province },
  ];

  return (
    <>
      <div className={`rounded-3xl border border-[#9595db]/25 bg-white p-5 ${contactComplete ? "" : "opacity-60"}`}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#4a4068]">{t.step2}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {fields.map(({ key, label }) => (
            <Field
              key={key}
              label={label}
              value={shipping[key] as string}
              disabled={!contactComplete}
              onChange={(value) => setShipping((prev) => ({ ...prev, [key]: value }))}
              onBlur={() => onShippingBlur(key)}
              error={shippingErrors[key]}
            />
          ))}
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#5a4f7a]">
          <input
            type="checkbox"
            checked={shipping.saveInfo}
            onChange={(e) => setShipping((prev) => ({ ...prev, saveInfo: e.target.checked }))}
            disabled={!contactComplete}
          />
          {t.saveInfo}
        </label>
      </div>

      <div className={`rounded-3xl border border-[#9595db]/25 bg-white p-5 ${allShippingRequiredComplete ? "" : "opacity-60"}`}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#4a4068]">{t.step3}</p>
        <div className="mt-3 space-y-2">
          {loadingShippingMethods && (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-2xl bg-[#e8daf2]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[#e8daf2]" />
            </div>
          )}
          {!loadingShippingMethods && shippingMethods.length === 0 && (
            <p className="text-sm text-[#5a4f7a]">{t.completeAddress}</p>
          )}
          {!loadingShippingMethods && shippingMethods.map((method) => (
            <button
              key={method.id}
              disabled={!allShippingRequiredComplete}
              onClick={() => setSelectedShippingMethod(method.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                selectedShippingMethod === method.id
                  ? "border-[#4660bc] bg-[#4660bc] text-white"
                  : "border-[#9595db]/35 bg-white text-[#2a2148]"
              }`}
            >
              <span>{method.label} · {method.eta}</span>
              <span>{formatArs(method.amount, language)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
