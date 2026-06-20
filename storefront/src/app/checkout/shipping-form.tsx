"use client";

import { Field } from "./field";
import type { CheckoutTranslations } from "./translations";
import type { CheckoutErrors, ShippingAddress } from "./types";

type Props = {
  contactComplete: boolean;
  shipping: ShippingAddress;
  setShipping: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  shippingErrors: CheckoutErrors;
  onShippingBlur: (field: string) => void;
  t: CheckoutTranslations;
};

export function ShippingForm({
  contactComplete,
  shipping, setShipping, shippingErrors, onShippingBlur,
  t,
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
  );
}
