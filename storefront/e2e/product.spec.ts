import { test, expect } from "@playwright/test";

test.describe("Product page", () => {
  test("loads product detail from catalog", async ({ page }) => {
    await page.goto("/catalog");
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });
    await expect(page.getByText(/\$\s*[\d.,]+/)).toBeVisible({ timeout: 5000 });
  });

  test("add to cart button is present", async ({ page }) => {
    await page.goto("/catalog");
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    // Button text is "Agregar al carrito" — may be disabled if variant selection is required
    await expect(page.locator("button").filter({ hasText: /agregar al carrito/i })).toBeVisible({ timeout: 5000 });
  });
});
