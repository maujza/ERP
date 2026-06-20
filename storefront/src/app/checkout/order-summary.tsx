"use client";

import { ChevronDown } from "lucide-react";

import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { formatArs, type UiLanguage } from "@/lib/shop-data";
import type { CartLineWithTotal } from "./use-checkout";
import type { CheckoutTranslations } from "./translations";

type Props = {
  cartLines: CartLineWithTotal[];
  subtotal: number;
  discountAmount: number;
  total: number;
  discountCode: string;
  setDiscountCode: (v: string) => void;
  discountError: string;
  applyDiscount: () => Promise<void>;
  t: CheckoutTranslations;
  language: UiLanguage;
  summaryOpenMobile: boolean;
  setSummaryOpenMobile: (v: boolean | ((prev: boolean) => boolean)) => void;
};

export function OrderSummary({
  cartLines, subtotal, discountAmount, total,
  discountCode, setDiscountCode, discountError, applyDiscount,
  t, language, summaryOpenMobile, setSummaryOpenMobile,
}: Props) {
  return (
    <aside className="order-first space-y-4 md:order-last md:sticky md:top-24 md:h-fit">
      <button
        onClick={() => setSummaryOpenMobile((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-[#9595db]/25 bg-white px-4 py-3 text-left md:hidden"
      >
        <span className="text-sm font-semibold text-[#2a2148]">
          {t.summaryMobile} · {formatArs(total, language)}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${summaryOpenMobile ? "rotate-180" : "rotate-0"}`} />
      </button>

      <div className={`${summaryOpenMobile ? "block" : "hidden"} rounded-3xl border border-[#9595db]/25 bg-white p-4 md:block md:p-5`}>
        <h2 className="text-lg font-semibold text-[#2a2148]">{t.summary}</h2>
        <div className="mt-4 space-y-3">
          {cartLines.map((line) => (
            <div key={line.id} className="flex gap-2 rounded-2xl border border-[#9595db]/25 p-2">
              <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-[#f2e6f7]">
                {line.thumbnail && (
                  <SafeImage src={line.thumbnail} alt={line.title} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-[#2a2148]">{line.title}</p>
                <p className="text-xs text-[#5a4f7a]">
                  {line.variantTitle || t.noStockVariant} · x{line.quantity}
                </p>
                <p className="text-sm font-semibold text-[#2a2148]">{formatArs(line.lineTotal, language)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-[#2a2148]">{t.discountCode}</label>
          <div className="flex gap-2">
            <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="h-10 flex-1 rounded-2xl border border-[#9595db]/35 px-3 text-sm"
              placeholder="AURELIA10"
            />
            <Button variant="outline" onClick={() => void applyDiscount()}>
              {t.apply}
            </Button>
          </div>
          {discountError && <p className="text-xs text-[#b00020]">{discountError}</p>}
        </div>

        <div className="mt-4 space-y-2 rounded-2xl bg-[#f2e6f7] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>{t.subtotal}</span>
            <span>{formatArs(subtotal, language)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span>{t.discount}</span>
              <span>-{formatArs(discountAmount, language)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#9595db]/25 pt-2 font-semibold text-[#2a2148]">
            <span>{t.total}</span>
            <span>{formatArs(total, language)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
