"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Eye, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sdk, withStorePricingContext } from "@/lib/medusa";
import { formatArs, mapMedusaProduct, type Product } from "@/lib/shop-data";

type ProductDetailState = {
  product: Product;
  dimensions: string;
};

type RawProduct = {
  width?: number | null;
  height?: number | null;
  length?: number | null;
  weight?: number | null;
  metadata?: Record<string, unknown> | null;
};

export function ProductQuickView({ productId, className }: { productId: string; className?: string }) {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetailState | null>(null);

  const t = useMemo(
    () =>
      language === "ko"
        ? {
            quickView: "빠른 보기",
            openQuickView: "보기",
            loading: "상품 정보를 불러오는 중...",
            close: "닫기",
            detailsUnavailable: "상품 정보를 불러올 수 없습니다.",
            dimensions: "크기",
            variants: "옵션",
            noStock: "상품 재고가 없습니다.",
            selectVariant: "구매를 위해 옵션을 선택하세요.",
            variantStock: "옵션 재고",
            stockAvailable: "재고",
            units: "개",
            selectVariantBtn: "옵션 선택",
            qty: "수량",
            decreaseQty: "수량 줄이기",
            increaseQty: "수량 늘리기",
            outOfStockVariant: "선택한 옵션은 품절입니다.",
            add: "카트 추가",
            soldOut: "품절",
            addPending: "추가 중...",
          }
        : {
            quickView: "Vista rapida",
            openQuickView: "Ver",
            loading: "Cargando detalles del producto...",
            close: "Cerrar",
            detailsUnavailable: "No se pudieron cargar los detalles del producto.",
            dimensions: "Dimensiones",
            variants: "Variantes",
            noStock: "Producto sin stock.",
            selectVariant: "Selecciona una variante para habilitar compra.",
            variantStock: "Stock variante",
            stockAvailable: "Stock disponible",
            units: "unidades",
            selectVariantBtn: "Selecciona variante",
            qty: "Cantidad",
            decreaseQty: "Reducir cantidad",
            increaseQty: "Aumentar cantidad",
            outOfStockVariant: "La variante seleccionada no tiene stock.",
            add: "Agregar al carrito",
            soldOut: "AGOTADO",
            addPending: "Agregando...",
          },
    [language],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const openQuickView = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setQty(1);
    setSelectedVariant(undefined);
    setError(null);

    try {
      const { product } = await sdk.store.product.retrieve(
        productId,
        withStorePricingContext({
          fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories",
        }),
      );
      const mapped = mapMedusaProduct(product);
      setDetail({
        product: mapped,
        dimensions: formatDimensions(product as RawProduct, language),
      });
    } catch {
      setError(t.detailsUnavailable);
    } finally {
      setIsLoading(false);
    }
  };

  const closeQuickView = () => {
    setIsOpen(false);
  };

  const addCurrentProductToCart = async () => {
    if (!detail) return;
    const variantId = selectedVariant ?? detail.product.variants?.[0]?.id ?? "";
    if (!variantId) return;

    setIsAdding(true);
    try {
      await addToCart(variantId, qty);
      setIsOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const hasVariants = Boolean(detail?.product.variants && detail.product.variants.length > 1);
  const outOfStock = detail ? detail.product.stock <= 0 : true;
  const hasValidPrice = detail ? detail.product.price > 0 : false;
  const selectedVariantData = detail?.product.variants?.find((variant) => variant.id === selectedVariant);
  const missingVariant = hasVariants && !selectedVariant;
  const selectedVariantOutOfStock = hasVariants && (selectedVariantData?.stock ?? 1) <= 0;
  const canAdd = Boolean(detail && !outOfStock && hasValidPrice && !missingVariant && !selectedVariantOutOfStock);
  const maxQty = selectedVariantData ? selectedVariantData.stock : detail?.product.stock ?? 1;

  const modal = (
    <div
      className={`fixed inset-0 z-[120] transition ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label={t.close}
        onClick={closeQuickView}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white p-5 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={closeQuickView}
          aria-label={t.close}
          className="absolute -left-5 top-6 hidden h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#111111] shadow-lg md:inline-flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#666666]">{t.quickView}</p>
          <button
            type="button"
            onClick={closeQuickView}
            aria-label={t.close}
            className="rounded-full border border-black/15 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && <p className="text-sm text-[#555555]">{t.loading}</p>}

        {!isLoading && error && <p className="text-sm text-[#555555]">{error}</p>}

        {!isLoading && !error && detail && (
          <div className="flex h-[calc(100%-40px)] flex-col gap-4">
            <div className="relative mb-4 h-64 w-full overflow-hidden rounded-2xl bg-[#f2f2f2]">
              <SafeImage src={detail.product.image} alt={detail.product.name} fill className="object-cover" />
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              <h3 className="text-xl font-semibold text-[#111111]">{detail.product.name}</h3>
              {detail.product.description && (
                <p className="text-sm text-[#555555]">{detail.product.description}</p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <p className="text-lg font-semibold text-[#111111]">{formatArs(detail.product.price, language)}</p>
                {detail.product.originalPrice && detail.product.originalPrice > detail.product.price && (
                  <>
                    <p className="text-sm text-[#777777] line-through">
                      {formatArs(detail.product.originalPrice, language)}
                    </p>
                    <span className="rounded-full border border-black/15 px-2 py-0.5 text-xs font-semibold text-[#111111]">
                      -
                      {Math.round(
                        ((detail.product.originalPrice - detail.product.price) / detail.product.originalPrice) * 100,
                      )}
                      %
                    </span>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">{t.dimensions}</p>
                <p className="mt-1 text-sm text-[#222222]">{detail.dimensions}</p>
              </div>
              {hasVariants && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.variants}</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.product.variants?.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          setSelectedVariant(variant.id);
                          setQty(1);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          selectedVariant === variant.id
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-black/15 bg-white"
                        }`}
                      >
                        {variant.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl bg-[#f5f5f5] p-3 text-sm text-[#555555]">
                {outOfStock && <p>{t.noStock}</p>}
                {!outOfStock && hasVariants && !selectedVariantData && <p>{t.selectVariant}</p>}
                {!outOfStock && selectedVariantOutOfStock && <p>{t.outOfStockVariant}</p>}
                {!outOfStock && selectedVariantData && <p>{t.variantStock}: {selectedVariantData.stock} {t.units}.</p>}
                {!outOfStock && !hasVariants && <p>{t.stockAvailable}: {detail.product.stock} {t.units}.</p>}
              </div>
              {canAdd && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#555555]">{t.qty}:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty((current) => Math.max(1, current - 1))}
                      className="h-9 w-9 rounded-full border border-black/20 text-lg font-semibold leading-none"
                      aria-label={t.decreaseQty}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={qty}
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(v)) setQty(Math.min(maxQty, Math.max(1, v)));
                      }}
                      onBlur={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        if (Number.isNaN(v) || v < 1) setQty(1);
                      }}
                      className="h-9 w-14 rounded-xl border border-black/20 px-2 text-center text-sm font-semibold outline-none focus:border-black/40"
                    />
                    <button
                      onClick={() => setQty((current) => Math.min(maxQty, current + 1))}
                      className="h-9 w-9 rounded-full border border-black/20 text-lg font-semibold leading-none"
                      aria-label={t.increaseQty}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="mt-auto w-full"
              disabled={!canAdd || isAdding}
              onClick={addCurrentProductToCart}
            >
              {outOfStock || selectedVariantOutOfStock
                ? t.soldOut
                : missingVariant
                  ? t.selectVariantBtn
                  : isAdding
                    ? t.addPending
                    : t.add}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={openQuickView}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/20 bg-white px-3 text-sm font-semibold text-[#111111] transition hover:bg-[#f7f7f7]",
          className,
        )}
        aria-label={t.quickView}
      >
        <Eye className="h-4 w-4" />
        <span>{t.openQuickView}</span>
      </button>
      {isMounted ? createPortal(modal, document.body) : null}
    </>
  );
}

