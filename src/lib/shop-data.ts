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
  nameKo?: string;
  description: string;
  descriptionKo?: string;
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

const jewelryCategories = ["Aros", "Collares", "Pulseras", "Sets", "Kits", "Anillos", "Perlas"];
export const navCategories = ["Novedades", "Best Sellers", ...jewelryCategories];

export const subcategories = ["Todos", "Novedades", "Best Sellers", "Esenciales", "Fiesta", "Kits"];

export const brands = ["Aurelia Core", "Aurelia Studio", "Lumiere", "Boreal", "Aurelia Pro"];

const clothingKeywords = [
  "shirt",
  "sweat",
  "hoodie",
  "short",
  "pant",
  "sock",
  "cap",
  "merch",
  "jean",
  "jacket",
];

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
  if (language === "ko" && product.nameKo) return product.nameKo;
  return product.name;
}

export function getProductDescription(product: Product, language: UiLanguage) {
  if (language === "ko" && product.descriptionKo) return product.descriptionKo;
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
  const rawImage = (p.thumbnail ?? p.images?.[0]?.url ?? "") as string
  const image = resolveProductImage(rawImage)
  const price =
    firstVariant?.calculated_price?.calculated_amount ??
    firstVariant?.prices?.[0]?.amount ??
    0
  const originalAmount = firstVariant?.calculated_price?.original_amount
  const originalPrice = originalAmount && originalAmount !== price ? originalAmount : undefined

  const totalStock = p.variants?.reduce(
    (sum: number, v: MedusaProduct) => sum + (v.inventory_quantity ?? 0),
    0
  ) ?? 0

  const category = (p.metadata?.category as string) ?? p.categories?.[0]?.name ?? inferCategoryFromText(p.title ?? "", p.description ?? "")
  const subcategory = (p.metadata?.subcategory as string) ?? ""
  const brand = (p.metadata?.brand as string) ?? ""
  const nameKo = (p.metadata?.name_ko as string) || undefined
  const descriptionKo = (p.metadata?.description_ko as string) || undefined

  return {
    id: p.id,
    name: p.title,
    nameKo,
    description: p.description ?? "",
    descriptionKo,
    category,
    subcategory,
    brand,
    image,
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

function resolveProductImage(rawImage: string) {
  const trimmed = rawImage.trim()
  if (!trimmed) return "/file.svg"
  if (trimmed.startsWith("/")) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed
    }
    return "/file.svg"
  } catch {
    return "/file.svg"
  }
}

export function hasPurchasablePrice(product: Product) {
  return product.price > 0
}

function inferCategoryFromText(name: string, description: string) {
  const normalized = `${name} ${description}`.toLowerCase()
  if (normalized.includes("aro")) return "Aros"
  if (normalized.includes("collar")) return "Collares"
  if (normalized.includes("pulsera")) return "Pulseras"
  if (normalized.includes("kit")) return "Kits"
  if (normalized.includes("set")) return "Sets"
  if (normalized.includes("anillo")) return "Anillos"
  if (normalized.includes("perla")) return "Perlas"
  return ""
}

export function isJewelryProduct(product: Product) {
  if (jewelryCategories.includes(product.category)) {
    return true
  }

  const normalized = `${product.name} ${product.description} ${product.category}`.toLowerCase()
  if (clothingKeywords.some((keyword) => normalized.includes(keyword))) {
    return false
  }

  return Boolean(inferCategoryFromText(product.name, product.description))
}
