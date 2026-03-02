"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SafeImage } from "@/components/safe-image";
import { useLanguage } from "@/components/language-provider";
import { ProductQuickView } from "@/components/product-quick-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArs, getProductName, hasPurchasablePrice, isJewelryProduct, mapMedusaProduct, type Product } from "@/lib/shop-data";
import { sdk, withStorePricingContext } from "@/lib/medusa";

function SearchContent() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim().toLowerCase();

  const t = language === "ko"
    ? {
        home: "홈",
        search: "검색",
        results: "결과",
        searchFor: "검색어",
        typeToSearch: "검색어를 입력하세요",
        productsFound: "개 상품",
        noResults: "검색 결과가 없습니다.",
        goCollection: "전체 컬렉션 보기",
        soldOut: "품절",
        add: "추가",
      }
    : {
        home: "Home",
        search: "Búsqueda",
        results: "Resultados",
        searchFor: "Búsqueda",
        typeToSearch: "Escribí algo para buscar",
        productsFound: "productos encontrados.",
        noResults: "No encontramos resultados.",
        goCollection: "Ir a la colección completa",
        soldOut: "AGOTADO",
        add: "Agregar",
      };

  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    sdk.store.product.list(withStorePricingContext({
      q: rawQuery,
      limit: 50,
      fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories",
    })).then(({ products }) => {
      setResults(products.map(mapMedusaProduct).filter(hasPurchasablePrice).filter(isJewelryProduct));
    }).catch(() => {});
  }, [query, rawQuery]);

  return (
    <main className="mx-auto w-full max-w-[1300px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-4 text-sm text-[#666666]">
        <Link href="/" className="hover:text-[#111111]">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#111111]">{t.search}</span>
      </div>

      <section className="mb-5 rounded-3xl border border-black/10 bg-white p-4 md:p-6">
        <Badge variant="outline">{t.results}</Badge>
        <h1 className="mt-3 text-2xl font-semibold text-[#111111] md:text-3xl">
          {query ? `${t.searchFor}: "${rawQuery}"` : t.typeToSearch}
        </h1>
        <p className="mt-2 text-sm text-[#555555]">{results.length} {t.productsFound}</p>
      </section>

      {results.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-[#555555]">{t.noResults}</p>
          <Button asChild className="mt-4 w-full md:w-auto">
            <Link href="/catalog">{t.goCollection}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {results.map((product) => {
            const outOfStock = product.stock <= 0;
            return (
              <article key={product.id} className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
                <Link href={`/product/${product.id}`} className="block">
                  <div className="relative h-40 w-full">
                    <SafeImage src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-semibold">{getProductName(product, language)}</p>
                    <p className="text-sm font-semibold text-[#111111]">{formatArs(product.price, language)}</p>
                    {outOfStock && <Badge variant="glow">{t.soldOut}</Badge>}
                  </div>
                </Link>
                <div className="flex items-center gap-2 px-3 pb-3">
                  <ProductQuickView productId={product.id} className="h-10 shrink-0 px-3" />
                  {outOfStock ? (
                    <Button className="h-10 w-full" disabled>
                      {t.soldOut}
                    </Button>
                  ) : (
                    <Button asChild className="h-10 w-full">
                      <Link href={`/product/${product.id}`}>{t.add}</Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