function formatDimensions(product: RawProduct, language: "es" | "ko") {
  const metadata = product.metadata ?? {};
  const metadataDimensions = metadata.dimensions;

  if (typeof metadataDimensions === "string" && metadataDimensions.trim()) {
    return metadataDimensions;
  }

  if (
    metadataDimensions &&
    typeof metadataDimensions === "object" &&
    !Array.isArray(metadataDimensions)
  ) {
    const dims = metadataDimensions as Record<string, unknown>;
    const w = numberOrNull(dims.width);
    const h = numberOrNull(dims.height);
    const l = numberOrNull(dims.length);
    const unit = typeof dims.unit === "string" && dims.unit.trim() ? dims.unit : "mm";
    const built = buildDimensionString(w, h, l, unit, language);
    if (built) return built;
  }

  const width = numberOrNull(product.width);
  const height = numberOrNull(product.height);
  const length = numberOrNull(product.length);
  const built = buildDimensionString(width, height, length, "mm", language);
  if (built) return built;

  const fallback = language === "ko" ? "치수 정보 없음" : "Sin dimensiones especificadas";
  return fallback;
}

function buildDimensionString(
  width: number | null,
  height: number | null,
  length: number | null,
  unit: string,
  language: "es" | "ko",
) {
  const values = [width, height, length].filter((value): value is number => typeof value === "number");
  if (values.length !== 3) return null;
  if (language === "ko") {
    return `가로 ${width} x 세로 ${height} x 길이 ${length} ${unit}`;
  }
  return `Ancho ${width} x Alto ${height} x Largo ${length} ${unit}`;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}
