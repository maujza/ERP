"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, Search, ShoppingBag, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  pack: string;
  stock: string;
  tags: string[];
  image: string;
};

const catalogContent = {
  es: {
    heroBadge: "Catálogo mayorista",
    heroTitle: "Seleccioná packs, filtrá por categoría y armá tu carrito mayorista.",
    heroDescription:
      "Todos los precios incluyen packaging listo para exhibir y etiquetas con precio sugerido. Coordinamos envíos a todo el país en 24/72 horas.",
    backHome: "Volver al home",
    downloadList: "Descargar lista completa",
    filtersTitle: "Filtros",
    filtersDesc: "Ajustá la vista según tus necesidades.",
    searchLabel: "Buscar",
    searchPlaceholder: "Argollas, kits, perlas...",
    categoriesLabel: "Categorías",
    priceLabel: "Precio",
    clearFilters: "Limpiar filtros",
    allCategories: "Todas las categorías",
    resultsLabel: "resultados",
    addButton: "Añadir",
    nextStepsTitle: "¿Cómo seguimos?",
    nextStepsDesc:
      "Sumá productos al carrito y luego envianos el listado por WhatsApp o email para confirmar stock y envío.",
    nextStepP1:
      "Cuando confirmemos tu orden enviamos un link de pago o factura electrónica. El pedido se arma en 24/48h y despachamos con tu logística habitual o la nuestra.",
    nextStepP2:
      "Si necesitás sugerencias de mix, escribinos y armamos un carrito pre-curado según tu ticket promedio, geografía y tipo de negocio.",
    cartTitle: "Carrito mayorista",
    cartEmptySummary: "Aún no agregaste productos.",
    cartFilledSummary: "referencias seleccionadas.",
    cartEmptyHint:
      "Seleccioná los packs que quieras cotizar y aparecerán acá para enviarlos al equipo comercial.",
    subtotal: "Subtotal estimado",
    requestOrder: "Solicitar pedido",
    sendWhatsapp: "Enviar por WhatsApp",
    units: "uds",
    emailSubject: "Pedido mayorista",
    emailIntro: "Hola Aurelia, quiero confirmar estos packs:",
    whatsappIntro: "Hola, quiero pedir:",
    emailSubtotal: "Subtotal estimado",
    priceFilters: [
      { id: "low", label: "Hasta $20.000", range: [0, 20000] as [number, number] },
      { id: "mid", label: "$20.000 - $30.000", range: [20000, 30000] as [number, number] },
      { id: "high", label: "Más de $30.000", range: [30000, Infinity] as [number, number] },
    ],
    products: [
      {
        id: "siena-pack",
        name: "Pack Argollas Siena",
        description: "Micro circonias, baño oro 18K y tres diámetros combinables.",
        category: "Aros",
        price: 18900,
        pack: "Pack x12 · $18.900 + IVA",
        stock: "En stock",
        tags: ["Níquel free", "Backing card incluida"],
        image:
          "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "layering-aura",
        name: "Layering Aura",
        description: "Stack de 5 collares con cierres magnéticos y largos escalonados.",
        category: "Collares",
        price: 24500,
        pack: "Pack x8 · $24.500 + IVA",
        stock: "Stock bajo",
        tags: ["Cierres imantados", "Tarjeta guía"],
        image:
          "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "capri-pulseras",
        name: "Mix Pulseras Capri",
        description: "Acero 316L pulido, esmaltes pasteles y ajuste deslizable.",
        category: "Pulseras",
        price: 21700,
        pack: "Pack x18 · $21.700 + IVA",
        stock: "En stock",
        tags: ["Esmalte italiano", "Incluye display"],
        image:
          "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "statement-fiesta",
        name: "Statement Éclair",
        description: "Aros bold con cristales premium y terminación pavé luminosa.",
        category: "Aros",
        price: 16500,
        pack: "Pack x10 · $16.500 + IVA",
        stock: "En stock",
        tags: ["Cristales premium", "Test de brillo"],
        image:
          "https://images.unsplash.com/photo-1553926297-57bb350c4f08?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "materia-collar",
        name: "Cadenas Materia Prima",
        description: "Layering neutro en acero quirúrgico con baños mixtos.",
        category: "Collares",
        price: 20900,
        pack: "Pack x10 · $20.900 + IVA",
        stock: "Entrega 48h",
        tags: ["Hipoalergénico", "Pack curado"],
        image:
          "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "kit-vitrina",
        name: "Kit Vitrina Premium",
        description: "Set completo de 80 piezas + exhibidores y visuales impresos.",
        category: "Kits",
        price: 98500,
        pack: "Kit completo · $98.500 + IVA",
        stock: "Disponible",
        tags: ["Incluye displays", "QR reposición"],
        image:
          "https://images.unsplash.com/photo-1767210338407-54b9264c326b?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "acero-siena",
        name: "Argollas Acero Siena",
        description: "Aros hipoalergénicos con micro pavé cristal y cierre seguro.",
        category: "Aros",
        price: 13200,
        pack: "Pack x15 · $13.200 + IVA",
        stock: "Nuevo ingreso",
        tags: ["Garantía 90 días", "Stock permanente"],
        image:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "set-perlas",
        name: "Set Perlas Boreal",
        description: "Collar + aros con perlas eau y cadenas bañadas en oro.",
        category: "Sets",
        price: 23800,
        pack: "Pack x6 · $23.800 + IVA",
        stock: "En stock",
        tags: ["Perlas de agua dulce", "Caja de regalo"],
        image:
          "https://images.unsplash.com/photo-1595345705177-ffe090eb0784?auto=format&fit=crop&w=1200&q=80",
      },
    ] as Product[],
  },
  ko: {
    heroBadge: "도매 카탈로그",
    heroTitle: "팩을 고르고 카테고리 필터로 도매 장바구니를 구성하세요.",
    heroDescription:
      "모든 가격에는 진열용 패키징과 권장가 라벨이 포함됩니다. 전국 배송을 24/72시간 내 조율합니다.",
    backHome: "홈으로 돌아가기",
    downloadList: "전체 목록 다운로드",
    filtersTitle: "필터",
    filtersDesc: "필요에 맞게 화면을 조정하세요.",
    searchLabel: "검색",
    searchPlaceholder: "후프, 키트, 진주...",
    categoriesLabel: "카테고리",
    priceLabel: "가격",
    clearFilters: "필터 초기화",
    allCategories: "전체 카테고리",
    resultsLabel: "결과",
    addButton: "추가",
    nextStepsTitle: "다음 단계",
    nextStepsDesc:
      "장바구니에 상품을 담은 뒤 WhatsApp 또는 이메일로 목록을 보내주시면 재고와 배송을 확인해드립니다.",
    nextStepP1:
      "주문 확인 후 결제 링크 또는 전자세금계산서를 발송합니다. 주문은 24/48시간 내 준비되며 귀사 물류 또는 당사 물류로 발송됩니다.",
    nextStepP2:
      "구성 추천이 필요하면 문의 주세요. 평균 객단가, 지역, 업종에 맞춘 사전 큐레이션 장바구니를 제안해드립니다.",
    cartTitle: "도매 장바구니",
    cartEmptySummary: "아직 추가된 상품이 없습니다.",
    cartFilledSummary: "개 항목이 선택되었습니다.",
    cartEmptyHint: "견적을 원하는 팩을 선택하면 여기 표시되어 영업팀에 바로 전송할 수 있습니다.",
    subtotal: "예상 소계",
    requestOrder: "주문 요청",
    sendWhatsapp: "WhatsApp으로 보내기",
    units: "개",
    emailSubject: "도매 주문",
    emailIntro: "안녕하세요 Aurelia, 아래 팩 주문을 확인하고 싶습니다:",
    whatsappIntro: "안녕하세요! 아래 상품을 주문하고 싶습니다:",
    emailSubtotal: "예상 소계",
    priceFilters: [
      { id: "low", label: "$20,000 이하", range: [0, 20000] as [number, number] },
      { id: "mid", label: "$20,000 - $30,000", range: [20000, 30000] as [number, number] },
      { id: "high", label: "$30,000 이상", range: [30000, Infinity] as [number, number] },
    ],
    products: [
      {
        id: "siena-pack",
        name: "시에나 후프 팩",
        description: "마이크로 지르코니아, 18K 골드 도금, 3가지 지름 구성.",
        category: "귀걸이",
        price: 18900,
        pack: "팩 x12 · $18,900 + VAT",
        stock: "재고 있음",
        tags: ["니켈 프리", "백킹 카드 포함"],
        image:
          "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "layering-aura",
        name: "아우라 레이어링",
        description: "자석 잠금과 단계별 길이의 5개 네크리스 스택.",
        category: "목걸이",
        price: 24500,
        pack: "팩 x8 · $24,500 + VAT",
        stock: "재고 적음",
        tags: ["자석 잠금", "팁 카드"],
        image:
          "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "capri-pulseras",
        name: "카프리 브레이슬릿 믹스",
        description: "316L 폴리시드 스틸, 파스텔 에나멜, 슬라이딩 조절.",
        category: "팔찌",
        price: 21700,
        pack: "팩 x18 · $21,700 + VAT",
        stock: "재고 있음",
        tags: ["이탈리아 에나멜", "디스플레이 포함"],
        image:
          "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "statement-fiesta",
        name: "스테이트먼트 에끌레어",
        description: "프리미엄 크리스털과 밝은 파베 마감의 볼드 이어링.",
        category: "귀걸이",
        price: 16500,
        pack: "팩 x10 · $16,500 + VAT",
        stock: "재고 있음",
        tags: ["프리미엄 크리스털", "광택 테스트"],
        image:
          "https://images.unsplash.com/photo-1553926297-57bb350c4f08?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "materia-collar",
        name: "마테리아 체인",
        description: "혼합 도금 마감의 뉴트럴 스틸 레이어링.",
        category: "목걸이",
        price: 20900,
        pack: "팩 x10 · $20,900 + VAT",
        stock: "48시간 배송",
        tags: ["저자극", "큐레이션 팩"],
        image:
          "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "kit-vitrina",
        name: "프리미엄 쇼케이스 키트",
        description: "80개 상품 + 디스플레이 + 인쇄 비주얼 풀세트.",
        category: "키트",
        price: 98500,
        pack: "풀 키트 · $98,500 + VAT",
        stock: "구매 가능",
        tags: ["디스플레이 포함", "재입고 QR"],
        image:
          "https://images.unsplash.com/photo-1767210338407-54b9264c326b?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "acero-siena",
        name: "시에나 스틸 후프",
        description: "마이크로 크리스털 파베와 안전 잠금의 저자극 이어링.",
        category: "귀걸이",
        price: 13200,
        pack: "팩 x15 · $13,200 + VAT",
        stock: "신상품",
        tags: ["90일 보증", "상시 재고"],
        image:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "set-perlas",
        name: "보레알 펄 세트",
        description: "eau 진주와 골드 도금 체인의 목걸이 + 이어링 세트.",
        category: "세트",
        price: 23800,
        pack: "팩 x6 · $23,800 + VAT",
        stock: "재고 있음",
        tags: ["담수 진주", "기프트 박스"],
        image:
          "https://images.unsplash.com/photo-1595345705177-ffe090eb0784?auto=format&fit=crop&w=1200&q=80",
      },
    ] as Product[],
  },
} as const;

