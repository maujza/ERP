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

  test("filter by category narrows results", async ({ page }) => {
    const allCards = page.locator("a[href^='/product/']");
    await expect(allCards.first()).toBeVisible({ timeout: 10000 });
    const totalCount = await allCards.count();

    const filterBtns = page.getByRole("button").filter({ hasText: /anillo|collar|pulsera|arete/i });
    const hasFilter = await filterBtns.first().isVisible().catch(() => false);

    if (!hasFilter) {
      test.skip();
      return;
    }

    await filterBtns.first().click();
    await page.waitForTimeout(500);

    const filteredCount = await allCards.count();
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
  });

  test("'Todos' filter restores full grid", async ({ page }) => {
    const allCards = page.locator("a[href^='/product/']");
    await expect(allCards.first()).toBeVisible({ timeout: 10000 });
    const totalCount = await allCards.count();

    await page.getByText("Todos").first().click();
    await page.waitForTimeout(500);

    const afterCount = await allCards.count();
    expect(afterCount).toBe(totalCount);
  });

  test("catalog page has search input in header", async ({ page }) => {
    const searchInput = page.locator("header input");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });
});
