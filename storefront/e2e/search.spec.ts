import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search page loads with empty state", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /escribí algo para buscar/i })).toBeVisible({ timeout: 5000 });
  });

  test("searching via header does not crash the page", async ({ page }) => {
    await page.goto("/catalog");
    const headerInput = page.locator("header input");
    await expect(headerInput).toBeVisible({ timeout: 5000 });
    await headerInput.fill("anillo");
    await headerInput.press("Enter");
    await expect(page).toHaveURL(/\/search/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText("500", { timeout: 5000 });
  });
});
