# storefront/src/lib — Shared Library Utilities

This folder contains the low-level utilities and SDK clients that the rest of the storefront imports. No React components live here — only plain TypeScript modules.

## Files

### `medusa.ts` — Medusa SDK client

The single source of truth for talking to the Medusa backend.

- Creates one `sdk` instance (the Medusa JS SDK) configured with the backend URL and publishable key.
- All pages and components import `sdk` from this file instead of creating their own instances.
- Wraps `sdk.client.fetch` to produce readable error messages when the backend is unreachable.
- Exports `withStorePricingContext` — adds `region_id` or `country_code` to query params so Medusa returns the correct ARS prices.
- Exports `validateMedusaEnv` — call at app startup to catch stale or missing env vars before they cause silent "0 results" pages.

**Key env vars:** `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_REGION_ID`, `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE`

---

### `shop-data.ts` — Product types, catalog constants, and mapping utilities

The bridge between raw Medusa API responses and the `Product` shape used in the UI.

- Defines `Product` and `ProductVariant` TypeScript types.
- Exports the static `brands` list (shown in sidebar filters). Categories and collections are derived from backend data at runtime.
- `mapMedusaProduct(p)` — converts a Medusa API product object into a `Product`.
- `formatArs(value, language)` — formats a number as ARS currency (handles es/ko locale).
- `translateLabel(value, language)` — returns the Spanish or Korean version of a category name.
- `getProductName` / `getProductDescription` — language-aware accessors that fall back to Spanish.
- `isJewelryProduct(product)` — filters out non-jewelry merch items.

Korean product names are stored as Medusa product metadata (`metadata.name_ko`, `metadata.description_ko`). Set them in the Medusa admin panel — no code change needed.

---

### `whatsapp.ts` — WhatsApp deep-link and draft helpers

Utilities for the "pay via WhatsApp" checkout flow.

- `buildWhatsAppLink(phone, message)` — builds a `wa.me/...` URL that opens WhatsApp with a pre-filled message.
- `saveWhatsAppDraft(draft)` / `readWhatsAppDraft()` — persist and retrieve the pending order in `localStorage` so it survives a page refresh.
- `openWhatsAppDraft(draft)` — opens the WhatsApp link in a new tab.

All functions guard against running in SSR (server-side rendering) by checking `typeof window === "undefined"`.

---

### `utils.ts` — General purpose utilities

Small helper functions used across multiple components (className merging, etc.).
