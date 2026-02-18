export type ProductVariant = {
  id: string;
  label: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  image: string;
  price: number;
  originalPrice?: number;
  stock: number;
  variants?: ProductVariant[];
};

export const products: Product[] = [
  {
    id: "siena-pack",
    name: "Pack Argollas Siena",
    description: "Micro circonias, baño oro 18K y tres diámetros combinables.",
    category: "Aros",
    subcategory: "Best Sellers",
    brand: "Aurelia Core",
    image:
      "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
    price: 18900,
    originalPrice: 22900,
    stock: 24,
    variants: [
      { id: "dorado", label: "Dorado", stock: 12 },
      { id: "plateado", label: "Plateado", stock: 12 },
    ],
  },
  {
    id: "layering-aura",
    name: "Layering Aura",
    description: "Stack de 5 collares con cierres magnéticos y largos escalonados.",
    category: "Collares",
    subcategory: "Novedades",
    brand: "Aurelia Studio",
    image:
      "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
    price: 24500,
    stock: 14,
    variants: [
      { id: "set-5", label: "Set x5", stock: 8 },
      { id: "set-8", label: "Set x8", stock: 6 },
    ],
  },
  {
    id: "capri-pulseras",
    name: "Mix Pulseras Capri",
    description: "Acero 316L pulido, esmaltes pasteles y ajuste deslizable.",
    category: "Pulseras",
    subcategory: "Best Sellers",
    brand: "Aurelia Core",
    image:
      "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
    price: 21700,
    stock: 19,
  },
  {
    id: "statement-eclair",
    name: "Statement Eclair",
    description: "Aros bold con cristales premium y terminación paven luminosa.",
    category: "Aros",
    subcategory: "Fiesta",
    brand: "Lumiere",
    image:
      "https://images.unsplash.com/photo-1553926297-57bb350c4f08?auto=format&fit=crop&w=1200&q=80",
    price: 16500,
    originalPrice: 19800,
    stock: 6,
  },
  {
    id: "materia-collar",
    name: "Cadenas Materia Prima",
    description: "Layering neutro en acero quirurgico con banos mixtos.",
    category: "Collares",
    subcategory: "Esenciales",
    brand: "Aurelia Studio",
    image:
      "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
    price: 20900,
    stock: 11,
  },
  {
    id: "kit-vitrina",
    name: "Kit Vitrina Premium",
    description: "Set completo de 80 piezas + exhibidores y visuales impresos.",
    category: "Kits",
    subcategory: "Kits",
    brand: "Aurelia Pro",
    image:
      "https://images.unsplash.com/photo-1767210338407-54b9264c326b?auto=format&fit=crop&w=1200&q=80",
    price: 98500,
    stock: 4,
    variants: [
      { id: "small", label: "Tienda chica", stock: 2 },
      { id: "large", label: "Tienda grande", stock: 2 },
    ],
  },
  {
    id: "set-perlas",
    name: "Set Perlas Boreal",
    description: "Collar + aros con perlas y cadenas banadas en oro.",
    category: "Sets",
    subcategory: "Novedades",
    brand: "Boreal",
    image:
      "https://images.unsplash.com/photo-1595345705177-ffe090eb0784?auto=format&fit=crop&w=1200&q=80",
    price: 23800,
    stock: 0,
  },
  {
    id: "acero-siena",
    name: "Argollas Acero Siena",
    description: "Aros hipoalergenicos con micro pave cristal y cierre seguro.",
    category: "Aros",
    subcategory: "Esenciales",
    brand: "Aurelia Core",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    price: 13200,
    stock: 32,
  },
  {
    id: "choker-luna",
    name: "Choker Luna",
    description: "Cadena corta con dije central y cierre extensor.",
    category: "Collares",
    subcategory: "Best Sellers",
    brand: "Lumiere",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    price: 15400,
    originalPrice: 17900,
    stock: 15,
  },
  {
    id: "anillo-wave",
    name: "Anillo Wave",
    description: "Anillo regulable con textura organica premium.",
    category: "Anillos",
    subcategory: "Novedades",
    brand: "Aurelia Studio",
    image:
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80",
    price: 9800,
    stock: 22,
    variants: [
      { id: "dorado", label: "Dorado", stock: 10 },
      { id: "plateado", label: "Plateado", stock: 12 },
    ],
  },
];

