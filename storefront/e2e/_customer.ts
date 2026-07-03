import { readFileSync } from "node:fs";
import path from "node:path";
import { APIRequestContext, expect } from "@playwright/test";

/**
 * Reads a single KEY=VALUE entry from storefront/.env.development. Playwright
 * doesn't load .env files, so this is the only way to pick up the publishable
 * key/region that scripts/sync-medusa-env.sh keeps in sync with the database.
 */
function readDevEnvVar(key: string): string | undefined {
  const envPath = path.resolve(__dirname, "../.env.development");
  let contents: string;
  try {
    contents = readFileSync(envPath, "utf-8");
  } catch {
    return undefined;
  }
  for (const line of contents.split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k === key) return rest.join("=").trim();
  }
  return undefined;
}

/**
 * API helpers for the storefront account E2E. These talk directly to the Medusa
 * backend. They let the browser test focus on the UI while data is set up via
 * the API.
 */
// No fallback: these helpers call the Medusa admin/store API directly (not
// through the browser's BASE_URL), and a silent default here once pointed
// straight at a colocated prod backend on a shared host/port — see
// CHANGELOG.md. Forcing callers to set this explicitly makes a missing var
// fail loud instead of writing test data to whatever happens to answer on
// the default port.
if (!process.env.BACKEND_URL) {
  throw new Error(
    "BACKEND_URL is not set. Export it explicitly (e.g. BACKEND_URL=http://localhost:9000 for local dev " +
      "against your own backend) before running these e2e helpers."
  );
}
export const BACKEND_URL: string = process.env.BACKEND_URL;
const _publishableKey =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? readDevEnvVar("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

if (!_publishableKey) {
  throw new Error(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set and storefront/.env.development has no value for it. " +
      "Run `npm run medusa:sync-env` (from storefront/) to populate it from the database."
  );
}

export const PUBLISHABLE_KEY: string = _publishableKey;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@aurorapormayor.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "supersecret";

export type StoreCustomer = {
  customerId: string;
  email: string;
  password: string;
  token: string;
  firstName: string;
  lastName: string;
};

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/auth/user/emailpass`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `admin login failed (${res.status()})`).toBeTruthy();
  return (await res.json()).token as string;
}

/**
 * Creates a dedicated, self-contained product (published, default sales channel,
 * default shipping profile, 50 units of stock) for an order to be placed against,
 * so the test never depends on or depletes the shared seeded catalog.
 */
export async function createOrderableProductApi(
  request: APIRequestContext
): Promise<{ productId: string; variantId: string }> {
  const aToken = await adminToken(request);
  const A = { Authorization: `Bearer ${aToken}` };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channels = (await (await request.get(`${BACKEND_URL}/admin/sales-channels?fields=id,name&limit=100`, { headers: A })).json()).sales_channels as any[];
  const salesChannelId = channels.find((c) => c.name === "Default Sales Channel")?.id ?? channels[0].id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations = (await (await request.get(`${BACKEND_URL}/admin/stock-locations?fields=id,name`, { headers: A })).json()).stock_locations as any[];
  const locationId = locations.find((l) => l.name === "Buenos Aires")?.id ?? locations[0].id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (await (await request.get(`${BACKEND_URL}/admin/shipping-profiles?fields=id,type&limit=10`, { headers: A })).json()).shipping_profiles as any[];
  const shippingProfileId = profiles.find((p) => p.type === "default")?.id ?? profiles[0].id;

  const sku = `E2E-ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const createRes = await request.post(`${BACKEND_URL}/admin/products`, {
    headers: A,
    data: {
      title: `E2E Orderable ${sku}`,
      status: "published",
      shipping_profile_id: shippingProfileId,
      options: [{ title: "Modelo", values: ["Única"] }],
      variants: [
        { title: "Única", sku, manage_inventory: true, options: { Modelo: "Única" }, prices: [{ amount: 10000, currency_code: "ars" }] },
      ],
      sales_channels: [{ id: salesChannelId }],
    },
  });
  expect(createRes.ok(), `create orderable product failed (${createRes.status()}): ${await createRes.text()}`).toBeTruthy();
  const product = (await createRes.json()).product;
  const variantId = product.variants[0].id as string;

  const viaProduct = await request.get(
    `${BACKEND_URL}/admin/products/${product.id}?fields=variants.inventory_items.inventory.id`,
    { headers: A }
  );
  let inventoryItemId = (await viaProduct.json()).product?.variants?.[0]?.inventory_items?.[0]?.inventory?.id;
  if (!inventoryItemId) {
    const viaSku = await request.get(`${BACKEND_URL}/admin/inventory-items?q=${sku}&fields=id,sku`, { headers: A });
    inventoryItemId = (await viaSku.json()).inventory_items?.[0]?.id;
  }
  expect(inventoryItemId, "inventory item id expected").toBeTruthy();
  await request.post(`${BACKEND_URL}/admin/inventory-items/${inventoryItemId}/location-levels`, {
    headers: A,
    data: { location_id: locationId, stocked_quantity: 50 },
  });

  return { productId: product.id, variantId };
}

