export type AdminProductDraftMode = "new_product" | "new_variant"

export type AdminProductDraftForm = {
  title: string
  variantTitle: string
  sku: string
}

type ValidateAdminProductDraftInput = {
  mode: AdminProductDraftMode
  existingProductId: string
  form: AdminProductDraftForm
}

export function validateAdminProductDraft({
  mode,
  existingProductId,
  form,
}: ValidateAdminProductDraftInput): string | null {
  if (mode === "new_product" && !form.title.trim()) {
    return "Product title is required"
  }

  if (mode === "new_variant" && !existingProductId.trim()) {
    return "Select an existing product first"
  }

  if (!form.variantTitle.trim()) {
    return "Variant title is required"
  }

  if (mode === "new_variant" && !form.sku.trim()) {
    return "SKU is required"
  }

  return null
}

export function buildAdminCreateProductPayload(form: AdminProductDraftForm) {
  const variant = {
    title: form.variantTitle.trim(),
    ...buildOptionalSku(form.sku),
  }

  return {
    title: form.title.trim(),
    status: "published" as const,
    variants: [variant],
  }
}

export function buildAdminCreateVariantPayload(form: AdminProductDraftForm) {
  return {
    title: form.variantTitle.trim(),
    ...buildOptionalSku(form.sku),
  }
}

function buildOptionalSku(sku: string) {
  const normalizedSku = sku.trim().toUpperCase()
  return normalizedSku ? { sku: normalizedSku } : {}
}
