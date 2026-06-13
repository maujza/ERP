/**
 * sku.ts — deterministic SKU generation from a product/variant name
 *
 * SKUs derived here depend ONLY on the provided name(s), so the same input
 * always yields the same SKU. Used by the `product-created` subscriber to
 * auto-fill blank variant SKUs in the Admin UI.
 *
 * Slug rules: strip accents (NFD), uppercase, collapse any run of
 * non-alphanumeric characters into a single hyphen, then trim edge hyphens.
 *   "Aros Siéna"  → "AROS-SIENA"
 *   "Collar Luna" → "COLLAR-LUNA"
 */

// The placeholder variant title used by single-variant products in this catalog
// (see seed-aurelia.ts). It carries no information, so it is omitted from SKUs.
const DEFAULT_VARIANT_TITLE = "Única"

/**
 * Slugify a single name into an uppercase, hyphen-separated token.
 * Returns "" when the name contains no alphanumeric characters.
 */
export function skuFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-") // any non-alphanumeric run → single hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
}

/**
 * Build a variant SKU from the product title and variant title.
 *
 * The variant title is appended only when it is meaningful — i.e. the product
 * has more than one variant and the title is not the placeholder "Única".
 * This keeps single-variant SKUs clean ("AROS-SIENA") while guaranteeing
 * uniqueness across a product's variants ("ANILLO-AURA-16", "ANILLO-AURA-18").
 *
 * Returns "" when the product title yields no slug (caller should skip).
 */
export function variantSku(
  productTitle: string,
  variantTitle: string,
  isMultiVariant: boolean
): string {
  const base = skuFromName(productTitle)
  if (!base) return ""

  const appendVariant =
    isMultiVariant && variantTitle.trim() !== "" && variantTitle !== DEFAULT_VARIANT_TITLE

  if (!appendVariant) return base

  const suffix = skuFromName(variantTitle)
  return suffix ? `${base}-${suffix}` : base
}
