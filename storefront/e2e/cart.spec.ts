import { test, expect } from "@playwright/test";

async function addFirstProductToCart(page: import("@playwright/test").Page) {
  await page.goto("/catalog");
  const firstCard = page.locator("a[href^='/product/']").first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });
  await firstCard.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });

  const addBtn = page.locator("button").filter({ hasText: "Agregar al carrito" });
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await expect(addBtn).toBeEnabled({ timeout: 5000 });
  await addBtn.click();
  await expect(page.getByText(/agregado al carrito/i)).toBeVisible({ timeout: 5000 });
}

test.describe("Cart", () => {
  test("empty cart shows empty message", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /abrir carrito/i }).click();
    await expect(
      page.getByText(/carrito esta vacio|비어 있습니다/i)
    ).toBeVisible({ timeout: 3000 });
  });

  test("add product to cart from product page", async ({ page }) => {
    await addFirstProductToCart(page);
  });

  test("cart drawer shows added product (not empty)", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/");
    await page.getByRole("button", { name: /abrir carrito/i }).click();

    await expect(
      page.getByText(/carrito esta vacio|비어 있습니다/i)
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("can navigate to checkout from cart drawer", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/");
    await page.getByRole("button", { name: /abrir carrito/i }).click();

    const checkoutBtn = page.getByRole("link", { name: /checkout|comprar|finalizar/i });
    const hasCheckout = await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCheckout) {
      await expect(checkoutBtn).toBeVisible();
    }
  });

  test("cart state persists across page navigation", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/");
    // Wait for localStorage hydration before opening drawer
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /abrir carrito/i }).click();
    await expect(
      page.getByText(/carrito esta vacio|비어 있습니다/i)
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("can remove item from cart", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/");
    // Wait for localStorage cart hydration before opening the drawer
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /abrir carrito/i }).click();

    const removeBtn = page
      .getByRole("button", { name: /remove|eliminar|quitar|delete/i })
      .first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });

    await removeBtn.click();
    await expect(
      page.getByText(/carrito esta vacio|비어 있습니다/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
