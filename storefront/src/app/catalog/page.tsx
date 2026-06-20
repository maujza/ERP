"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProductName,
  hasPurchasablePrice,
  mapMedusaProduct,
  translateLabel,
  type Product,
  type SortOption,
} from "@/lib/shop-data";
import { useCollections } from "@/hooks/use-collections";
import { sdk, withStorePricingContext } from "@/lib/medusa";

const PRICE_LOW_THRESHOLD = 20_000;
const PRICE_MID_THRESHOLD = 30_000;
const CATALOG_FETCH_BATCH_SIZE = 100;
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

const priceFilters = [
  { id: "all", label: "Todos" },
  { id: "low", label: `Hasta $${PRICE_LOW_THRESHOLD.toLocaleString("es-AR")}` },
  { id: "mid", label: `$${PRICE_LOW_THRESHOLD.toLocaleString("es-AR")} - $${PRICE_MID_THRESHOLD.toLocaleString("es-AR")}` },
  { id: "high", label: `Mas de $${PRICE_MID_THRESHOLD.toLocaleString("es-AR")}` },
] as const;

type PriceFilter = (typeof priceFilters)[number]["id"];

function byPrice(product: Product, filter: PriceFilter) {
  if (filter === "all") return true;
  if (filter === "low") return product.price <= PRICE_LOW_THRESHOLD;
  if (filter === "mid") return product.price > PRICE_LOW_THRESHOLD && product.price <= PRICE_MID_THRESHOLD;
  return product.price > PRICE_MID_THRESHOLD;
}

