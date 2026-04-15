import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
// docs/medusa-auth-keys.md — these tests guard against the "stale publishable key after DB rebuild" failure
// where the storefront silently shows 0 results instead of throwing an obvious error.

const mockedFetch = vi.fn()
let lastConfig: Record<string, unknown> | null = null

vi.mock("@medusajs/js-sdk", () => {
  class MockMedusa {
    client = {
      fetch: mockedFetch,
    }

    constructor(config: Record<string, unknown>) {
      lastConfig = config
    }
  }

  return {
    default: MockMedusa,
  }
})

const ORIGINAL_ENV = process.env

describe("medusa lib", () => {
  beforeEach(() => {
    vi.resetModules()
    mockedFetch.mockReset()
    lastConfig = null
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    vi.restoreAllMocks()
  })

  it("uses region_id when NEXT_PUBLIC_MEDUSA_REGION_ID is available", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID = "reg_123"
    process.env.NEXT_PUBLIC_MEDUSA_COUNTRY_CODE = "AR"
    const mod = await import("./medusa")

    expect(mod.withStorePricingContext({ limit: 5 })).toEqual({
      limit: 5,
      region_id: "reg_123",
    })
  })

  it("falls back to lowercased country_code when region is missing", async () => {
    delete process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
    process.env.NEXT_PUBLIC_MEDUSA_COUNTRY_CODE = "MX"
    const mod = await import("./medusa")

    expect(mod.withStorePricingContext({ offset: 10 })).toEqual({
      offset: 10,
      country_code: "mx",
    })
  })

  it("initializes sdk with the internal proxy path and publishable key", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_valid_key"
    await import("./medusa")

    expect(lastConfig).toEqual({
      baseUrl: "/api/medusa",
      publishableKey: "pk_valid_key",
    })
  })

  it("adds env hint on failed network calls", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_1234567890"
    mockedFetch.mockRejectedValueOnce(new Error("Failed to fetch"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mod = await import("./medusa")

    await expect(mod.sdk.client.fetch("/store/products/prod_123")).rejects.toThrow(
      "Check storefront env (backend=/api/medusa, publishableKey=pk_1234...)"
    )
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  it("does not log expected 4xx errors", async () => {
    mockedFetch.mockRejectedValueOnce({
      status: 400,
      message: "A valid publishable key is required to proceed with the request",
    })
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mod = await import("./medusa")

    await expect(mod.sdk.client.fetch("/store/products/prod_123")).rejects.toThrow(
      "publishable key"
    )
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("includes partial key in the error hint so the stale key is identifiable in logs", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_1b12cc46stalekey"
    mockedFetch.mockRejectedValueOnce({
      status: 400,
      message: "A valid publishable key is required to proceed with the request",
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const mod = await import("./medusa")

    await expect(mod.sdk.client.fetch("/store/products")).rejects.toThrow(
      "publishableKey=pk_1b12..."
    )
  })
})

// ─── validateMedusaEnv ────────────────────────────────────────────────────────
// These tests guard against silent misconfiguration after a DB rebuild.
// See docs/medusa-auth-keys.md for context.

describe("validateMedusaEnv", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it("returns no warnings when both key and region are correctly set", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_4050679ff210valid"
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID = "reg_01KME63SCBE7F8K1"
    const { validateMedusaEnv } = await import("./medusa")

    expect(validateMedusaEnv()).toEqual([])
  })

  it("warns when publishable key is missing — catches fresh DB rebuild with no .env.local update", async () => {
    delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID = "reg_valid"
    const { validateMedusaEnv } = await import("./medusa")

    const warnings = validateMedusaEnv()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set/)
  })

  it("warns when publishable key lacks pk_ prefix — catches copy-paste of wrong value", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "sk_accidental_secret_key"
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID = "reg_valid"
    const { validateMedusaEnv } = await import("./medusa")

    const warnings = validateMedusaEnv()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/unexpected format/)
    expect(warnings[0]).toMatch(/pk_/)
  })

  it("warns when region ID is missing — catches fresh DB rebuild", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_valid"
    delete process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
    const { validateMedusaEnv } = await import("./medusa")

    const warnings = validateMedusaEnv()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/NEXT_PUBLIC_MEDUSA_REGION_ID is not set/)
  })

  it("warns when region ID lacks reg_ prefix — catches stale or malformed value", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_valid"
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID = "old_region_format"
    const { validateMedusaEnv } = await import("./medusa")

    const warnings = validateMedusaEnv()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/unexpected format/)
    expect(warnings[0]).toMatch(/reg_/)
  })

  it("returns two warnings when both key and region are missing — full rebuild scenario", async () => {
    delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
    const { validateMedusaEnv } = await import("./medusa")

    const warnings = validateMedusaEnv()
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toMatch(/PUBLISHABLE_KEY/)
    expect(warnings[1]).toMatch(/REGION_ID/)
  })
})