export default function CatalogPage() {
  const { language } = useLanguage();
  const t = catalogContent[language];

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activePrice, setActivePrice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc">("recommended");
  const [cart, setCart] = useState<Record<string, number>>({});

  const categories = useMemo(
    () => Array.from(new Set(t.products.map((product) => product.category))),
    [t.products],
  );

  const formatPrice = (value: number) =>
    value.toLocaleString(language === "ko" ? "ko-KR" : "es-AR", {
      style: "currency",
      currency: "ARS",
    });

  const filteredProducts = useMemo(() => {
    return t.products.filter((product) => {
      const matchSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);

      const matchPrice = (() => {
        if (!activePrice) return true;
        const range = t.priceFilters.find((price) => price.id === activePrice)?.range;
        if (!range) return true;
        return product.price >= range[0] && product.price <= range[1];
      })();

      return matchSearch && matchCategory && matchPrice;
    });
  }, [t.products, t.priceFilters, search, selectedCategories, activePrice]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = t.products.find((item) => item.id === id);
        if (!product) {
          return null;
        }
        return { product, quantity, subtotal: product.price * quantity };
      })
      .filter(Boolean) as { product: Product; quantity: number; subtotal: number }[];
  }, [cart, t.products]);

  const displayedProducts = useMemo(() => {
    const products = [...filteredProducts];
    if (sortBy === "price_asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      products.sort((a, b) => b.price - a.price);
    }
    return products;
  }, [filteredProducts, sortBy]);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const navLinks =
    language === "ko"
      ? ["추천", "신상품", "베스트", "귀걸이", "목걸이", "팔찌", "세트", "키트"]
      : ["Recomendados", "Novedades", "Más vendidos", "Aros", "Collares", "Pulseras", "Sets", "Kits"];

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((cat) => cat !== category) : [...prev, category],
    );
  };

  const handleAddToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const newValue = (next[productId] ?? 0) + delta;
      if (newValue <= 0) {
        delete next[productId];
      } else {
        next[productId] = newValue;
      }
      return next;
    });
  };

  return (
    <div className="bg-[#f1f1f1]">
      <main className="mx-auto flex min-h-screen w-full max-w-[1750px] flex-col gap-5 px-3 py-4 sm:px-5 md:px-6">
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-3 md:flex-nowrap md:px-6">
            <Link href="/" className="text-2xl font-black tracking-[0.18em] text-black md:text-3xl">
              AURELIA
            </Link>
            <div className="flex w-full items-center rounded-md border border-black/20 bg-white md:max-w-2xl">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full bg-transparent px-3 text-sm text-[#111111] outline-none"
              />
              <button className="grid h-10 w-10 place-items-center border-l border-black/20">
                <Search className="h-4 w-4 text-black" />
              </button>
            </div>
            <div className="ml-auto flex items-center gap-4 text-[#111111]">
              <User className="h-4 w-4" />
              <Heart className="h-4 w-4" />
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto px-4 py-3 text-sm text-[#2f2f2f] md:px-6">
            {navLinks.map((item) => (
              <button key={item} className="whitespace-nowrap hover:text-black">
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="px-1 text-sm text-[#6b6b6b]">
          <span>{language === "ko" ? "홈" : "Página principal"}</span>
          <span className="mx-2">/</span>
          <span>{language === "ko" ? "카탈로그" : "Catálogo"}</span>
        </section>

        <section className="grid gap-4 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
          <Card className="h-fit border-black/10 bg-white md:sticky md:top-4">
              <CardHeader>
                <CardTitle className="text-[#111111]">{t.filtersTitle}</CardTitle>
                <CardDescription className="text-[#444444]">{t.filtersDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    {t.searchLabel}
                  </p>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-[#111111] outline-none focus:border-black/50"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    {t.categoriesLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const isActive = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? "border-[#111111] bg-[#111111] text-white"
                              : "border-black/10 bg-white text-[#444444] hover:border-black/20"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    {t.priceLabel}
                  </p>
                  <div className="flex flex-col gap-2">
                    {t.priceFilters.map((option) => {
                      const isActive = option.id === activePrice;
                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            setActivePrice((prev) => (prev === option.id ? null : option.id))
                          }
                          className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${
                            isActive
                              ? "border-[#ff2d55] bg-[#ffe1e8] text-[#111111]"
                              : "border-black/10 bg-white text-[#444444] hover:border-black/20"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(search || selectedCategories.length > 0 || activePrice) && (
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-[#444444] hover:bg-[#f0f0f0]"
                    onClick={() => {
                      setSearch("");
                      setSelectedCategories([]);
                      setActivePrice(null);
                    }}
                  >
                    {t.clearFilters}
                  </Button>
                )}
              </CardContent>
          </Card>

          <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-[#6b6b6b]">
                  {displayedProducts.length} {t.resultsLabel} ·{" "}
                  <span className="font-medium text-[#111111]">
                    {selectedCategories.length > 0
                      ? selectedCategories.join(" · ")
                      : t.allCategories}
                  </span>
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6b6b6b]">{language === "ko" ? "정렬" : "Ordenar por"}</span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as "recommended" | "price_asc" | "price_desc")
                    }
                    className="rounded-md border border-black/15 bg-white px-2 py-1 text-[#111111]"
                  >
                    <option value="recommended">
                      {language === "ko" ? "추천순" : "Recomendados"}
                    </option>
                    <option value="price_asc">{language === "ko" ? "가격 낮은순" : "Precio: menor"}</option>
                    <option value="price_desc">{language === "ko" ? "가격 높은순" : "Precio: mayor"}</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <div className="relative overflow-hidden rounded-xl border border-black/10 bg-[#111111] p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                    {language === "ko" ? "트렌드" : "Trend"}
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {language === "ko" ? "이번 주 베스트 룩북" : "Lookbook destacado de la semana"}
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    {language === "ko"
                      ? "상위 회전 상품으로 큐레이션된 세트를 만나보세요."
                      : "Descubrí los packs curados con mayor rotación en tiendas."}
                  </p>
                  <Button variant="muted" className="mt-4">
                    {language === "ko" ? "지금 보기" : "Ver ahora"}
                  </Button>
                </div>
                {displayedProducts.map((product) => {
                  const quantityInCart = cart[product.id] ?? 0;
                  return (
                    <article key={product.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                      <div className="relative h-60 w-full">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1536px) 22vw, (min-width: 1024px) 30vw, 90vw"
                          className="object-cover"
                        />
                        <div className="absolute left-3 top-3 flex gap-2">
                          <Badge variant="outline" className="bg-white/90">
                            {product.category}
                          </Badge>
                          <Badge variant="glow" className="bg-[#111111]/90 text-white">
                            {product.stock}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3 px-3 pb-4 pt-3">
                        <p className="line-clamp-2 text-[15px] font-medium text-[#111111]">{product.name}</p>
                        <p className="line-clamp-2 text-sm text-[#4b4b4b]">{product.description}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8a8a]">{product.pack}</p>
                        <p className="text-[30px] font-semibold leading-none text-[#111111]">
                          {formatPrice(product.price)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f1f1f1] px-2.5 py-1 text-[11px] text-[#444444]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-black/20 text-[#111111] hover:border-black/30 hover:bg-[#f7f7f7]"
                          onClick={() => handleAddToCart(product.id)}
                        >
                          {t.addButton}
                          {quantityInCart > 0 && (
                            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                              {quantityInCart}
                            </span>
                          )}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
        </section>

        <section id="cart" className="grid gap-6 pb-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
            <Card className="border-black/10 bg-white/90">
              <CardHeader>
                <CardTitle className="text-[#111111]">{t.nextStepsTitle}</CardTitle>
                <CardDescription>{t.nextStepsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#444444]">
                <p>{t.nextStepP1}</p>
                <p>{t.nextStepP2}</p>
              </CardContent>
            </Card>

            <Card className="h-fit border-black/10 bg-white/95 shadow-[0_22px_60px_rgba(0,0,0,0.12)] md:sticky md:top-6">
              <CardHeader className="space-y-1">
                <CardTitle className="text-[#111111]">{t.cartTitle}</CardTitle>
                <CardDescription className="text-[#444444]">
                  {cartItems.length === 0
                    ? t.cartEmptySummary
                    : `${cartItems.length} ${t.cartFilledSummary}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-[#6b6b6b]">
                    {t.cartEmptyHint}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="flex items-start justify-between rounded-2xl border border-black/10 bg-[#f5f5f5] p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#111111]">{product.name}</p>
                          <p className="text-xs text-[#6b6b6b]">{product.pack}</p>
                          <p className="text-sm text-[#444444]">
                            {formatPrice(product.price)} · {quantity} {t.units}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="h-7 w-7 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#444444]"
                          >
                            -
                          </button>
                          <span className="px-2 text-sm font-semibold">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="h-7 w-7 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#444444]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl bg-[#111111] px-4 py-5 text-white">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>{t.subtotal}</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 text-sm">
                    <Button
                      asChild
                      size="lg"
                      variant="muted"
                      className="w-full justify-center"
                      disabled={cartItems.length === 0}
                    >
                      <Link
                        href={
                          cartItems.length === 0
                            ? "#cart"
                            : `mailto:hola@aurelia.com?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(
                                `${t.emailIntro}\n\n${cartItems
                                  .map(
                                    (item) =>
                                      `- ${item.product.name} x${item.quantity} (${item.product.pack})`,
                                  )
                                  .join("\n")}\n\n${t.emailSubtotal}: ${formatPrice(cartTotal)}.`,
                              )}`
                        }
                      >
                        {t.requestOrder}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-center border-white/40 bg-white/10 text-white hover:bg-white/20"
                      disabled={cartItems.length === 0}
                    >
                      <Link
                        href={
                          cartItems.length === 0
                            ? "#cart"
                            : `https://wa.me/5491112345678?text=${encodeURIComponent(
                                `${t.whatsappIntro}\n${cartItems
                                  .map(
                                    (item) =>
                                      `• ${item.product.name} x${item.quantity} (${item.product.pack})`,
                                  )
                                  .join("\n")}\n${t.emailSubtotal}: ${formatPrice(cartTotal)}.`,
                              )}`
                        }
                      >
                        {t.sendWhatsapp}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        </section>
      </main>
    </div>
  );
}
