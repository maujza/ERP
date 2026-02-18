"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  brands,
  formatArs,
  getProductDescription,
  getProductName,
  navCategories,
  products,
  translateLabel,
} from "@/lib/shop-data";

const lookDots = [
  {
    productId: "siena-pack",
    mobileClass: "left-[32%] top-[34%]",
    desktopClass: "md:left-[26%] md:top-[30%]",
  },
  {
    productId: "layering-aura",
    mobileClass: "left-[60%] top-[47%]",
    desktopClass: "md:left-[58%] md:top-[40%]",
  },
  {
    productId: "capri-pulseras",
    mobileClass: "left-[43%] top-[66%]",
    desktopClass: "md:left-[46%] md:top-[64%]",
  },
];

export default function HomePage() {
  const { language } = useLanguage();
  const [slideIndex, setSlideIndex] = useState(0);
  const { addToCart } = useCart();

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
        variants: "옵션 보기",
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
            description: "Catalogo, carrito, checkout y seguimiento en un solo flujo para tu equipo.",
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
          { title: "Ir a checkout", href: "/checkout" },
        ],
        collections: "Colecciones",
        collection: "Coleccion",
        categories: "Categorias",
        brands: "Marcas",
        featured: "Productos destacados",
        soldOut: "AGOTADO",
        variants: "Ver variantes",
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

  const featuredProducts = useMemo(() => products.slice(0, 6), []);

  return (
    <div className="relative isolate overflow-hidden bg-[#f7f7f7]">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-6 md:gap-10 md:px-6 md:py-10">
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
              <Image
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

        <section className="grid grid-cols-2 gap-3">
          {t.quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="rounded-2xl border border-black/10 bg-white p-4 text-sm font-semibold text-[#111111]"
            >
              {action.title}
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{t.collections}</Badge>
            <Link href="/catalog" className="text-sm font-semibold text-[#111111]">
              {t.ctaMore}
            </Link>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {navCategories.slice(0, 6).map((category) => (
              <Link
                key={category}
                href={`/catalog?subcategory=${encodeURIComponent(category)}`}
                className="min-w-0 snap-start basis-[78%] rounded-2xl border border-black/10 bg-white p-4 sm:basis-[45%] md:basis-[30%]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">{t.collection}</p>
                <p className="mt-2 text-lg font-semibold text-[#111111]">{translateLabel(category, language)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Badge variant="outline">{t.categories}</Badge>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {["Aros", "Collares", "Pulseras", "Sets", "Kits"].map((category) => (
              <Link
                key={category}
                href={`/catalog?category=${encodeURIComponent(category)}`}
                className="snap-start basis-[78%] rounded-2xl border border-black/10 bg-white p-4 sm:basis-[45%] md:basis-[30%]"
              >
                <p className="text-sm font-semibold">{translateLabel(category, language)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Badge variant="outline">{t.brands}</Badge>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {brands.map((brand) => (
              <div
                key={brand}
                className="snap-start basis-[78%] rounded-2xl border border-black/10 bg-white p-4 text-sm font-medium sm:basis-[45%] md:basis-[30%]"
              >
                {translateLabel(brand, language)}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{t.featured}</Badge>
            <Link href="/catalog" className="text-sm font-semibold text-[#111111]">
              {t.ctaMore}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {featuredProducts.map((product) => {
              const isDiscounted = Boolean(product.originalPrice && product.originalPrice > product.price);
              const outOfStock = product.stock <= 0;
              const hasVariants = Boolean(product.variants && product.variants.length > 1);

              return (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Link href={`/product/${product.id}`} className="block">
                    <div className="relative h-40 w-full">
                      <Image src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
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
                              -
                              {Math.round(
                                (((product.originalPrice ?? product.price) - product.price) /
                                  (product.originalPrice ?? product.price)) *
                                  100,
                              )}
                              %
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold text-[#111111]">{formatArs(product.price, language)}</span>
                        )}
                      </div>
                      {outOfStock && <Badge variant="outline">{t.soldOut}</Badge>}
                      {hasVariants && !outOfStock && (
                        <p className="text-xs font-medium text-[#666666]">{t.variants}</p>
                      )}
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => addToCart(product.id, product.variants?.[0]?.id)}
                      disabled={outOfStock || hasVariants}
                    >
                      {outOfStock ? t.soldOut : hasVariants ? t.variants : t.addToCart}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="outline">{t.shopLook}</Badge>
            <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.tapDots}</p>
          </div>
          <div className="relative mx-auto h-[360px] max-w-[780px] overflow-hidden rounded-2xl md:h-[520px]">
            <Image
              src="https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1400&q=80"
              alt={t.shopLook}
              fill
              className="object-cover"
            />
            {lookDots.map((dot) => (
              <Link
                key={dot.productId}
                href={`/product/${dot.productId}`}
                className={`absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#111111] ${dot.mobileClass} ${dot.desktopClass}`}
                aria-label={`${t.ctaMore} ${dot.productId}`}
              >
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
