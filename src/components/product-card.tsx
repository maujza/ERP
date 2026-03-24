"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { ProductQuickView } from "@/components/product-quick-view";
import { Badge } from "@/components/ui/badge";
import { calculateDiscountPercent, formatArs, getProductName, type Product } from "@/lib/shop-data";
import type { UiLanguage } from "@/lib/shop-data";
import { useFavorites } from "@/hooks/use-favorites";
import { useIsMobile } from "@/hooks/use-is-mobile";

type ProductCardProps = {
  product: Product;
  language: UiLanguage;
  soldOutLabel: string;
  variant?: "catalog" | "featured";
};

export function ProductCard({ product, language, soldOutLabel, variant = "catalog" }: ProductCardProps) {
  const isDiscounted = Boolean(product.originalPrice && product.originalPrice > product.price);
  const outOfStock = product.stock <= 0;
  const discountPct = isDiscounted
    ? calculateDiscountPercent(product.price, product.originalPrice ?? product.price)
    : 0;
  const { isFavorite, toggleFavorite } = useFavorites();
  const isMobile = useIsMobile();
  const imageHeight = variant === "featured" ? "h-64" : "h-52";
  const favorited = isFavorite(product.id);

  const t =
    language === "ko"
      ? {
          addToCart: "옵션 선택",
          quickView: "빠른 보기",
          saveFavorite: "즐겨찾기 저장",
          removeFavorite: "즐겨찾기 제거",
        }
      : {
          addToCart: "Seleccionar opciones",
          quickView: "Vista rapida",
          saveFavorite: "Guardar en favoritos",
          removeFavorite: "Quitar de favoritos",
        };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      {/* Image area */}
      <div className={`relative ${imageHeight} w-full overflow-hidden`}>
        <Link href={`/product/${product.id}`} className="block h-full w-full">
          <SafeImage
            src={product.image}
            alt={getProductName(product, language)}
            fill
            className="object-cover transition-transform duration-[300ms] ease-[ease] group-hover:scale-105"
          />
        </Link>

        {/* Discount badge */}
        {isDiscounted && (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] text-white">
            -{discountPct}%
          </span>
        )}

        {/* Favorites heart */}
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={favorited ? t.removeFavorite : t.saveFavorite}
          aria-pressed={favorited}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100 max-md:opacity-100"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              favorited ? "fill-[#ff174f] stroke-[#ff174f]" : "stroke-[#555555]"
            }`}
          />
        </button>

        {/* Hover action buttons — desktop only, not in DOM on mobile */}
        {!isMobile && (
          <div className="absolute bottom-0 left-0 right-0 z-[7] flex items-center justify-center gap-[5px] bg-white py-[10px] opacity-0 translate-y-[10px] transition-all duration-[350ms] ease-[ease] will-change-[opacity,transform] group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
            {/* Add to cart → navigates to product page for variant selection */}
            <div className="group/btn relative">
              <Link
                href={`/product/${product.id}`}
                aria-label={t.addToCart}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-btn-add)] text-white transition-opacity duration-[350ms] ease-[ease] hover:opacity-80"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M9 3.75v10.5M3.75 9h10.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
                {t.addToCart}
              </span>
            </div>

            {/* Quick view → opens modal */}
            <ProductQuickView
              productId={product.id}
              renderTrigger={({ onClick }) => (
                <div className="group/btn relative">
                  <button
                    type="button"
                    onClick={onClick}
                    aria-label={t.quickView}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-btn-qv)] text-white transition-opacity duration-[150ms] ease-in-out hover:opacity-80"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path
                        d="M9 3.75C5.25 3.75 2.25 9 2.25 9s3 5.25 6.75 5.25S15.75 9 15.75 9 12.75 3.75 9 3.75Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
                    {t.quickView}
                  </span>
                </div>
              )}
            />
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="space-y-1 p-3">
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
            </>
          ) : (
            <span className="font-semibold text-[#111111]">{formatArs(product.price, language)}</span>
          )}
        </div>
        {outOfStock && <Badge variant="outline">{soldOutLabel}</Badge>}
      </div>
    </article>
  );
}
