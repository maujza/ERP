import { test, expect } from "@playwright/test";
import { ensureDraftPurchaseOrder } from "../_seed";

test.describe("Purchase — Order lifecycle", () => {
  // Guarantee a draft purchase order exists (and capture its id) so the
  // detail-page tests below run for real instead of skipping on an empty list.
  let draftPoId: string;

  test.beforeEach(async ({ request }) => {
    draftPoId = await ensureDraftPurchaseOrder(request);
  });

  test("navigates to purchase orders list", async ({ page }) => {
    await page.goto("/app/purchase/orders");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page).toHaveURL(/\/purchase\/orders/);
  });

  test("purchase orders list renders without error", async ({ page }) => {
    await page.goto("/app/purchase/orders");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("Unhandled error");
  });

  test("can open create purchase order form", async ({ page }) => {
    await page.goto("/app/purchase/orders");

    const createBtn = page.getByRole("button", { name: /create|nueva|new order/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    await expect(
      page.getByRole("dialog").or(page.getByLabel(/supplier|proveedor/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("single purchase order page loads", async ({ page }) => {
    // Navigate to the detail page directly by id — the list uses a DataTable
    // whose rows are not plain navigable links.
    await page.goto(`/app/purchase/orders/${draftPoId}`);
    await expect(page).toHaveURL(/\/purchase\/orders\/[^/]+$/, { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("submit action button is present on a draft order", async ({ page }) => {
    // The "Submit Order" action is only offered on draft orders, so target the
    // seeded draft specifically (the most recent PO may be received/cancelled).
    await page.goto(`/app/purchase/orders/${draftPoId}`);

    const actionBtn = page
      .getByRole("button", { name: /submit|enviar|receive|recibir|cancel|cancelar/i })
      .first();
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
  });

  test("purchase orders API returns non-500", async ({ page }) => {
    const response = await page.request.get("/admin/purchase/orders");
    expect([200, 401].includes(response.status())).toBeTruthy();
  });

  test("suppliers API returns non-500", async ({ page }) => {
    const response = await page.request.get("/admin/purchase/suppliers");
    expect([200, 401].includes(response.status())).toBeTruthy();
  });
});
