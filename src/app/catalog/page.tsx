"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/components/cart-provider";
import {
  formatArs,
  getProductName,
  products,
  subcategories,
  translateLabel,
  type Product,
  type SortOption,
} from "@/lib/shop-data";

const priceFilters = [
  { id: "all", label: "Todos" },
  { id: "low", label: "Hasta $20.000" },
  { id: "mid", label: "$20.000 - $30.000" },
  { id: "high", label: "Mas de $30.000" },
] as const;

type PriceFilter = (typeof priceFilters)[number]["id"];

function byPrice(product: Product, filter: PriceFilter) {
  if (filter === "all") return true;
  if (filter === "low") return product.price <= 20000;
  if (filter === "mid") return product.price > 20000 && product.price <= 30000;
  return product.price > 30000;
}

export default function CatalogPage() {
  const { language } = useLanguage();
  const { addToCart } = useCart();

  const t = language === "ko"
    ? {
        home: "홈",
        collection: "컬렉션",
        wholesaleCollection: "도매 컬렉션",
        title: "상품을 선택하고 주문을 구성하세요",
        desc: "누적 필터 + 실시간 정렬. 페이지 새로고침 없이 동작합니다.",
        filters: "필터",
        results: "결과",
        sortBy: "정렬",
        searchPrefix: "검색",
        price: "가격",
        viewVariants: "옵션 보기",
        soldOut: "품절",
        add: "추가",
        noResults: "해당 필터의 상품이 없습니다",
        clearFilters: "필터 초기화",
        page: "페이지",
        of: "중",
        applyFilters: "필터 적용",
        searchPlaceholder: "후프, 키트, 진주...",
        category: "카테고리",
        brand: "브랜드",
        prev: "이전",
        next: "다음",
      }
    : {
        home: "Home",
        collection: "Coleccion",
        wholesaleCollection: "Coleccion mayorista",
        title: "Selecciona productos y arma tu pedido",
        desc: "Filtros acumulativos + orden en tiempo real. Todo sin recargar la pagina.",
        filters: "Filtros",
        results: "resultados",
        sortBy: "Ordenar por",
        searchPrefix: "Buscar",
        price: "Precio",
        viewVariants: "Ver variantes",
        soldOut: "AGOTADO",
        add: "Agregar",
        noResults: "No hay productos con esos filtros",
        clearFilters: "Limpiar filtros",
        page: "Pagina",
        of: "de",
        applyFilters: "Aplicar filtros",
        searchPlaceholder: "Argollas, kits, perlas...",
        category: "Categoria",
        brand: "Marca",
        prev: "Prev",
        next: "Next",
      };

  const sortOptions = [
    { id: "recommended" as SortOption, label: language === "ko" ? "추천" : "Recomendados" },
    { id: "price_asc" as SortOption, label: language === "ko" ? "낮은 가격" : "Precio: menor" },
    { id: "price_desc" as SortOption, label: language === "ko" ? "높은 가격" : "Precio: mayor" },
  ];

  const [activeSubcategory, setActiveSubcategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [],
  );
  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))),
    [],
  );

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const subcategory = qs.get("subcategory");
    const category = qs.get("category");
    if (subcategory && subcategories.includes(subcategory as (typeof subcategories)[number])) {
      setActiveSubcategory(subcategory);
    }
    if (category) {
      setSelectedCategories([category]);
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const list = products.filter((product) => {
      const subcategoryMatch =
        activeSubcategory === "Todos" || product.subcategory === activeSubcategory;
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const priceMatch = byPrice(product, priceFilter);
      const searchMatch =
        normalizedSearch.length === 0 ||
        getProductName(product, language).toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch);

      return subcategoryMatch && categoryMatch && brandMatch && priceMatch && searchMatch;
    });

    if (sortBy === "price_asc") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price_desc") {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [activeSubcategory, language, priceFilter, search, selectedBrands, selectedCategories, sortBy]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (priceFilter === "all" ? 0 : 1) +
    (search.trim() ? 1 : 0);

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(totalPages, Math.max(1, nextPage));
    setPage(safePage);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleInList = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceFilter("all");
    setPage(1);
  };

  return (
    <div className="bg-[#f1f1f1] pb-24 md:pb-10">
      <main className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 md:py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-[#666666]">
          <Link href="/" className="hover:text-[#111111]">
            {t.home}
          </Link>
          <span>/</span>
          <span className="text-[#111111]">{t.collection}</span>
        </div>

        <section className="mb-4 rounded-3xl border border-black/10 bg-white p-4 md:p-6">
          <Badge variant="outline">{t.wholesaleCollection}</Badge>
          <h1 className="mt-3 text-2xl font-semibold text-[#111111] md:text-3xl">{t.title}</h1>
          <p className="mt-2 text-sm text-[#555555]">{t.desc}</p>
        </section>

        <div className="mb-4 overflow-x-auto">
          <div className="flex w-max min-w-full gap-2 pb-1">
            {subcategories.map((subcategory) => (
              <button
                key={subcategory}
                onClick={() => {
                  setActiveSubcategory(subcategory);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
                  activeSubcategory === subcategory
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/15 bg-white text-[#333333]"
                }`}
              >
                {translateLabel(subcategory, language)}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-[280px_1fr]">
          <aside className="hidden md:block">
            <FiltersPanel
              language={language}
              t={t}
              categories={categories}
              brands={brands}
              search={search}
              setSearch={setSearch}
              selectedCategories={selectedCategories}
              selectedBrands={selectedBrands}
              priceFilter={priceFilter}
              setPriceFilter={setPriceFilter}
              onToggleCategory={(category) => toggleInList(category, setSelectedCategories)}
              onToggleBrand={(brand) => toggleInList(brand, setSelectedBrands)}
              clearAll={clearAll}
            />
          </aside>

          <div className="space-y-4" ref={gridRef}>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white p-3 md:justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/15 px-3 py-2 text-sm md:hidden"
                >
                  <Filter className="h-4 w-4" />
                  {t.filters}
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#111111] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-[#666666]">
                  <span className="font-semibold text-[#111111]">{filteredProducts.length}</span> {t.results}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#666666]">{t.sortBy}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-full border border-black/15 bg-white px-3 py-2"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {search.trim() && (
                  <Tag label={`${t.searchPrefix}: ${search}`} onRemove={() => setSearch("")} />
                )}
                {selectedCategories.map((category) => (
                  <Tag
                    key={category}
                    label={translateLabel(category, language)}
                    onRemove={() => setSelectedCategories((prev) => prev.filter((item) => item !== category))}
                  />
                ))}
                {selectedBrands.map((brand) => (
                  <Tag
                    key={brand}
                    label={translateLabel(brand, language)}
                    onRemove={() => setSelectedBrands((prev) => prev.filter((item) => item !== brand))}
                  />
                ))}
                {priceFilter !== "all" && (
                  <Tag
                    label={translateLabel(priceFilters.find((option) => option.id === priceFilter)?.label ?? t.price, language)}
                    onRemove={() => setPriceFilter("all")}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {paginated.map((product) => {
                const isDiscounted = Boolean(product.originalPrice && product.originalPrice > product.price);
                const outOfStock = product.stock <= 0;
                const hasVariants = Boolean(product.variants && product.variants.length > 1);
                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                    <Link href={`/product/${product.id}`} className="block">
                      <div className="relative h-44 w-full">
                        <Image src={product.image} alt={getProductName(product, language)} fill className="object-cover" />
                        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="bg-white/90">
                            {translateLabel(product.category, language)}
                          </Badge>
                          {outOfStock && <Badge variant="glow">{t.soldOut}</Badge>}
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-[#111111]">{getProductName(product, language)}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-[#111111]">{formatArs(product.price, language)}</span>
                          {isDiscounted && (
                            <>
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
                          )}
                        </div>
                        {hasVariants && !outOfStock && (
                          <p className="text-xs font-medium text-[#666666]">{t.viewVariants}</p>
                        )}
                      </div>
                    </Link>
                    <div className="px-3 pb-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={outOfStock || hasVariants}
                        onClick={() => addToCart(product.id, product.variants?.[0]?.id)}
                      >
                        {outOfStock ? t.soldOut : hasVariants ? t.viewVariants : t.add}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {paginated.length === 0 && (
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle>{t.noResults}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={clearAll}>
                    {t.clearFilters}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-3">
              <Button variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                {t.prev}
              </Button>
              <p className="text-sm text-[#555555]">
                {t.page} {currentPage} {t.of} {totalPages}
              </p>
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                {t.next}
              </Button>
            </div>
          </div>
        </section>

        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white shadow-xl md:hidden"
        >
          <Filter className="h-4 w-4" />
          {t.filters}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#111111]">{activeFilterCount}</span>
          )}
        </button>

        <div
          className={`fixed inset-0 z-[70] bg-black/45 transition md:hidden ${
            mobileFiltersOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileFiltersOpen(false)}
        />
        <aside
          className={`fixed bottom-0 left-0 right-0 z-[72] max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-4 transition-transform md:hidden ${
            mobileFiltersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">{t.filters}</p>
            <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full border border-black/15 p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
          <FiltersPanel
            language={language}
            t={t}
            categories={categories}
            brands={brands}
            search={search}
            setSearch={setSearch}
            selectedCategories={selectedCategories}
            selectedBrands={selectedBrands}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            onToggleCategory={(category) => toggleInList(category, setSelectedCategories)}
            onToggleBrand={(brand) => toggleInList(brand, setSelectedBrands)}
            clearAll={clearAll}
          />
          <Button className="mt-4 w-full" onClick={() => setMobileFiltersOpen(false)}>
            {t.applyFilters}
          </Button>
        </aside>
      </main>
    </div>
  );
}

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-3 py-1 text-xs"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

function FiltersPanel({
  language,
  t,
  categories,
  brands,
  search,
  setSearch,
  selectedCategories,
  selectedBrands,
  priceFilter,
  setPriceFilter,
  onToggleCategory,
  onToggleBrand,
  clearAll,
}: {
  language: "es" | "ko";
  t: {
    filters: string;
    searchPrefix: string;
    searchPlaceholder: string;
    category: string;
    brand: string;
    price: string;
    clearFilters: string;
  };
  categories: string[];
  brands: string[];
  search: string;
  setSearch: (value: string) => void;
  selectedCategories: string[];
  selectedBrands: string[];
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  clearAll: () => void;
}) {
  return (
    <Card className="border-black/10 bg-white">
      <CardHeader>
        <CardTitle className="text-[#111111]">{t.filters}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.searchPrefix}</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-black/15 px-3 py-2 text-sm outline-none"
            placeholder={t.searchPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.category}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onToggleCategory(category)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedCategories.includes(category)
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/15 bg-white"
                }`}
              >
                {translateLabel(category, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.brand}</p>
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => onToggleBrand(brand)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedBrands.includes(brand)
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/15 bg-white"
                }`}
              >
                {translateLabel(brand, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#666666]">{t.price}</p>
          <div className="grid gap-2">
            {priceFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setPriceFilter(filter.id)}
                className={`rounded-2xl border px-3 py-2 text-left text-sm ${
                  priceFilter === filter.id
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/15 bg-white"
                }`}
              >
                {translateLabel(filter.label, language)}
              </button>
            ))}
          </div>
        </div>

        <Button variant="ghost" className="w-full" onClick={clearAll}>
          {t.clearFilters}
        </Button>
      </CardContent>
    </Card>
  );
}
