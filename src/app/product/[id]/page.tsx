"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatArs,
  getProductById,
  getProductDescription,
  getProductName,
  translateLabel,
} from "@/lib/shop-data";

export default function ProductDetailPage() {
  const { language } = useLanguage();
  const params = useParams<{ id: string }>();
  const { addToCart } = useCart();

  const t = language === "ko"
    ? {
        notFound: "상품을 찾을 수 없습니다",
        backCollection: "컬렉션으로 돌아가기",
        home: "홈",
        collection: "컬렉션",
        soldOut: "품절",
        variants: "옵션",
        noStock: "재고가 없습니다.",
        selectVariant: "구매를 위해 옵션을 선택하세요.",
        variantStock: "옵션 재고",
        stockAvailable: "재고",
        units: "개",
        selectVariantBtn: "옵션 선택",
        addToCart: "카트에 추가",
        continueShopping: "쇼핑 계속하기",
      }
    : {
        notFound: "Producto no encontrado",
        backCollection: "Volver a coleccion",
        home: "Home",
        collection: "Coleccion",
        soldOut: "AGOTADO",
        variants: "Variantes",
        noStock: "Producto sin stock.",
        selectVariant: "Selecciona una variante para habilitar compra.",
        variantStock: "Stock variante",
        stockAvailable: "Stock disponible",
        units: "unidades",
        selectVariantBtn: "Selecciona variante",
        addToCart: "Agregar al carrito",
        continueShopping: "Seguir comprando",
      };

  const product = useMemo(() => getProductById(params.id), [params.id]);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-[1000px] px-4 py-8">
        <Card className="p-6">
          <p className="text-lg font-semibold">{t.notFound}</p>
          <Button asChild className="mt-4">
            <Link href="/catalog">{t.backCollection}</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const outOfStock = product.stock <= 0;
  const hasVariants = Boolean(product.variants && product.variants.length > 1);
  const selectedVariantData = product.variants?.find((variant) => variant.id === selectedVariant);
  const missingVariant = hasVariants && !selectedVariant;
  const canAdd = !outOfStock && !missingVariant;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-4 text-sm text-[#666666]">
        <Link href="/" className="hover:text-[#111111]">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/catalog" className="hover:text-[#111111]">
          {t.collection}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#111111]">{getProductName(product, language)}</span>
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="relative h-[420px] overflow-hidden rounded-3xl border border-black/10 bg-white md:h-[560px]">
          <Image src={product.image} alt={getProductName(product, language)} fill className="object-cover" priority />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="outline" className="bg-white/90">
              {translateLabel(product.category, language)}
            </Badge>
            {outOfStock && <Badge variant="glow">{t.soldOut}</Badge>}
          </div>
        </div>

        <Card className="space-y-4 p-5 md:p-6">
          <h1 className="text-2xl font-semibold text-[#111111] md:text-3xl">{getProductName(product, language)}</h1>
          <p className="text-sm text-[#555555]">{getProductDescription(product, language)}</p>

          <div className="flex flex-wrap items-end gap-3">
            <p className="text-3xl font-semibold text-[#111111]">{formatArs(product.price, language)}</p>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <p className="text-sm text-[#777777] line-through">{formatArs(product.originalPrice, language)}</p>
                <Badge variant="outline">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </Badge>
              </>
            )}
          </div>

          {hasVariants && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.variants}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants?.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      selectedVariant === variant.id
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-black/15 bg-white"
                    }`}
                  >
                    {translateLabel(variant.label, language)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#f5f5f5] p-3 text-sm text-[#555555]">
            {outOfStock && <p>{t.noStock}</p>}
            {!outOfStock && hasVariants && !selectedVariantData && <p>{t.selectVariant}</p>}
            {!outOfStock && selectedVariantData && <p>{t.variantStock}: {selectedVariantData.stock} {t.units}.</p>}
            {!outOfStock && !hasVariants && <p>{t.stockAvailable}: {product.stock} {t.units}.</p>}
          </div>

          <Button
            className="w-full"
            disabled={!canAdd}
            onClick={() => addToCart(product.id, selectedVariant, { openDrawer: true })}
          >
            {outOfStock ? t.soldOut : missingVariant ? t.selectVariantBtn : t.addToCart}
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/catalog">{t.continueShopping}</Link>
          </Button>
        </Card>
      </section>
    </main>
  );
}
