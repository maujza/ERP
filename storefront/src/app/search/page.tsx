"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasPurchasablePrice, isJewelryProduct, mapMedusaProduct, type Product } from "@/lib/shop-data";
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
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setSearchError(false);
      return;
    }
    sdk.store.product.list(withStorePricingContext({
      q: rawQuery,
      limit: 50,
      fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories",
    })).then(({ products }) => {
      setResults(products.map(mapMedusaProduct).filter(hasPurchasablePrice).filter(isJewelryProduct));
      setSearchError(false);
    }).catch((err: unknown) => {
      console.error("[SearchPage] Failed to fetch search results", err);
      setSearchError(true);
    });
  }, [query, rawQuery]);

  return (
    <main className="mx-auto w-full max-w-[1300px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-4 text-sm text-[#5a4f7a]">
        <Link href="/" className="hover:text-[#2a2148]">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#2a2148]">{t.search}</span>
      </div>

      <section className="mb-5 rounded-3xl border border-[#9595db]/25 bg-white p-4 md:p-6">
        <Badge variant="outline">{t.results}</Badge>
        <h1 className="mt-3 text-2xl font-semibold text-[#2a2148] md:text-3xl">
          {query ? `${t.searchFor}: "${rawQuery}"` : t.typeToSearch}
        </h1>
        <p className="mt-2 text-sm text-[#5a4f7a]">{results.length} {t.productsFound}</p>
      </section>

      {searchError && (
        <Card className="p-6">
          <p className="text-sm text-[#b00020]">
            {language === "ko" ? "검색 중 오류가 발생했습니다." : "Ocurrió un error al buscar. Intenta de nuevo."}
          </p>
        </Card>
      )}
      {!searchError && results.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-[#5a4f7a]">{t.noResults}</p>
          <Button asChild className="mt-4 w-full md:w-auto">
            <Link href="/catalog">{t.goCollection}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-4">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              language={language}
              soldOutLabel={t.soldOut}
            />
          ))}
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
