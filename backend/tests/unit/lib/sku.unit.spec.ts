import { skuFromName, variantSku } from "../../../src/lib/sku"

describe("skuFromName", () => {
  it("uppercases and hyphenates a simple name", () => {
    expect(skuFromName("Aros Siena")).toBe("AROS-SIENA")
  })

  it("strips accents", () => {
    expect(skuFromName("Aros Siéna")).toBe("AROS-SIENA")
    expect(skuFromName("Collar Lúmen")).toBe("COLLAR-LUMEN")
  })

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(skuFromName("Set  Perla / Oro")).toBe("SET-PERLA-ORO")
  })

  it("trims leading and trailing hyphens", () => {
    expect(skuFromName("  ¡Anillo Aura!  ")).toBe("ANILLO-AURA")
  })

  it("keeps digits", () => {
    expect(skuFromName("Aro 18k")).toBe("ARO-18K")
  })

  it("is deterministic for the same input", () => {
    expect(skuFromName("Pulsera Bruma")).toBe(skuFromName("Pulsera Bruma"))
  })

  it("returns an empty string when there are no alphanumeric characters", () => {
    expect(skuFromName("¡!¿?")).toBe("")
    expect(skuFromName("")).toBe("")
  })
})

describe("variantSku", () => {
  it("uses only the product title for single-variant products", () => {
    expect(variantSku("Aros Siena", "Única", false)).toBe("AROS-SIENA")
  })

  it("omits the placeholder 'Única' title even when flagged multi-variant", () => {
    expect(variantSku("Aros Siena", "Única", true)).toBe("AROS-SIENA")
  })

  it("appends the variant title for multi-variant products", () => {
    expect(variantSku("Anillo Aura", "16", true)).toBe("ANILLO-AURA-16")
    expect(variantSku("Anillo Aura", "18", true)).toBe("ANILLO-AURA-18")
  })

  it("produces distinct SKUs per variant of the same product", () => {
    const a = variantSku("Anillo Aura", "16", true)
    const b = variantSku("Anillo Aura", "18", true)
    expect(a).not.toBe(b)
  })

  it("does not append an empty/whitespace variant title", () => {
    expect(variantSku("Aros Siena", "", true)).toBe("AROS-SIENA")
    expect(variantSku("Aros Siena", "   ", true)).toBe("AROS-SIENA")
  })

  it("falls back to the base when the variant title has no slug", () => {
    expect(variantSku("Aros Siena", "¡!", true)).toBe("AROS-SIENA")
  })

  it("returns an empty string when the product title yields no slug", () => {
    expect(variantSku("¡!", "16", true)).toBe("")
  })
})
