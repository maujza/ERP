import { test, expect } from "@playwright/test";

test.describe("Checkout", () => {
  test("empty checkout does not crash", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("checkout shows contact form after adding product", async ({ page }) => {
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

    await page.goto("/checkout");
    await expect(page.getByText(/paso 1.*contacto/i)).toBeVisible({ timeout: 5000 });
  });
});
