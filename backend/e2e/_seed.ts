/**
 * _seed.ts — shared E2E seeding helpers
 *
 * The admin E2E suite runs against whatever data is live in the backend. Tests
 * that need an existing record (a purchase order, a fulfillment order, a task)
 * used to `test.skip()` when the DB was empty. These helpers create the missing
 * record up-front via the authenticated admin API so those tests run for real.
 *
 * All helpers take Playwright's `request` fixture, which in the "admin" project
 * carries the stored admin auth (see e2e/setup/global-setup.spec.ts), so the
 * calls satisfy the requireRole() gates the same way a logged-in admin would.
 */
import { APIRequestContext, expect } from "@playwright/test";

/**
 * Ensures a *draft* purchase order exists and returns its id. Reuses an existing
 * draft when present (newly created POs default to "draft"); otherwise creates a
 * supplier + PO from the first available product variant. A draft is required
 * because the submit action is only offered on draft orders.
 */
export async function ensureDraftPurchaseOrder(request: APIRequestContext): Promise<string> {
  const listed = await request.get("/admin/purchase/orders?limit=100&fields=id,status");
  if (listed.ok()) {
    const { orders } = await listed.json();
    const draft = orders?.find((o: { status?: string }) => o.status === "draft");
    if (draft?.id) return draft.id;
  }

  const supplierRes = await request.post("/admin/purchase/suppliers", {
    data: { name: `E2E Seed Supplier ${Date.now()}` },
  });
  expect(
    supplierRes.ok(),
    `seed supplier failed (${supplierRes.status()}): ${await supplierRes.text()}`
  ).toBeTruthy();
  const supplierBody = await supplierRes.json();
  const supplierId = supplierBody?.supplier?.id ?? supplierBody?.id;
  expect(supplierId, "seed supplier should return an id").toBeTruthy();

  const productsRes = await request.get("/admin/products?limit=1&fields=id,variants.id");
  expect(productsRes.ok(), `fetch products failed (${productsRes.status()})`).toBeTruthy();
  const { products } = await productsRes.json();
  const variantId = products?.[0]?.variants?.[0]?.id;
  expect(variantId, "need at least one product variant to seed a purchase order").toBeTruthy();

  const poRes = await request.post("/admin/purchase/orders", {
    data: {
      supplier_id: supplierId,
      items: [{ variant_id: variantId, quantity: 1, unit_cost: 100 }],
    },
  });
  expect(
    poRes.ok(),
    `seed purchase order failed (${poRes.status()}): ${await poRes.text()}`
  ).toBeTruthy();

  // Resolve the new draft's id (re-query to stay agnostic of the create
  // workflow's response shape).
  const after = await request.get("/admin/purchase/orders?limit=100&fields=id,status");
  const draft = (await after.json()).orders?.find(
    (o: { status?: string }) => o.status === "draft"
  );
  expect(draft?.id, "a draft purchase order should exist after seeding").toBeTruthy();
  return draft.id;
}

/**
 * Creates a brand-new, completed Medusa order via the store checkout flow and
 * returns its order_id. Each fulfillment test seeds its own fresh order so the
 * one-way lifecycle (ready → picking → packed → dispatched) starts from a clean
 * state every run instead of advancing a single shared order to a terminal one.
 *
 * Mirrors the storefront checkout: create cart → set address → pick a shipping
 * option → open a payment session (manual provider) → complete the cart.
 */
export async function createFreshOrder(request: APIRequestContext): Promise<string> {
  // Store config, fetched live via the admin API.
  const keysRes = await request.get("/admin/api-keys?fields=id,token,type&limit=20");
  expect(keysRes.ok(), `fetch api-keys failed (${keysRes.status()})`).toBeTruthy();
  const publishableKey = (await keysRes.json()).api_keys?.find(
    (k: { type?: string }) => k.type === "publishable"
  )?.token;
  expect(publishableKey, "a publishable API key is required to create a store order").toBeTruthy();

  const regionRes = await request.get("/admin/regions?fields=id,countries.iso_2&limit=1");
  const region = (await regionRes.json()).regions?.[0];
  expect(region?.id, "a region is required to create a store order").toBeTruthy();
  const countryCode = region.countries?.[0]?.iso_2 ?? "ar";

  const productsRes = await request.get("/admin/products?limit=1&fields=id,variants.id");
  const variantId = (await productsRes.json()).products?.[0]?.variants?.[0]?.id;
  expect(variantId, "a product variant is required to create a store order").toBeTruthy();

  const headers = { "x-publishable-api-key": publishableKey as string };

  const cartRes = await request.post("/store/carts", {
    headers,
    data: {
      region_id: region.id,
      email: "e2e-fulfillment@test.com",
      items: [{ variant_id: variantId, quantity: 1 }],
    },
  });
  expect(cartRes.ok(), `create cart failed (${cartRes.status()}): ${await cartRes.text()}`).toBeTruthy();
  const cartId = (await cartRes.json()).cart?.id;
  expect(cartId, "cart id expected").toBeTruthy();

  const address = {
    first_name: "E2E",
    last_name: "Fulfillment",
    address_1: "Av. Siempre Viva 123",
    city: "CABA",
    country_code: countryCode,
    postal_code: "1000",
    province: "CABA",
    phone: "1130000000",
  };
  const addrRes = await request.post(`/store/carts/${cartId}`, {
    headers,
    data: { shipping_address: address, billing_address: address },
  });
  expect(addrRes.ok(), `set cart address failed (${addrRes.status()})`).toBeTruthy();

  const soRes = await request.get(`/store/shipping-options?cart_id=${cartId}`, { headers });
  const optionId = (await soRes.json()).shipping_options?.[0]?.id;
  expect(optionId, "a shipping option is required").toBeTruthy();
  const smRes = await request.post(`/store/carts/${cartId}/shipping-methods`, {
    headers,
    data: { option_id: optionId },
  });
  expect(smRes.ok(), `set shipping method failed (${smRes.status()})`).toBeTruthy();

  const pcRes = await request.post(`/store/payment-collections`, {
    headers,
    data: { cart_id: cartId },
  });
  const pcId = (await pcRes.json()).payment_collection?.id;
  expect(pcId, "payment collection id expected").toBeTruthy();
  const psRes = await request.post(`/store/payment-collections/${pcId}/payment-sessions`, {
    headers,
    data: { provider_id: "pp_system_default" },
  });
  expect(psRes.ok(), `create payment session failed (${psRes.status()})`).toBeTruthy();

  const completeRes = await request.post(`/store/carts/${cartId}/complete`, { headers });
  const completeBody = await completeRes.json();
  expect(
    completeBody?.type === "order" && Boolean(completeBody?.order?.id),
    `complete cart failed: ${JSON.stringify(completeBody).slice(0, 200)}`
  ).toBeTruthy();

  return completeBody.order.id as string;
}

/** Creates a team task with a valid status and returns { id, title }. */
export async function createTask(
  request: APIRequestContext,
  title = `E2E Seed Task ${Date.now()}`
): Promise<{ id: string; title: string }> {
  const res = await request.post("/admin/team-tasks", {
    data: { title, status: "todo", priority: "low" },
  });
  expect(
    res.ok(),
    `seed task failed (${res.status()}): ${await res.text()}`
  ).toBeTruthy();
  const body = await res.json();
  const id = body?.task?.id ?? body?.id;
  expect(id, "seed task should return an id").toBeTruthy();
  return { id, title };
}
