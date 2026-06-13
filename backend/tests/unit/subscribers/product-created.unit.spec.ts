import productCreatedHandler from "../../../src/subscribers/product-created"
import { Modules } from "@medusajs/framework/utils"

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function makeContainer({
  product,
  retrieveError,
  updateError,
}: {
  product?: ProductRecord
  retrieveError?: Error
  updateError?: Error
} = {}) {
  const logger = { warn: jest.fn() }
  const retrieveProduct = jest.fn(() =>
    retrieveError ? Promise.reject(retrieveError) : Promise.resolve(product)
  )
  const updateProductVariants = jest.fn(() =>
    updateError ? Promise.reject(updateError) : Promise.resolve({})
  )

  const container = {
    resolve: jest.fn((key: string) => {
      if (key === Modules.PRODUCT) {
        return { retrieveProduct, updateProductVariants }
      }
      if (key === "logger") {
        return logger
      }
      throw new Error(`Unknown service: ${key}`)
    }),
  }

  return { container, retrieveProduct, updateProductVariants, logger }
}

async function run(
  container: ReturnType<typeof makeContainer>["container"],
  productId = "prod_01"
) {
  await productCreatedHandler({
    event: { data: { id: productId } },
    container,
  } as unknown as Parameters<typeof productCreatedHandler>[0])
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("product-created subscriber", () => {
  it("fills a blank SKU from the product title for a single-variant product", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "Aros Siena",
        variants: [{ id: "var_1", title: "Única", sku: "" }],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).toHaveBeenCalledTimes(1)
    expect(ctx.updateProductVariants).toHaveBeenCalledWith("var_1", {
      sku: "AROS-SIENA",
    })
  })

  it("appends variant titles for multi-variant products", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "Anillo Aura",
        variants: [
          { id: "var_16", title: "16", sku: null },
          { id: "var_18", title: "18", sku: undefined },
        ],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).toHaveBeenCalledWith("var_16", {
      sku: "ANILLO-AURA-16",
    })
    expect(ctx.updateProductVariants).toHaveBeenCalledWith("var_18", {
      sku: "ANILLO-AURA-18",
    })
  })

  it("never overwrites a variant that already has a SKU", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "Aros Siena",
        variants: [
          { id: "var_1", title: "16", sku: "CUSTOM-01" },
          { id: "var_2", title: "18", sku: "" },
        ],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).toHaveBeenCalledTimes(1)
    expect(ctx.updateProductVariants).toHaveBeenCalledWith("var_2", {
      sku: "AROS-SIENA-18",
    })
  })

  it("does nothing when every variant already has a SKU", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "Aros Siena",
        variants: [{ id: "var_1", title: "Única", sku: "AROS-SIENA" }],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).not.toHaveBeenCalled()
  })

  it("does nothing when the product has no title", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "   ",
        variants: [{ id: "var_1", title: "Única", sku: "" }],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).not.toHaveBeenCalled()
  })

  it("warns and skips when the title produces an empty slug", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "¡!",
        variants: [{ id: "var_1", title: "Única", sku: "" }],
      },
    })

    await run(ctx.container)

    expect(ctx.updateProductVariants).not.toHaveBeenCalled()
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1)
  })

  it("logs a warning instead of throwing when retrieval fails", async () => {
    const ctx = makeContainer({ retrieveError: new Error("boom") })

    await expect(run(ctx.container)).resolves.toBeUndefined()
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1)
    expect(ctx.updateProductVariants).not.toHaveBeenCalled()
  })

  it("logs a warning instead of throwing when an update fails", async () => {
    const ctx = makeContainer({
      product: {
        id: "prod_01",
        title: "Aros Siena",
        variants: [{ id: "var_1", title: "Única", sku: "" }],
      },
      updateError: new Error("db down"),
    })

    await expect(run(ctx.container)).resolves.toBeUndefined()
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1)
  })
})
