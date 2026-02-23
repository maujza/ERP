"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
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

export function ProductQuickView({ productId }: { productId: string }) {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetailState | null>(null);

  const t = useMemo(
    () =>
      language === "ko"
        ? {
            quickView: "빠른 보기",
            loading: "상품 정보를 불러오는 중...",
            close: "닫기",
            detailsUnavailable: "상품 정보를 불러올 수 없습니다.",
            dimensions: "크기",
            add: "카트 추가",
            soldOut: "품절",
            addPending: "추가 중...",
          }
        : {
            quickView: "Vista rapida",
            loading: "Cargando detalles del producto...",
            close: "Cerrar",
            detailsUnavailable: "No se pudieron cargar los detalles del producto.",
            dimensions: "Dimensiones",
            add: "Agregar al carrito",
            soldOut: "AGOTADO",
            addPending: "Agregando...",
          },
    [language],
  );

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
    const variant = detail.product.variants?.find((item) => item.stock > 0) ?? detail.product.variants?.[0];
    if (!variant) return;

    setIsAdding(true);
    try {
      await addToCart(variant.id, 1, { openDrawer: true });
      setIsOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const outOfStock = detail ? detail.product.stock <= 0 : true;

  return (
    <>
      <button
        type="button"
        onClick={openQuickView}
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#111111] shadow-md transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        aria-label={t.quickView}
      >
        <Eye className="h-4 w-4" />
      </button>

      <div
        className={`fixed inset-0 z-[95] transition ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label={t.close}
          onClick={closeQuickView}
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white p-5 shadow-2xl transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
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
            <div className="flex h-[calc(100%-40px)] flex-col">
              <div className="relative mb-4 h-64 w-full overflow-hidden rounded-2xl bg-[#f2f2f2]">
                <SafeImage src={detail.product.image} alt={detail.product.name} fill className="object-cover" />
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#111111]">{detail.product.name}</h3>
                <p className="text-lg font-semibold text-[#111111]">{formatArs(detail.product.price, language)}</p>
                <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">{t.dimensions}</p>
                  <p className="mt-1 text-sm text-[#222222]">{detail.dimensions}</p>
                </div>
              </div>

              <Button
                className="mt-auto w-full"
                disabled={outOfStock || isAdding}
                onClick={addCurrentProductToCart}
              >
                {outOfStock ? t.soldOut : isAdding ? t.addPending : t.add}
              </Button>
            </div>
          )}
        </aside>
      </div>
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
