import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

  it("initializes sdk with backend URL and publishable key from env", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "http://localhost:9000"
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_valid_key"
    await import("./medusa")

    expect(lastConfig).toEqual({
      baseUrl: "http://localhost:9000",
      publishableKey: "pk_valid_key",
    })
  })

  it("adds env hint on failed network calls", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "http://localhost:9000"
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_1234567890"
    mockedFetch.mockRejectedValueOnce(new Error("Failed to fetch"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mod = await import("./medusa")

    await expect(mod.sdk.client.fetch("/store/products/prod_123")).rejects.toThrow(
      "Check storefront env (backend=http://localhost:9000, publishableKey=pk_1234...)"
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
})