/** Best-effort delete of a product by id (afterEach cleanup). */
export async function deleteProductById(request: APIRequestContext, productId: string): Promise<void> {
  const aToken = await adminToken(request);
  await request
    .delete(`${BACKEND_URL}/admin/products/${productId}`, { headers: { Authorization: `Bearer ${aToken}` } })
    .catch(() => null);
}

/** Registers a customer via the store auth flow (same as the /auth page does). */
export async function registerCustomerApi(
  request: APIRequestContext,
  opts: { email?: string; firstName?: string; lastName?: string } = {}
): Promise<StoreCustomer> {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = opts.email ?? `e2e-acct-${stamp}@test.com`;
  const password = "supersecret";
  const firstName = opts.firstName ?? "Aurora";
  const lastName = opts.lastName ?? "Cliente";

  const reg = await request.post(`${BACKEND_URL}/auth/customer/emailpass/register`, {
    data: { email, password },
  });
  expect(reg.ok(), `register failed (${reg.status()}): ${await reg.text()}`).toBeTruthy();
  const regToken = (await reg.json()).token as string;

  const create = await request.post(`${BACKEND_URL}/store/customers`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY, Authorization: `Bearer ${regToken}` },
    data: { email, first_name: firstName, last_name: lastName },
  });
  expect(create.ok(), `create customer failed (${create.status()}): ${await create.text()}`).toBeTruthy();
  const customerId = (await create.json()).customer.id as string;

  const login = await request.post(`${BACKEND_URL}/auth/customer/emailpass`, {
    data: { email, password },
  });
  expect(login.ok(), `customer login failed (${login.status()})`).toBeTruthy();
  const token = (await login.json()).token as string;

  return { customerId, email, password, token, firstName, lastName };
}

/**
 * Places a customer-linked order and drives it to captured + delivered, so the
 * account page renders it with completed payment and fulfillment steps.
 */
