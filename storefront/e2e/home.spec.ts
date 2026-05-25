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
    // products fetched client-side — wait for at least one card to appear
    const productCards = page.locator("a[href^='/product/']");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  test("language toggle is available", async ({ page }) => {
    // Language toggle lives in the mobile side-menu; open it and click
    await page.getByRole("button", { name: /abrir menú/i }).click();
    const toggle = page.getByRole("button", { name: "한국어" });
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Español" })).toBeVisible({ timeout: 3000 });
  });
});
