import { test, expect } from "@playwright/test";

import { createManagedProduct, resolveStockLocationId } from "../_seed";

/**
 * Inventory workflow E2E — adds stock to an inventory-managed product and
 * verifies the quantity is persisted (admin API) and visible to the storefront
 * (store API). Each test creates its own product and deletes it afterwards so
 * the suite leaves no residue.
 */
test.describe("Inventory — add and verify stock for a managed product", () => {
  /** Product created during a test — deleted in afterEach. */
  let productId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (productId) {
      await request.delete(`/admin/products/${productId}`).catch(() => null);
      productId = null;
    }
  });

  test("creating a location level reflects the stocked quantity in admin APIs", async ({ request }) => {
    const { productId: pid, inventoryItemId } = await createManagedProduct(request);
    productId = pid;
    const locationId = await resolveStockLocationId(request);
    const QTY = 42;

    const levelRes = await request.post(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
      data: { location_id: locationId, stocked_quantity: QTY },
    });
    expect(
      levelRes.ok(),
      `create location level failed (${levelRes.status()}): ${await levelRes.text()}`
    ).toBeTruthy();

    // The inventory item's location levels are the authoritative admin record of
    // stock. (The admin single-product endpoint does not compute
    // variant.inventory_quantity — that computed field is asserted via the store
    // API in the storefront-visibility test below.)
    const levelsRes = await request.get(`/admin/inventory-items/${inventoryItemId}/location-levels`);
    expect(levelsRes.ok(), `fetch levels failed (${levelsRes.status()})`).toBeTruthy();
    const { inventory_levels } = await levelsRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const level = inventory_levels?.find((l: any) => l.location_id === locationId);
    expect(level?.stocked_quantity, "stocked quantity should match what was set").toBe(QTY);
    expect(level?.available_quantity, "available quantity should match (no reservations)").toBe(QTY);
  });

  test("updating a location level changes the available quantity", async ({ request }) => {
    const { productId: pid, inventoryItemId } = await createManagedProduct(request);
    productId = pid;
    const locationId = await resolveStockLocationId(request);

    const create = await request.post(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
      data: { location_id: locationId, stocked_quantity: 10 },
    });
    expect(create.ok(), `create level failed (${create.status()}): ${await create.text()}`).toBeTruthy();

    const update = await request.post(
      `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      { data: { stocked_quantity: 75 } }
    );
    expect(update.ok(), `update level failed (${update.status()}): ${await update.text()}`).toBeTruthy();

    const levelsRes = await request.get(`/admin/inventory-items/${inventoryItemId}/location-levels`);
    const { inventory_levels } = await levelsRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const level = inventory_levels?.find((l: any) => l.location_id === locationId);
    expect(level?.stocked_quantity).toBe(75);
  });

  test("stock is visible to the storefront store API", async ({ request }) => {
    const { productId: pid, variantId, inventoryItemId } = await createManagedProduct(request);
    productId = pid;
    const locationId = await resolveStockLocationId(request);
    const QTY = 30;

    const levelRes = await request.post(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
      data: { location_id: locationId, stocked_quantity: QTY },
    });
    expect(levelRes.ok(), `create level failed (${levelRes.status()}): ${await levelRes.text()}`).toBeTruthy();

    // The storefront reads stock through the publishable-key-scoped store API.
    const keysRes = await request.get("/admin/api-keys?fields=id,token,type&limit=20");
    expect(keysRes.ok(), `fetch api-keys failed (${keysRes.status()})`).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publishableKey = (await keysRes.json()).api_keys?.find((k: any) => k.type === "publishable")?.token;
    expect(publishableKey, "a publishable API key is required for the store API").toBeTruthy();

    const storeRes = await request.get(
      `/store/products/${pid}?fields=id,*variants,+variants.inventory_quantity`,
      { headers: { "x-publishable-api-key": publishableKey as string } }
    );
    expect(storeRes.ok(), `store fetch failed (${storeRes.status()}): ${await storeRes.text()}`).toBeTruthy();
    const { product } = await storeRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variant =
      product.variants?.find((v: any) => v.id === variantId) ?? product.variants?.[0];
    expect(variant?.inventory_quantity, "store API should expose the stocked quantity").toBe(QTY);
  });
});
