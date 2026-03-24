"use client";

import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { ProductQuickView } from "@/components/product-quick-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateDiscountPercent, formatArs, getProductName, type Product } from "@/lib/shop-data";
import type { UiLanguage } from "@/lib/shop-data";

type ProductCardProps = {
  product: Product;
  language: UiLanguage;
  soldOutLabel: string;
  addToCartLabel: string;
};

export function ProductCard({ product, language, soldOutLabel, addToCartLabel }: ProductCardProps) {
  const isDiscounted = Boolean(product.originalPrice && product.originalPrice > product.price);
  const outOfStock = product.stock <= 0;
  const discountPct = isDiscounted
    ? calculateDiscountPercent(product.price, product.originalPrice ?? product.price)
    : 0;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative h-40 w-full">
          <SafeImage src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
        </div>
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 text-sm font-semibold text-[#111111]">
            {getProductName(product, language)}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {isDiscounted ? (
              <>
                <span className="font-semibold text-[#111111]">{formatArs(product.price, language)}</span>
                <span className="text-xs text-[#777777] line-through">
                  {formatArs(product.originalPrice ?? product.price, language)}
                </span>
                <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] text-white">
                  -{discountPct}%
                </span>
              </>
            ) : (
              <span className="font-semibold text-[#111111]">{formatArs(product.price, language)}</span>
            )}
          </div>
          {outOfStock && <Badge variant="outline">{soldOutLabel}</Badge>}
        </div>
      </Link>
      <div className="flex flex-col gap-2 px-3 pb-3 sm:flex-row sm:items-center">
        <ProductQuickView productId={product.id} className="h-10 w-full px-3 sm:w-auto sm:shrink-0" />
        {outOfStock ? (
          <Button
            disabled
            className="min-h-10 h-auto w-full px-3 py-2 text-xs !whitespace-normal leading-tight sm:h-10 sm:py-0 sm:text-sm sm:!whitespace-nowrap"
          >
            {soldOutLabel}
          </Button>
        ) : (
          <Button
            asChild
            className="min-h-10 h-auto w-full px-3 py-2 text-xs !whitespace-normal leading-tight sm:h-10 sm:py-0 sm:text-sm sm:!whitespace-nowrap"
          >
            <Link href={`/product/${product.id}`}>{addToCartLabel}</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