export const navCategories = ["Novedades", "Best Sellers", "Aros", "Collares", "Pulseras", "Sets", "Kits"];

export const subcategories = ["Todos", "Novedades", "Best Sellers", "Esenciales", "Fiesta", "Kits"];

export const brands = ["Aurelia Core", "Aurelia Studio", "Lumiere", "Boreal", "Aurelia Pro"];

export const sortOptions = [
  { id: "recommended", label: "Recomendados" },
  { id: "price_asc", label: "Precio: menor" },
  { id: "price_desc", label: "Precio: mayor" },
] as const;

export type SortOption = (typeof sortOptions)[number]["id"];

export type UiLanguage = "es" | "ko";

const labelKo: Record<string, string> = {
  "Novedades": "신상품",
  "Best Sellers": "베스트셀러",
  "Aros": "귀걸이",
  "Collares": "목걸이",
  "Pulseras": "팔찌",
  "Sets": "세트",
  "Kits": "키트",
  "Anillos": "반지",
  "Esenciales": "에센셜",
  "Fiesta": "파티",
  "Todos": "전체",
  "Dorado": "골드",
  "Plateado": "실버",
  "Tienda chica": "소형 매장",
  "Tienda grande": "대형 매장",
  "Set x5": "세트 x5",
  "Set x8": "세트 x8",
  "Aurelia Core": "아우렐리아 코어",
  "Aurelia Studio": "아우렐리아 스튜디오",
  "Aurelia Pro": "아우렐리아 프로",
  "Lumiere": "루미에르",
  "Boreal": "보레알",
  "Hasta $20.000": "20,000 이하",
  "$20.000 - $30.000": "20,000 - 30,000",
  "Mas de $30.000": "30,000 이상",
};

const productKo: Record<string, { name: string; description: string }> = {
  "siena-pack": {
    name: "시에나 후프 팩",
    description: "마이크로 지르코니아, 18K 골드 도금, 3가지 지름 구성.",
  },
  "layering-aura": {
    name: "아우라 레이어링",
    description: "자석 잠금과 단계별 길이의 5개 네크리스 스택.",
  },
  "capri-pulseras": {
    name: "카프리 브레이슬릿 믹스",
    description: "316L 스틸, 파스텔 에나멜, 슬라이딩 조절.",
  },
  "statement-eclair": {
    name: "스테이트먼트 에클레어",
    description: "프리미엄 크리스탈과 파베 마감의 볼드 이어링.",
  },
  "materia-collar": {
    name: "마테리아 체인",
    description: "혼합 도금 스틸 레이어링의 뉴트럴 디자인.",
  },
  "kit-vitrina": {
    name: "프리미엄 쇼케이스 키트",
    description: "80피스 세트 + 디스플레이 + 인쇄 비주얼 구성.",
  },
  "set-perlas": {
    name: "보레알 펄 세트",
    description: "진주 목걸이 + 귀걸이 골드 체인 세트.",
  },
  "acero-siena": {
    name: "시에나 스틸 후프",
    description: "저자극 후프, 마이크로 파베 크리스탈, 안전 잠금.",
  },
  "choker-luna": {
    name: "루나 초커",
    description: "중앙 펜던트와 익스텐더 체인의 짧은 네크리스.",
  },
  "anillo-wave": {
    name: "웨이브 링",
    description: "유기적 텍스처의 사이즈 조절 반지.",
  },
};

export function translateLabel(value: string, language: UiLanguage) {
  if (language === "es") return value;
  return labelKo[value] ?? value;
}

export function getProductName(product: Product, language: UiLanguage) {
  if (language === "es") return product.name;
  return productKo[product.id]?.name ?? product.name;
}

export function getProductDescription(product: Product, language: UiLanguage) {
  if (language === "es") return product.description;
  return productKo[product.id]?.description ?? product.description;
}

export function formatArs(value: number, language: UiLanguage = "es") {
  return value.toLocaleString(language === "ko" ? "ko-KR" : "es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}
