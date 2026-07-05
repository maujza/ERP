import {
  buildAdminCreateProductPayload,
  buildAdminCreateVariantPayload,
  validateAdminProductDraft,
} from "../../../src/admin/lib/product-sku-form"

describe("product SKU form helpers", () => {
  describe("validateAdminProductDraft", () => {
    it("requires a product title only for new products", () => {
      expect(
        validateAdminProductDraft({
          mode: "new_product",
          existingProductId: "",
          form: { title: "   ", variantTitle: "Única", sku: "" },
        })
      ).toBe("Product title is required")
    })

    it("requires selecting an existing product for new variants", () => {
      expect(
        validateAdminProductDraft({
          mode: "new_variant",
          existingProductId: "",
          form: { title: "", variantTitle: "18", sku: "RING-18" },
        })
      ).toBe("Select an existing product first")
    })

    it("keeps SKU required for new variants", () => {
      expect(
        validateAdminProductDraft({
          mode: "new_variant",
          existingProductId: "prod_01",
          form: { title: "", variantTitle: "18", sku: "   " },
        })
      ).toBe("SKU is required")
    })

    it("allows blank SKU for new products", () => {
      expect(
        validateAdminProductDraft({
          mode: "new_product",
          existingProductId: "",
          form: { title: "Aros Siena", variantTitle: "Única", sku: "   " },
        })
      ).toBeNull()
    })
  })

  describe("buildAdminCreateProductPayload", () => {
    it("omits the SKU when staff leave it blank", () => {
      expect(
        buildAdminCreateProductPayload({
          title: "  Aros Siena  ",
          variantTitle: " Única ",
          sku: "   ",
        })
      ).toEqual({
        title: "Aros Siena",
        status: "published",
        variants: [{ title: "Única" }],
      })
    })

    it("preserves a manual SKU override when provided", () => {
      expect(
        buildAdminCreateProductPayload({
          title: "Aros Siena",
          variantTitle: "Única",
          sku: "  AROS-SIENA  ",
        })
      ).toEqual({
        title: "Aros Siena",
        status: "published",
        variants: [{ title: "Única", sku: "AROS-SIENA" }],
      })
    })
  })

  describe("buildAdminCreateVariantPayload", () => {
    it("sends a trimmed SKU for manually created variants", () => {
      expect(
        buildAdminCreateVariantPayload({
          title: "Aros Siena",
          variantTitle: " 18 ",
          sku: " AROS-SIENA-18 ",
        })
      ).toEqual({
        title: "18",
        sku: "AROS-SIENA-18",
      })
    })
  })
})
