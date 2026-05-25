import { test, expect } from "@playwright/test";

test.describe("Cart", () => {
  test("empty cart shows empty message", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /abrir carrito/i }).click();
    await expect(page.getByText(/carrito esta vacio|비어 있습니다/i)).toBeVisible({ timeout: 3000 });
  });

  test("add product to cart from product page", async ({ page }) => {
    await page.goto("/catalog");
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });

    const addBtn = page.locator("button").filter({ hasText: "Agregar al carrito" });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();
    await expect(page.getByText("Agregado al carrito")).toBeVisible({ timeout: 5000 });
  });
});
