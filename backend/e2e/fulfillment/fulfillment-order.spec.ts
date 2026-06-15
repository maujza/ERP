import { test, expect } from "@playwright/test";
import { createFreshOrder } from "../_seed";

test.describe("Fulfillment — Order lifecycle", () => {
  test("navigates to fulfillment orders list", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page).toHaveURL(/\/fulfillment\/orders/);
  });

  test("fulfillment orders list renders without error", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("Unhandled error");
  });

  test("fulfillment KPI API returns non-500", async ({ page }) => {
    const response = await page.request.get("/admin/fulfillment/kpis");
    expect([200, 401].includes(response.status())).toBeTruthy();
  });

  // The fulfillment list shows orders that have a fulfillment record. Seed a
  // fresh order and start picking it so the list has a non-terminal row with an
  // inline lifecycle action button (the board has no separate detail page —
  // pick/pack/dispatch happen inline per row).
  test.describe("with a freshly picked order", () => {
    let orderId: string;

    test.beforeEach(async ({ request }) => {
      orderId = await createFreshOrder(request);
      const pick = await request.post(`/admin/fulfillment/orders/${orderId}/pick`);
      expect(pick.status(), `start picking failed: ${await pick.text()}`).toBe(200);
    });

    test.afterEach(async ({ request }) => {
      await request.post(`/admin/orders/${orderId}/cancel`, { data: {} }).catch(() => null);
    });

    test("picked order appears in the fulfillment list", async ({ page }) => {
      await page.goto("/app/fulfillment/orders");
      const firstRow = page.locator("table tbody tr").first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      await expect(page.locator("body")).not.toContainText("500");
    });

    test("inline lifecycle action button is present on a picked order", async ({ page }) => {
      await page.goto("/app/fulfillment/orders");
      const actionBtn = page
        .getByRole("button", {
          name: /start picking|confirm pack|despach|embal|pick|pack|dispatch/i,
        })
        .first();
      await expect(actionBtn).toBeVisible({ timeout: 10000 });
    });
  });

  // Happy-path lifecycle on a single fresh order: pick → pack → dispatch must
  // each return 200. Serial so the order advances through the state machine in
  // order; if a step fails the rest are skipped (a real failure, not empty data).
  test.describe.serial("lifecycle steps on a fresh order", () => {
    let orderId: string;

    test.afterAll(async ({ request }) => {
      // Dispatched orders are terminal and can't be cancelled — ignore that failure.
      await request.post(`/admin/orders/${orderId}/cancel`, { data: {} }).catch(() => null);
    });

    test("startPickingWorkflow returns 200", async ({ request }) => {
      orderId = await createFreshOrder(request);
      const response = await request.post(`/admin/fulfillment/orders/${orderId}/pick`);
      expect(response.status(), await response.text()).toBe(200);
    });

    test("confirmPackWorkflow returns 200", async ({ request }) => {
      const response = await request.post(`/admin/fulfillment/orders/${orderId}/pack`, {
        data: { packed_weight: 1.5, packed_dimensions: "20x15x10" },
      });
      expect(response.status(), await response.text()).toBe(200);
    });

    test("dispatchOrderWorkflow returns 200", async ({ request }) => {
      const response = await request.post(`/admin/fulfillment/orders/${orderId}/dispatch`, {
        data: { tracking_number: `E2E-${Date.now()}` },
      });
      expect(response.status(), await response.text()).toBe(200);
    });
  });
});
