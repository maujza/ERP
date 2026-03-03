import Medusa from "@medusajs/js-sdk"

const RAW_MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
export const MEDUSA_BACKEND_URL =
  typeof window !== "undefined" && RAW_MEDUSA_BACKEND_URL.startsWith("/")
    ? new URL(RAW_MEDUSA_BACKEND_URL, window.location.origin).toString()
    : RAW_MEDUSA_BACKEND_URL
export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
export const MEDUSA_REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || ""
export const MEDUSA_COUNTRY_CODE = (process.env.NEXT_PUBLIC_MEDUSA_COUNTRY_CODE || "ar").toLowerCase()

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
})

const originalClientFetch = sdk.client.fetch.bind(sdk.client)
sdk.client.fetch = async (input, init) => {
  try {
    return await originalClientFetch(input, init)
  } catch (error) {
    const path =
      input instanceof URL
        ? input.toString()
        : typeof input === "string"
          ? input
          : String(input)
    const numericStatus =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status ?? 0)
        : 0
    const status = numericStatus > 0 ? String(numericStatus) : ""
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "Unknown error")
          : "Unknown error"
    const detail = status
      ? `Medusa API error (${status}) on ${path}: ${message}`
      : `Medusa API error on ${path}: ${message}`
    const envHint = `backend=${MEDUSA_BACKEND_URL}, publishableKey=${MEDUSA_PUBLISHABLE_KEY ? `${MEDUSA_PUBLISHABLE_KEY.slice(0, 7)}...` : "(missing)"}`
    const withHint =
      message.includes("Failed to fetch") ||
      message.includes("publishable key")
        ? `${detail} | Check storefront env (${envHint})`
        : detail

    // Avoid noisy console errors for expected 4xx user input cases (for example invalid promo code).
    if (!numericStatus || numericStatus >= 500) {
      console.error(withHint, { path, status, error })
    }
    throw new Error(withHint)
  }
}

export function withStorePricingContext<T extends Record<string, unknown>>(params: T): T {
  if (MEDUSA_REGION_ID) {
    return { ...params, region_id: MEDUSA_REGION_ID }
  }
  return { ...params, country_code: MEDUSA_COUNTRY_CODE }
}
