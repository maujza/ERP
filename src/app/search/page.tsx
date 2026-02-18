"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArs, getProductName, products } from "@/lib/shop-data";

export default function SearchPage() {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const [rawQuery, setRawQuery] = useState("");
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
        viewVariants: "옵션 보기",
        add: "추가",
      }
    : {
        home: "Home",
        search: "Busqueda",
        results: "Resultados",
        searchFor: "Busqueda",
        typeToSearch: "Escribe algo para buscar",
        productsFound: "productos encontrados.",
        noResults: "No encontramos resultados.",
        goCollection: "Ir a coleccion completa",
        soldOut: "AGOTADO",
        viewVariants: "Ver variantes",
        add: "Agregar",
      };

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    setRawQuery(qs.get("q") ?? "");
  }, []);

  const results = useMemo(() => {
    if (!query) return [];
    return products.filter(
      (product) =>
        getProductName(product, language).toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }, [language, query]);

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
              <article key={product.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <Link href={`/product/${product.id}`} className="block">
                  <div className="relative h-40 w-full">
                    <Image src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-semibold">{getProductName(product, language)}</p>
                    <p className="text-sm font-semibold text-[#111111]">{formatArs(product.price, language)}</p>
                    {outOfStock && <Badge variant="glow">{t.soldOut}</Badge>}
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => addToCart(product.id, product.variants?.[0]?.id)}
                    disabled={outOfStock || Boolean(product.variants && product.variants.length > 1)}
                  >
                    {outOfStock
                      ? t.soldOut
                      : product.variants && product.variants.length > 1
                        ? t.viewVariants
                        : t.add}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
