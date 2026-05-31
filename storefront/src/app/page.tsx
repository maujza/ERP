"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { SafeImage } from "@/components/safe-image";
import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { ProductQuickView } from "@/components/product-quick-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  hasPurchasablePrice,
  isJewelryProduct,
  mapMedusaProduct,
  navCategories,
  Product,
  translateLabel,
} from "@/lib/shop-data";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";
import { sdk, withStorePricingContext } from "@/lib/medusa";

const lookDotPositions = [
  { mobileClass: "left-[32%] top-[34%]", desktopClass: "md:left-[26%] md:top-[30%]" },
  { mobileClass: "left-[60%] top-[47%]", desktopClass: "md:left-[58%] md:top-[40%]" },
  { mobileClass: "left-[43%] top-[66%]", desktopClass: "md:left-[46%] md:top-[64%]" },
];

export default function HomePage() {
  const { language } = useLanguage();
  const { totalItems } = useCart();
  const [slideIndex, setSlideIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredLoadError, setFeaturedLoadError] = useState(false);

  useEffect(() => {
    sdk.store.product.list(withStorePricingContext({
      limit: 6,
      fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories",
    })).then(({ products }) => {
      setFeaturedProducts(
        products
          .map(mapMedusaProduct)
          .filter(hasPurchasablePrice)
          .filter(isJewelryProduct),
      );
    }).catch((err: unknown) => {
      console.error("[HomePage] Failed to load featured products", err);
      setFeaturedLoadError(true);
    });
  }, []);

  const t = language === "ko"
    ? {
        heroBadge: "도매 컬렉션",
        heroSlides: [
          {
            title: "바로 판매 가능한 큐레이션 컬렉션.",
            description: "빠른 회전, 도매 팩, 24/48시간 출고로 재고 공백을 줄입니다.",
            image:
              "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1400&q=80",
          },
          {
            title: "실제 마진 중심의 주간 신상품.",
            description: "베스트셀러와 시즌 드롭을 조합해 판매 속도와 객단가를 함께 높입니다.",
            image:
              "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80",
          },
          {
            title: "단순한 운영 흐름.",
            description: "카탈로그, 카트, 결제, 추적을 한 흐름으로 제공합니다.",
            image:
              "https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1400&q=80",
          },
        ],
        ctaMore: "더 보기",
        ctaSearch: "상품 검색",
        quickActions: [
          { title: "신상품", href: "/catalog?subcategory=Novedades" },
          { title: "베스트셀러", href: "/catalog?subcategory=Best%20Sellers" },
          { title: "주문 구성", href: "/catalog" },
          { title: "결제로 이동", href: "/checkout" },
        ],
        collections: "컬렉션",
        collection: "컬렉션",
        categories: "카테고리",
        brands: "브랜드",
        featured: "추천 상품",
        soldOut: "품절",
        addToCart: "카트 추가",
        shopLook: "룩으로 쇼핑",
        tapDots: "점 버튼을 눌러 상품 보기",
      }
    : {
        heroBadge: "Coleccion mayorista",
        heroSlides: [
          {
            title: "Colecciones curadas listas para vender.",
            description: "Rotacion rapida, pack mayorista y despacho en 24/48h para que tu tienda no se quede sin novedades.",
            image:
              "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1400&q=80",
          },
          {
            title: "Lanzamientos semanales con margen real.",
            description: "Seleccionamos best sellers y drops de temporada para combinar ticket promedio + velocidad de venta.",
            image:
              "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80",
          },
          {
            title: "Operacion comercial en modo simple.",
            description: "Catalogo, carrito, finalizar compra y seguimiento en un solo flujo para tu equipo.",
            image:
              "https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1400&q=80",
          },
        ],
        ctaMore: "Ver mas",
        ctaSearch: "Buscar productos",
        quickActions: [
          { title: "Novedades", href: "/catalog?subcategory=Novedades" },
          { title: "Best sellers", href: "/catalog?subcategory=Best%20Sellers" },
          { title: "Armar pedido", href: "/catalog" },
          { title: "Finalizar compra", href: "/checkout" },
        ],
        collections: "Colecciones",
        collection: "Coleccion",
        categories: "Categorias",
        brands: "Marcas",
        featured: "Productos destacados",
        soldOut: "AGOTADO",
        addToCart: "Agregar al carrito",
        shopLook: "Shop the look",
        tapDots: "Tap sobre cada punto",
      };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % t.heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [t.heroSlides.length]);


  return (
    <div className="relative isolate overflow-hidden bg-[#f6f5f2]">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-6 md:gap-10 md:px-6 md:py-10">
        {/* 1. Hero */}
        <section className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="order-1 space-y-4 p-5 md:p-8">
              <Badge variant="glow">{t.heroBadge}</Badge>
              <h1 className="text-3xl font-semibold leading-tight text-[#111111] md:text-5xl">
                {t.heroSlides[slideIndex].title}
              </h1>
              <p className="text-sm text-[#444444] md:text-base">{t.heroSlides[slideIndex].description}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/catalog">
                    {t.ctaMore}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/search?q=aros">{t.ctaSearch}</Link>
                </Button>
              </div>
              <div className="flex gap-2">
                {t.heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSlideIndex(idx)}
                    className={`h-2 rounded-full transition ${
                      idx === slideIndex ? "w-8 bg-[#111111]" : "w-4 bg-black/25"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="order-2 relative h-64 w-full md:h-full md:min-h-[420px]">
              <SafeImage
                src={t.heroSlides[slideIndex].image}
                alt={t.heroSlides[slideIndex].title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </div>
          </div>
        </section>

        {/* 2. Featured Products */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{t.featured}</Badge>
            <Link href="/catalog" className="text-sm font-semibold text-[#111111]">
              {t.ctaMore}
            </Link>
          </div>
          {featuredLoadError && (
            <p className="text-sm text-[#b00020]">
              {language === "ko" ? "상품을 불러올 수 없습니다." : "No pudimos cargar los productos."}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3">
            {featuredProducts.length === 0 && !featuredLoadError
              ? Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    language={language}
                    soldOutLabel={t.soldOut}
                    variant="featured"
                  />
                ))}
          </div>
        </section>

        {/* 3. Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          {t.quickActions
            .filter((action) => action.href !== "/checkout" || totalItems > 0)
            .map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-2xl border border-black/10 bg-white p-4 text-sm font-semibold text-[#111111]"
              >
                {action.title}
              </Link>
            ))}
        </section>

        {/* 4. Colecciones (merged categories scroll) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{t.collections}</Badge>
            <Link href="/catalog" className="text-sm font-semibold text-[#111111]">
              {t.ctaMore}
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {navCategories.slice(0, 6).map((category, idx) => {
              const accents = ["#4660bc", "#6c5baa", "#9595db", "#92c9ff", "#ffd7fb", "#f2e6f7"];
              const accent = accents[idx % accents.length];
              return (
                <Link
                  key={category}
                  href={`/catalog?subcategory=${encodeURIComponent(category)}`}
                  className="shrink-0 snap-start basis-[78%] overflow-hidden rounded-2xl border border-black/10 bg-white sm:basis-[45%] md:basis-[30%]"
                >
                  <div className="h-20 w-full" style={{ backgroundColor: accent }} />
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">{t.collection}</p>
                    <p className="mt-1 text-lg font-semibold text-[#111111]">{translateLabel(category, language)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. Shop the Look */}
        <section className="rounded-3xl border border-black/10 bg-white p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="outline">{t.shopLook}</Badge>
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.tapDots}</p>
          </div>
          <div className="relative mx-auto h-[360px] max-w-[780px] overflow-hidden rounded-2xl md:h-[520px]">
            <SafeImage
              src="https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1400&q=80"
              alt={t.shopLook}
              fill
              className="object-cover"
            />
            {lookDotPositions.map((pos, i) => {
              const product = featuredProducts[i];
              if (!product) return null;
              return (
                <ProductQuickView
                  key={product.id}
                  productId={product.id}
                  dotMode
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${pos.mobileClass} ${pos.desktopClass}`}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
