import { test, expect } from "@playwright/test";

test.describe("Catalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalog");
  });

  test("shows product grid", async ({ page }) => {
    const cards = page.locator("a[href^='/product/']");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("filter buttons are visible", async ({ page }) => {
    await expect(page.getByText("Todos").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to product on card click", async ({ page }) => {
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });
  });
});