export async function seedDeliveredOrder(
  request: APIRequestContext,
  customer: StoreCustomer
): Promise<{ orderId: string; productId: string }> {
  const storeHeaders = {
    "x-publishable-api-key": PUBLISHABLE_KEY,
    Authorization: `Bearer ${customer.token}`,
  };
  const pkHeaders = { "x-publishable-api-key": PUBLISHABLE_KEY };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regions = (await (await request.get(`${BACKEND_URL}/store/regions`, { headers: pkHeaders })).json()).regions as any[];
  const region = regions.find((r) => r.currency_code === "ars") ?? regions[0];
  // Dedicated product so the order never depends on / depletes the shared catalog.
  const { productId, variantId } = await createOrderableProductApi(request);

  const cartId = (
    await (
      await request.post(`${BACKEND_URL}/store/carts`, {
        headers: storeHeaders,
        data: { region_id: region.id, email: customer.email, items: [{ variant_id: variantId, quantity: 1 }] },
      })
    ).json()
  ).cart.id;

  const address = {
    first_name: customer.firstName,
    last_name: customer.lastName,
    address_1: "Av. Siempre Viva 123",
    city: "CABA",
    country_code: "ar",
    postal_code: "1000",
    province: "caba",
    phone: "1130000000",
  };
  await request.post(`${BACKEND_URL}/store/carts/${cartId}`, {
    headers: storeHeaders,
    data: { shipping_address: address, billing_address: address },
  });
  const optionId = (
    await (await request.get(`${BACKEND_URL}/store/shipping-options?cart_id=${cartId}`, { headers: storeHeaders })).json()
  ).shipping_options[0].id;
  await request.post(`${BACKEND_URL}/store/carts/${cartId}/shipping-methods`, {
    headers: storeHeaders,
    data: { option_id: optionId },
  });
  const pcId = (
    await (await request.post(`${BACKEND_URL}/store/payment-collections`, { headers: storeHeaders, data: { cart_id: cartId } })).json()
  ).payment_collection.id;
  await request.post(`${BACKEND_URL}/store/payment-collections/${pcId}/payment-sessions`, {
    headers: storeHeaders,
    data: { provider_id: "pp_system_default" },
  });
  const completeBody = await (await request.post(`${BACKEND_URL}/store/carts/${cartId}/complete`, { headers: storeHeaders })).json();
  const orderId = completeBody.order?.id as string;
  expect(orderId, `order completion failed: ${JSON.stringify(completeBody).slice(0, 200)}`).toBeTruthy();

  // Admin: capture payment, then fulfill → ship → deliver.
  const aToken = await adminToken(request);
  const adminHeaders = { Authorization: `Bearer ${aToken}` };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payCols = (await (await request.get(`${BACKEND_URL}/admin/orders/${orderId}?fields=payment_collections.payments.id`, { headers: adminHeaders })).json()).order.payment_collections as any[];
  for (const pc of payCols ?? []) {
    for (const p of pc.payments ?? []) {
      await request.post(`${BACKEND_URL}/admin/payments/${p.id}/capture`, { headers: adminHeaders, data: {} });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations = (await (await request.get(`${BACKEND_URL}/admin/stock-locations?fields=id,name`, { headers: adminHeaders })).json()).stock_locations as any[];
  const locationId = locations.find((l) => l.name === "Buenos Aires")?.id ?? locations[0].id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = ((await (await request.get(`${BACKEND_URL}/admin/orders/${orderId}?fields=*items`, { headers: adminHeaders })).json()).order.items as any[]).map((i) => ({ id: i.id, quantity: i.quantity }));

  await request.post(`${BACKEND_URL}/admin/orders/${orderId}/fulfillments`, {
    headers: adminHeaders,
    data: { items, location_id: locationId },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fulfillments = (await (await request.get(`${BACKEND_URL}/admin/orders/${orderId}?fields=fulfillments.id`, { headers: adminHeaders })).json()).order.fulfillments as any[];
  const fid = fulfillments[fulfillments.length - 1].id;
  await request.post(`${BACKEND_URL}/admin/orders/${orderId}/fulfillments/${fid}/shipments`, { headers: adminHeaders, data: { items } });
  await request.post(`${BACKEND_URL}/admin/orders/${orderId}/fulfillments/${fid}/mark-as-delivered`, { headers: adminHeaders, data: {} });

  return { orderId, productId };
}

/** Best-effort cancel of an order by id (afterEach cleanup). Cancellation frees inventory reservations so the product can then be deleted. */
export async function cancelOrderById(request: APIRequestContext, orderId: string): Promise<void> {
  const aToken = await adminToken(request);
  await request
    .post(`${BACKEND_URL}/admin/orders/${orderId}/cancel`, { headers: { Authorization: `Bearer ${aToken}` } })
    .catch(() => null);
}

/** Best-effort delete of a customer by email (afterEach cleanup). */
export async function deleteCustomerByEmail(request: APIRequestContext, email: string): Promise<void> {
  const aToken = await adminToken(request);
  const adminHeaders = { Authorization: `Bearer ${aToken}` };
  const res = await request.get(
    `${BACKEND_URL}/admin/customers?q=${encodeURIComponent(email)}&fields=id,email`,
    { headers: adminHeaders }
  );
  if (!res.ok()) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (await res.json()).customers?.find((c: any) => c.email === email);
  if (customer) {
    await request.delete(`${BACKEND_URL}/admin/customers/${customer.id}`, { headers: adminHeaders }).catch(() => null);
  }
}
