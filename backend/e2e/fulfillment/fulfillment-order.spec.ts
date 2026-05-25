import { test, expect } from "@playwright/test";

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

  test("single fulfillment order page loads", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (!hasRows) {
      test.skip();
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/fulfillment\/orders\//, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("pick action button is present on a pending fulfillment order", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (!hasRows) {
      test.skip();
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/fulfillment\/orders\//, { timeout: 5000 });

    const actionBtn = page
      .getByRole("button", { name: /pick|pack|dispatch|despachar|embalar/i })
      .first();
    await expect(actionBtn).toBeVisible({ timeout: 5000 });
  });

  test("startPickingWorkflow API step returns non-500", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (!hasRows) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const orderId = url.split("/fulfillment/orders/")[1]?.split("/")[0];

    if (!orderId) {
      test.skip();
      return;
    }

    const response = await page.request.post(`/admin/fulfillment/orders/${orderId}/pick`);
    expect([200, 400, 422].includes(response.status())).toBeTruthy();
  });

  test("confirmPackWorkflow API step returns non-500", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (!hasRows) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const orderId = url.split("/fulfillment/orders/")[1]?.split("/")[0];

    if (!orderId) {
      test.skip();
      return;
    }

    const response = await page.request.post(`/admin/fulfillment/orders/${orderId}/pack`);
    expect([200, 400, 422].includes(response.status())).toBeTruthy();
  });

  test("dispatchOrderWorkflow API step returns non-500", async ({ page }) => {
    await page.goto("/app/fulfillment/orders");

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (!hasRows) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const orderId = url.split("/fulfillment/orders/")[1]?.split("/")[0];

    if (!orderId) {
      test.skip();
      return;
    }

    const response = await page.request.post(`/admin/fulfillment/orders/${orderId}/dispatch`);
    expect([200, 400, 422].includes(response.status())).toBeTruthy();
  });
});
