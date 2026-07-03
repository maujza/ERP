import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { upsertVariantPricesWorkflow, updateProductsWorkflow } from "@medusajs/core-flows"

type ProductRow = {
  id: string
  handle?: string
  title?: string
  thumbnail?: string | null
  metadata?: {
    category?: string
  } | null
  variants?: Array<{ id: string }>
}

const IMAGE_BY_HANDLE: Record<string, string> = {
  "pulsera-eslabon-dorada":
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
  "set-coleccion-perlas":
    "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=600&q=80",
  "aros-perla-baroque":
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
  "collar-capas-boho":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
}

const PRICE_BY_HANDLE: Record<string, number> = {
  "aros-siena-dorado": 18900,
  "aros-argolla-fina-plateada": 12500,
  "aros-perla-baroque": 28000,
  "collar-luna-minimalista": 24500,
  "collar-capas-boho": 32000,
  "pulsera-boreal": 15800,
  "pulsera-eslabon-dorada": 19500,
  "set-vitrina-mix-x5": 89000,
  "set-coleccion-perlas": 67000,
  "kit-showroom-basico-x8": 125000,
}

export default async function fixJewelryCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promotionService: any = container.resolve(Modules.PROMOTION)

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "thumbnail", "metadata.category", "variants.id"],
  })

  const products = (data ?? []) as ProductRow[]
  const jewelryProducts = products.filter((product) => product.metadata?.category)

  const productUpdates = jewelryProducts
    .map((product) => {
      const handle = product.handle ?? ""
      const nextImage = IMAGE_BY_HANDLE[handle]
      if (!nextImage || product.thumbnail === nextImage) return null
      return {
        id: product.id,
        thumbnail: nextImage,
        images: [{ url: nextImage }],
      }
    })
    .filter(Boolean) as Array<{ id: string; thumbnail: string; images: Array<{ url: string }> }>

  if (productUpdates.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: productUpdates,
      },
    })
    logger.info(`Updated product images: ${productUpdates.length}`)
  } else {
    logger.info("No product images needed updates.")
  }

  const variantPrices: Array<{
    variant_id: string
    product_id: string
    prices: Array<{ currency_code: string; amount: number }>
  }> = []
  const previousVariantIds: string[] = []

  for (const product of jewelryProducts) {
    const handle = product.handle ?? ""
    const targetAmount = PRICE_BY_HANDLE[handle]
    if (!targetAmount) continue

    for (const variant of product.variants ?? []) {
      variantPrices.push({
        variant_id: variant.id,
        product_id: product.id,
        prices: [{ currency_code: "ars", amount: targetAmount }],
      })
      previousVariantIds.push(variant.id)
    }
  }

  if (variantPrices.length) {
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices,
        previousVariantIds,
      },
    })
    logger.info(`Normalized ARS prices on variants: ${variantPrices.length}`)
  }

  const requiredPromotions = [
    { code: "AURORA10", value: 10 },
    { code: "SUMMER15", value: 15 },
  ] as const

  for (const promo of requiredPromotions) {
    const existing = await promotionService
      .listPromotions(
        { code: [promo.code] },
        { relations: ["application_method"] },
      )
      .catch(() => [])

    if (existing.length) {
      const existingPromo = existing[0]
      const method = existingPromo?.application_method
      if (method?.currency_code && method.currency_code.toLowerCase() !== "ars") {
        await promotionService.deletePromotions(existingPromo.id)
        await promotionService.createPromotions([
          {
            code: promo.code,
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: "percentage",
              target_type: "order",
              value: promo.value,
              allocation: "across",
              apply_to_quantity: 1,
            },
          },
        ])
        logger.info(`Recreated promotion with correct currency context: ${promo.code}`)
        continue
      }
      const shouldNormalizeMethod =
        method?.type !== "percentage" ||
        method?.target_type !== "order" ||
        Number(method?.value ?? 0) !== promo.value ||
        Boolean(method?.currency_code)

      if (existingPromo?.status !== "active" || shouldNormalizeMethod || Boolean(existingPromo?.campaign_id)) {
        await promotionService.updatePromotions({
          id: existingPromo.id,
          status: "active",
          type: "standard",
          campaign_id: null,
          application_method: {
            type: "percentage",
            target_type: "order",
            value: promo.value,
            allocation: "across",
            apply_to_quantity: 1,
          },
        })
        logger.info(`Normalized promotion: ${promo.code}`)
      } else {
        logger.info(`Promotion already exists: ${promo.code}`)
      }
      continue
    }

    await promotionService.createPromotions([
      {
        code: promo.code,
        type: "standard",
        status: "active",
        is_automatic: false,
        application_method: {
          type: "percentage",
          target_type: "order",
          value: promo.value,
          allocation: "across",
          apply_to_quantity: 1,
        },
      },
    ])

    logger.info(`Created promotion: ${promo.code}`)
  }
}