export default function CatalogPage() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

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
        perPage: "표시",
        searchPrefix: "검색",
        price: "가격",
        soldOut: "품절",
        add: "추가",
        noResults: "해당 필터의 상품이 없습니다",
        clearFilters: "필터 초기화",
        page: "페이지",
        of: "중",
        applyFilters: "필터 적용",
        searchPlaceholder: "후프, 키트, 진주...",
        category: "카테고리",
        prev: "이전",
        next: "다음",
        loadMore: "더 불러오기",
        loading: "불러오는 중...",
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
        perPage: "Ver",
        searchPrefix: "Buscar",
        price: "Precio",
        soldOut: "AGOTADO",
        add: "Agregar",
        noResults: "No hay productos con esos filtros",
        clearFilters: "Limpiar filtros",
        page: "Pagina",
        of: "de",
        applyFilters: "Aplicar filtros",
        searchPlaceholder: "Argollas, kits, perlas...",
        category: "Categoria",
        prev: "Prev",
        next: "Next",
        loading: "Cargando...",
      };

  const sortOptions = [
    { id: "recommended" as SortOption, label: language === "ko" ? "추천" : "Recomendados" },
    { id: "price_asc" as SortOption, label: language === "ko" ? "낮은 가격" : "Precio: menor" },
    { id: "price_desc" as SortOption, label: language === "ko" ? "높은 가격" : "Precio: mayor" },
  ];

  const { collections } = useCollections();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  // "" means "all collections"; otherwise holds the active collection handle.
  const [activeCollection, setActiveCollection] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAllProducts = async () => {
      setLoadingProducts(true);

      try {
        const loaded: Product[] = [];
        let currentOffset = 0;
        let totalCount = Number.POSITIVE_INFINITY;

        while (!cancelled && currentOffset < totalCount) {
          const { products, count } = await sdk.store.product.list(withStorePricingContext({
            limit: CATALOG_FETCH_BATCH_SIZE,
            offset: currentOffset,
            fields: "+variants.calculated_price,+variants.inventory_quantity,+metadata,+categories.id,+categories.name,+categories.handle,+collection.id,+collection.title,+collection.handle",
          }));

          const mapped = products
            .map(mapMedusaProduct)
            .filter(hasPurchasablePrice);

          loaded.push(...mapped);
          totalCount = count ?? loaded.length;
          currentOffset += products.length;

          if (products.length === 0) {
            break;
          }
        }

        if (!cancelled) {
          setAllProducts(loaded);
        }
      } catch {
        if (!cancelled) {
          setAllProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    loadAllProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(allProducts.map((product) => product.category))).filter(Boolean),
    [allProducts],
  );

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const collection = qs.get("collection");
    const category = qs.get("category");
    const rawPage = Number(qs.get("page") || "1");
    const rawPageSize = Number(qs.get("pageSize") || String(PAGE_SIZE_OPTIONS[0]));
    if (collection) {
      setActiveCollection(collection);
    }
    if (category) {
      setSelectedCategories([category]);
    }
    if (Number.isFinite(rawPage) && rawPage >= 1) {
      setPage(Math.floor(rawPage));
    }
    if (PAGE_SIZE_OPTIONS.includes(rawPageSize as (typeof PAGE_SIZE_OPTIONS)[number])) {
      setPageSize(rawPageSize as (typeof PAGE_SIZE_OPTIONS)[number]);
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const list = allProducts.filter((product) => {
      const collectionMatch =
        activeCollection === "" || product.collection?.handle === activeCollection;
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const priceMatch = byPrice(product, priceFilter);
      const searchMatch =
        normalizedSearch.length === 0 ||
        getProductName(product, language).toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch);

      return collectionMatch && categoryMatch && priceMatch && searchMatch;
    });

    if (sortBy === "price_asc") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price_desc") {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [allProducts, activeCollection, language, priceFilter, search, selectedCategories, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    if (currentPage > 1) {
      qs.set("page", String(currentPage));
    } else {
      qs.delete("page");
    }

    if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
      qs.set("pageSize", String(pageSize));
    } else {
      qs.delete("pageSize");
    }

    const nextQuery = qs.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [currentPage, pageSize, pathname, router]);

  const activeFilterCount =
    selectedCategories.length +
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
    setPriceFilter("all");
    setPage(1);
  };

  return (
    <div className="bg-[#f2e6f7] pb-24 md:pb-10">
      <main className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 md:py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-[#5a4f7a]">
          <Link href="/" className="hover:text-[#2a2148]">
            {t.home}
          </Link>
          <span>/</span>
          <span className="text-[#2a2148]">{t.collection}</span>
        </div>

        <section className="mb-4 rounded-3xl border border-[#9595db]/25 bg-white p-4 md:p-6">
          <Badge variant="outline">{t.wholesaleCollection}</Badge>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a2148] md:text-3xl">{t.title}</h1>
          <p className="mt-2 text-sm text-[#5a4f7a]">{t.desc}</p>
        </section>

        {collections.length > 0 && (
          <div className="no-scrollbar mb-4 overflow-x-auto">
            <div className="flex w-max min-w-full gap-2 pb-1">
              <button
                onClick={() => {
                  setActiveCollection("");
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
                  activeCollection === ""
                    ? "border-[#4660bc] bg-[#4660bc] text-white"
                    : "border-[#9595db]/35 bg-white text-[#2a2148]"
                }`}
              >
                {translateLabel("Todos", language)}
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setActiveCollection(collection.handle);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
                    activeCollection === collection.handle
                      ? "border-[#4660bc] bg-[#4660bc] text-white"
                      : "border-[#9595db]/35 bg-white text-[#2a2148]"
                  }`}
                >
                  {translateLabel(collection.title, language)}
                </button>
              ))}
            </div>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-[280px_1fr]">
          <aside className="hidden md:block">
            <FiltersPanel
              language={language}
              t={t}
              categories={categories}
              search={search}
              setSearch={setSearch}
              selectedCategories={selectedCategories}
              priceFilter={priceFilter}
              setPriceFilter={setPriceFilter}
              onToggleCategory={(category) => toggleInList(category, setSelectedCategories)}
              clearAll={clearAll}
            />
          </aside>

          <div className="space-y-4" ref={gridRef}>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#9595db]/25 bg-white p-3 md:justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#9595db]/35 px-3 py-2 text-sm md:hidden"
                >
                  <Filter className="h-4 w-4" />
                  {t.filters}
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#4660bc] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-[#5a4f7a]">
                  <span className="font-semibold text-[#2a2148]">{filteredProducts.length}</span> {t.results}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#5a4f7a]">{t.sortBy}</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="rounded-full border border-[#9595db]/35 bg-white px-3 py-2"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-[#5a4f7a]">{t.perPage}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setPage(1);
                  }}
                  className="rounded-full border border-[#9595db]/35 bg-white px-3 py-2"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
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
                {priceFilter !== "all" && (
                  <Tag
                    label={translateLabel(priceFilters.find((option) => option.id === priceFilter)?.label ?? t.price, language)}
                    onRemove={() => setPriceFilter("all")}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {allProducts.length === 0 && loadingProducts
                ? Array.from({ length: pageSize }).map((_, i) => <ProductCardSkeleton key={i} />)
                : paginated.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      language={language}
                      soldOutLabel={t.soldOut}
                    />
                  ))}
            </div>

            {paginated.length === 0 && (
              <Card className="border-[#9595db]/25 bg-white">
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

            <div className="flex items-center justify-between rounded-2xl border border-[#9595db]/25 bg-white p-3">
              <Button variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                {t.prev}
              </Button>
              <p className="text-sm text-[#5a4f7a]">
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
          className="fixed bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#4660bc] px-5 py-3 text-sm font-semibold text-white shadow-xl md:hidden"
        >
          <Filter className="h-4 w-4" />
          {t.filters}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#2a2148]">{activeFilterCount}</span>
          )}
        </button>

        <div
          className={`fixed inset-0 z-[70] bg-[#2a2148]/45 transition md:hidden ${
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
            <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full border border-[#9595db]/35 p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
          <FiltersPanel
            language={language}
            t={t}
            categories={categories}
            search={search}
            setSearch={setSearch}
            selectedCategories={selectedCategories}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            onToggleCategory={(category) => toggleInList(category, setSelectedCategories)}
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
      className="inline-flex items-center gap-1 rounded-full border border-[#9595db]/35 bg-white px-3 py-1 text-xs"
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
  search,
  setSearch,
  selectedCategories,
  priceFilter,
  setPriceFilter,
  onToggleCategory,
  clearAll,
}: {
  language: "es" | "ko";
  t: {
    filters: string;
    searchPrefix: string;
    searchPlaceholder: string;
    category: string;
    price: string;
    clearFilters: string;
  };
  categories: string[];
  search: string;
  setSearch: (value: string) => void;
  selectedCategories: string[];
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  onToggleCategory: (value: string) => void;
  clearAll: () => void;
}) {
  return (
    <Card className="border-[#9595db]/25 bg-white">
      <CardHeader>
        <CardTitle className="text-[#2a2148]">{t.filters}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a4f7a]">{t.searchPrefix}</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[#9595db]/35 px-3 py-2 text-sm outline-none"
            placeholder={t.searchPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a4f7a]">{t.category}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onToggleCategory(category)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedCategories.includes(category)
                    ? "border-[#4660bc] bg-[#4660bc] text-white"
                    : "border-[#9595db]/35 bg-white"
                }`}
              >
                {translateLabel(category, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a4f7a]">{t.price}</p>
          <div className="grid gap-2">
            {priceFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setPriceFilter(filter.id)}
                className={`rounded-2xl border px-3 py-2 text-left text-sm ${
                  priceFilter === filter.id
                    ? "border-[#4660bc] bg-[#4660bc] text-white"
                    : "border-[#9595db]/35 bg-white"
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
