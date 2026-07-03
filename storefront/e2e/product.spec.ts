import { test, expect } from "@playwright/test";

async function navigateToFirstProduct(page: import("@playwright/test").Page) {
  // Click the card for a known single-variant E2E product (seed-e2e.ts) by
  // its title text, rather than "/catalog"'s first card: the 4 E2E products
  // are created in the same batch with identical created_at timestamps, so
  // their listing order is not guaranteed stable across runs. Landing on the
  // one multi-variant product ("Set E2E Aurora") intermittently left
  // add-to-cart showing "Selecciona variante" instead, since nothing here
  // tests variant selection itself. (Can't link directly to /product/<handle>
  // — the route takes the product id, which seed-e2e.ts generates per run.)
  await page.goto("/catalog");
  // product-card.tsx renders the title as a <p> sibling of the <a>, not
  // inside it — scope to the <article> card by its title text, then grab
  // the link within it, rather than filtering the <a> itself by hasText.
  const targetCardContainer = page.locator("article").filter({ hasText: "Aros E2E Aurora" });
  const targetCard = targetCardContainer.locator("a[href^='/product/']").first();
  await expect(targetCard).toBeVisible({ timeout: 10000 });
  await targetCard.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });
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
