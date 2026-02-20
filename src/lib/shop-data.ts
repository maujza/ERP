// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MedusaProduct = any

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

export type UiLanguage = "es" | "ko";

export type SortOption = "recommended" | "price_asc" | "price_desc";

export const sortOptions = [
  { id: "recommended" as SortOption, label: "Recomendados" },
  { id: "price_asc" as SortOption, label: "Precio: menor" },
  { id: "price_desc" as SortOption, label: "Precio: mayor" },
];

export const navCategories = ["Novedades", "Best Sellers", "Aros", "Collares", "Pulseras", "Sets", "Kits"];

export const subcategories = ["Todos", "Novedades", "Best Sellers", "Esenciales", "Fiesta", "Kits"];

export const brands = ["Aurelia Core", "Aurelia Studio", "Lumiere", "Boreal", "Aurelia Pro"];

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

export function translateLabel(value: string, language: UiLanguage) {
  if (language === "es") return value;
  return labelKo[value] ?? value;
}

export function getProductName(product: Product, language: UiLanguage) {
  return product.name;
}

export function getProductDescription(product: Product, language: UiLanguage) {
  return product.description;
}

export function formatArs(value: number, language: UiLanguage = "es") {
  return value.toLocaleString(language === "ko" ? "ko-KR" : "es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function mapMedusaProduct(p: MedusaProduct): Product {
  const firstVariant = p.variants?.[0]
  const price = firstVariant?.calculated_price?.calculated_amount ?? 0
  const originalAmount = firstVariant?.calculated_price?.original_amount
  const originalPrice = originalAmount && originalAmount !== price ? originalAmount : undefined

  const totalStock = p.variants?.reduce(
    (sum: number, v: MedusaProduct) => sum + (v.inventory_quantity ?? 0),
    0
  ) ?? 0

  return {
    id: p.id,
    name: p.title,
    description: p.description ?? "",
    category: (p.metadata?.category as string) ?? p.categories?.[0]?.name ?? "",
    subcategory: (p.metadata?.subcategory as string) ?? "",
    brand: (p.metadata?.brand as string) ?? "",
    image: p.thumbnail ?? p.images?.[0]?.url ?? "",
    price,
    originalPrice,
    stock: totalStock,
    variants: p.variants?.map((v: MedusaProduct) => ({
      id: v.id as string,
      label: (v.title ?? "") as string,
      stock: (v.inventory_quantity ?? 0) as number,
    })),
  }
}
