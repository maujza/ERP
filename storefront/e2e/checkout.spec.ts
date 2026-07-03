import { test, expect } from "@playwright/test";

async function addFirstProductToCart(page: import("@playwright/test").Page) {
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

  const addBtn = page.locator("button").filter({ hasText: "Agregar al carrito" });
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await expect(addBtn).toBeEnabled({ timeout: 5000 });
  await addBtn.click();
  await expect(page.getByText(/agregado al carrito/i)).toBeVisible({ timeout: 5000 });
}

async function dismissCheckoutModal(page: import("@playwright/test").Page) {
  // CheckoutChoiceModal appears for unauthenticated users; dismiss as guest
  const guestBtn = page.getByRole("button", { name: /continuar sin cuenta/i });
  const hasModal = await guestBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasModal) {
    await guestBtn.click();
    // Wait for the fixed overlay to leave the DOM before interacting with the form
    await guestBtn.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  }
}

test.describe("Checkout", () => {
  test("empty checkout does not crash", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("checkout shows contact form after adding product", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await expect(page.getByText(/paso 1.*contacto/i)).toBeVisible({ timeout: 5000 });
  });

  test("contact form has email field", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await dismissCheckoutModal(page);
    // Labels have no htmlFor; find input by placeholder
    await expect(page.locator("input[placeholder*='mail'], input[placeholder*='correo']").first()).toBeVisible({ timeout: 5000 });
  });

  test("checkout shows step indicators for all steps", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    // Step labels rendered as: Contacto, Envío, Método de envío, Pago
    await expect(page.getByText("Contacto")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Envío").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Pago").first()).toBeVisible({ timeout: 5000 });
  });

  test("proceeds to shipping step after filling contact form", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await dismissCheckoutModal(page);

    const emailInput = page.locator("input[placeholder*='mail'], input[placeholder*='correo']").first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill("test@example.com");
    // Blur triggers contactComplete which auto-advances the step
    await emailInput.blur();

    await expect(page.getByText(/envío/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("order summary shows a price", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await expect(page.getByText(/\$\s*[\d.,]+/)).toBeVisible({ timeout: 5000 });
  });

  test("checkout page has order summary section", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await expect(page.getByText(/resumen|summary|total/i).first()).toBeVisible({ timeout: 5000 });
  });
});
