"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { QuantitySelector } from "@/components/quantity-selector";
import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  calculateDiscountPercent,
  formatArs,
  getProductDescription,
  getProductName,
  hasPurchasablePrice,
  isJewelryProduct,
  mapMedusaProduct,
  translateLabel,
  type Product,
} from "@/lib/shop-data";
import { sdk, withStorePricingContext } from "@/lib/medusa";

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
        qty: "수량",
        decreaseQty: "수량 줄이기",
        increaseQty: "수량 늘리기",
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
        qty: "Cantidad",
        decreaseQty: "Reducir cantidad",
        increaseQty: "Aumentar cantidad",
      };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    sdk.store.product.retrieve(params.id, withStorePricingContext({
      fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories",
    }) as Parameters<typeof sdk.store.product.retrieve>[1]).then(({ product: p }) => {
      const mappedProduct = mapMedusaProduct(p);
      setProduct(isJewelryProduct(mappedProduct) ? mappedProduct : null);
    }).catch(() => {
      setProduct(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [params.id]);

  useEffect(() => {
    setQty(1);
  }, [selectedVariant]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1000px] px-4 py-8">
        <Card className="p-6">
          <p className="text-lg font-semibold text-[#5a4f7a]">...</p>
        </Card>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-[1000px] px-4 py-8">
        <Card className="p-6 space-y-4">
          <p className="text-lg font-semibold text-[#2a2148]">{t.notFound}</p>
          <Button asChild variant="outline">
            <Link href="/catalog">{t.backCollection}</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const outOfStock = product.stock <= 0;
  const hasValidPrice = hasPurchasablePrice(product);
  const hasVariants = Boolean(product.variants && product.variants.length > 1);
  const defaultVariantId = product.variants?.[0]?.id;
  const selectedVariantData = product.variants?.find((variant) => variant.id === selectedVariant);
  const missingVariant = hasVariants && !selectedVariant;
  const canAdd = !outOfStock && hasValidPrice && !missingVariant;
  const maxQty = selectedVariantData ? selectedVariantData.stock : product.stock;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-4 text-sm text-[#5a4f7a]">
        <Link href="/" className="hover:text-[#2a2148]">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/catalog" className="hover:text-[#2a2148]">
          {t.collection}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#2a2148]">{getProductName(product, language)}</span>
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="relative h-[420px] overflow-hidden rounded-3xl border border-[#9595db]/25 bg-white md:h-[560px]">
          <SafeImage src={product.image} alt={getProductName(product, language)} fill className="object-cover" priority />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="outline" className="bg-white/90">
              {translateLabel(product.category, language)}
            </Badge>
            {outOfStock && <Badge variant="glow">{t.soldOut}</Badge>}
          </div>
        </div>

        <Card className="space-y-4 p-5 md:p-6">
          <h1 className="text-2xl font-semibold text-[#2a2148] md:text-3xl">{getProductName(product, language)}</h1>
          <p className="text-sm text-[#5a4f7a]">{getProductDescription(product, language)}</p>

          <div className="flex flex-wrap items-end gap-3">
            <p className="text-3xl font-semibold text-[#2a2148]">{formatArs(product.price, language)}</p>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <p className="text-sm text-[#6f6593] line-through">{formatArs(product.originalPrice, language)}</p>
                <Badge variant="outline">
                  -{calculateDiscountPercent(product.price, product.originalPrice)}%
                </Badge>
              </>
            )}
          </div>

          {hasVariants && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a4f7a]">{t.variants}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants?.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      selectedVariant === variant.id
                        ? "border-[#4660bc] bg-[#4660bc] text-white"
                        : "border-[#9595db]/35 bg-white"
                    }`}
                  >
                    {translateLabel(variant.label, language)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#f2e6f7] p-3 text-sm text-[#5a4f7a]">
            {outOfStock && <p>{t.noStock}</p>}
            {!outOfStock && !hasValidPrice && <p>{language === "ko" ? "가격이 설정되지 않았습니다." : "Este producto no tiene precio configurado."}</p>}
            {!outOfStock && hasVariants && !selectedVariantData && <p>{t.selectVariant}</p>}
            {!outOfStock && selectedVariantData && <p>{t.variantStock}: {selectedVariantData.stock} {t.units}.</p>}
            {!outOfStock && !hasVariants && <p>{t.stockAvailable}: {product.stock} {t.units}.</p>}
          </div>

          {canAdd && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#5a4f7a]">{t.qty}:</span>
              <QuantitySelector
                qty={qty}
                max={maxQty}
                decreaseLabel={t.decreaseQty}
                increaseLabel={t.increaseQty}
                onChange={setQty}
              />
            </div>
          )}

          <Button
            className="w-full"
            disabled={!canAdd}
            onClick={() => {
              const variantId = selectedVariant ?? defaultVariantId ?? "";
              if (variantId) {
                addToCart(variantId, qty);
              }
            }}
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
