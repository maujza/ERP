import { test, expect } from "@playwright/test";

async function navigateToFirstProduct(page: import("@playwright/test").Page) {
  await page.goto("/catalog");
  const firstCard = page.locator("a[href^='/product/']").first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });
  await firstCard.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });
  // Select first variant if the product requires one before add-to-cart is enabled
  const firstVariantBtn = page.locator("div.flex.flex-wrap.gap-2 button").first();
  if (await firstVariantBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstVariantBtn.click();
  }
}

test.describe("Product page", () => {
  test("loads product detail from catalog", async ({ page }) => {
    await navigateToFirstProduct(page);
    await expect(page.getByText(/\$\s*[\d.,]+/)).toBeVisible({ timeout: 5000 });
  });

  test("product title is displayed", async ({ page }) => {
    await navigateToFirstProduct(page);
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 5000 });
    const title = await heading.textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test("product price is displayed in ARS", async ({ page }) => {
    await navigateToFirstProduct(page);
    await expect(page.getByText(/\$\s*[\d.,]+/)).toBeVisible({ timeout: 5000 });
  });

  test("add to cart button is present", async ({ page }) => {
    await navigateToFirstProduct(page);
    await expect(
      page.locator("button").filter({ hasText: /agregar al carrito/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("add to cart shows toast notification", async ({ page }) => {
    await navigateToFirstProduct(page);

    const addBtn = page.locator("button").filter({ hasText: "Agregar al carrito" });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();

    await expect(page.getByText(/agregado al carrito|added to cart/i)).toBeVisible({ timeout: 5000 });
  });

  test("product image renders", async ({ page }) => {
    await navigateToFirstProduct(page);
    const img = page.locator("img").first();
    await expect(img).toBeVisible({ timeout: 5000 });
  });

  test("quantity selector is interactive", async ({ page }) => {
    await navigateToFirstProduct(page);

    const increaseBtn = page
      .getByRole("button", { name: /\+|increase|más/i })
      .first();
    const hasQtyBtn = await increaseBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasQtyBtn) {
      await increaseBtn.click();
      const qtyEl = page.locator("input[type='number'], [data-testid='quantity']").first();
      const hasInput = await qtyEl.isVisible().catch(() => false);
      if (hasInput) {
        await expect(qtyEl).toHaveValue("2");
      }
    }
  });
});
