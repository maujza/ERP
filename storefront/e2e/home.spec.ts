import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads and shows hero section", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(page.locator("header")).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await expect(page.locator("nav a[href='/catalog']")).toBeVisible();
  });

  test("featured products load", async ({ page }) => {
    const productCards = page.locator("a[href^='/product/']");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  test("language toggle switches to Korean", async ({ page }) => {
    await page.getByRole("button", { name: /abrir menú/i }).click();
    const toggle = page.getByRole("button", { name: "한국어" });
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Español" })).toBeVisible({ timeout: 3000 });
  });

  test("footer is visible", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible({ timeout: 5000 });
  });

  test("featured product cards link to product pages", async ({ page }) => {
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/product\/.+/);
  });

  test("cart icon is visible in header", async ({ page }) => {
    const cartBtn = page.locator("header").getByRole("button", { name: /carrito|cart/i });
    await expect(cartBtn).toBeVisible({ timeout: 5000 });
  });
});
