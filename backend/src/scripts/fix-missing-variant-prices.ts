import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { upsertVariantPricesWorkflow } from "@medusajs/core-flows"

type ProductRecord = {
  id: string
  title?: string
  variants?: Array<{ id: string }>
}

type PriceRecord = {
  currency_code?: string
  amount?: number
}

type VariantPriceSetRecord = {
  variant_id: string
  price_set?: {
    prices?: PriceRecord[]
  }
}

export default async function fixMissingVariantPrices({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const defaultAmountArg = Number(args?.[0])
  const defaultAmount = Number.isFinite(defaultAmountArg) && defaultAmountArg > 0 ? defaultAmountArg : 25000

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id"],
  })

  const productList = (products ?? []) as ProductRecord[]
  const variants: Array<{ variant_id: string; product_id: string; product_title: string }> = []
  for (const product of productList) {
    for (const variant of product.variants ?? []) {
      variants.push({
        variant_id: variant.id,
        product_id: product.id,
        product_title: product.title ?? product.id,
      })
    }
  }

  const { data: variantPriceLinks } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set.prices.currency_code", "price_set.prices.amount"],
  })

  const linkMap = new Map<string, VariantPriceSetRecord>()
  for (const row of (variantPriceLinks ?? []) as VariantPriceSetRecord[]) {
    linkMap.set(row.variant_id, row)
  }

  const variantPrices: Array<{
    variant_id: string
    product_id: string
    prices: Array<{ currency_code: string; amount: number }>
  }> = []
  const previousVariantIds: string[] = []

  for (const variant of variants) {
    const link = linkMap.get(variant.variant_id)
    const existingPrices = link?.price_set?.prices ?? []
    const hasArs = existingPrices.some((price) => price.currency_code?.toLowerCase() === "ars")
    if (hasArs) {
      continue
    }

    const fallbackFromAnyCurrency =
      existingPrices.find((price) => typeof price.amount === "number" && price.amount > 0)?.amount ??
      defaultAmount

    variantPrices.push({
      variant_id: variant.variant_id,
      product_id: variant.product_id,
      prices: [{ currency_code: "ars", amount: fallbackFromAnyCurrency }],
    })

    if (link) {
      previousVariantIds.push(variant.variant_id)
    }
  }

  if (!variantPrices.length) {
    logger.info("No variants missing ARS prices. Nothing to update.")
    return
  }

  await upsertVariantPricesWorkflow(container).run({
    input: {
      variantPrices,
      previousVariantIds,
    },
  })

  logger.info(
    `Updated ${variantPrices.length} variant(s) with ARS prices (default fallback: ${defaultAmount}).`,
  )
}

