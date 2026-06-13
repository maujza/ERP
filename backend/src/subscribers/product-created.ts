/**
 * product-created.ts — Subscriber: auto-fills blank variant SKUs from the product title
 *
 * Listens for "product.created". For every variant whose SKU was left empty in
 * the Admin UI, it generates a deterministic SKU derived only from the product
 * title (plus the variant title for multi-variant products) via `variantSku`.
 *
 * This lets staff leave the SKU field blank when creating a product — the SKU
 * fills itself. Variants that already have a SKU are never overwritten, so
 * intentional / scripted SKUs are preserved.
 *
 * Failures are logged as warnings rather than thrown: a missing SKU is not
 * worth crashing product creation over, and the SKU can be set manually.
 */

import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { variantSku } from "../lib/sku"

type VariantRecord = {
  id: string
  title?: string
  sku?: string | null
}

type ProductRecord = {
  id: string
  title?: string
  variants?: VariantRecord[]
}

// Minimal shape of the product module service methods we use.
type ProductModuleService = {
  retrieveProduct: (
    id: string,
    config?: { relations?: string[] }
  ) => Promise<ProductRecord>
  updateProductVariants: (
    id: string,
    data: { sku: string }
  ) => Promise<unknown>
}

export default async function productCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (message: string) => void
  }

  const productModuleService = container.resolve(
    Modules.PRODUCT
  ) as ProductModuleService

  let product: ProductRecord
  try {
    product = await productModuleService.retrieveProduct(data.id, {
      relations: ["variants"],
    })
  } catch (error) {
    logger.warn(
      `Skipping SKU auto-fill for product ${data.id}: failed to retrieve product (${describeError(error)}).`
    )
    return
  }

  const title = product.title?.trim()
  const variants = product.variants ?? []
  if (!title || variants.length === 0) return

  const isMultiVariant = variants.length > 1

  // Only variants with a genuinely blank SKU are eligible.
  const pending = variants.filter((v) => !v.sku || v.sku.trim() === "")
  if (pending.length === 0) return

  await Promise.all(
    pending.map(async (variant) => {
      const sku = variantSku(title, variant.title ?? "", isMultiVariant)
      if (!sku) {
        logger.warn(
          `Skipping SKU auto-fill for variant ${variant.id}: product title "${title}" produced an empty slug.`
        )
        return
      }

      try {
        await productModuleService.updateProductVariants(variant.id, { sku })
      } catch (error) {
        logger.warn(
          `Failed to auto-fill SKU "${sku}" for variant ${variant.id}: ${describeError(error)}.`
        )
      }
    })
  )
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
