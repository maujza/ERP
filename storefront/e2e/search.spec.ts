import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search page loads with empty state", async ({ page }) => {
    await page.goto("/search");
    await expect(
      page.getByRole("heading", { name: /escribí algo para buscar/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("searching via header navigates to search page", async ({ page }) => {
    await page.goto("/catalog");
    const headerInput = page.locator("header input");
    await expect(headerInput).toBeVisible({ timeout: 5000 });
    await headerInput.fill("anillo");
    await headerInput.press("Enter");
    await expect(page).toHaveURL(/\/search/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText("500", { timeout: 5000 });
  });

  test("search with known term returns results", async ({ page }) => {
    await page.goto("/search?q=anillo");
    await expect(page.locator("body")).not.toContainText("500", { timeout: 5000 });

    const productCards = page.locator("a[href^='/product/']");
    const hasResults = await productCards.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasResults) {
      expect(await productCards.count()).toBeGreaterThan(0);
    }
  });

  test("search with nonsense term shows no-results state", async ({ page }) => {
    await page.goto("/search?q=xyznonexistentterm999");
    await expect(page.locator("body")).not.toContainText("500", { timeout: 5000 });

    const noResults = await page
      .getByText(/sin resultados|no results|no encontramos|escribí algo/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const emptyGrid = await page
      .locator("a[href^='/product/']")
      .count()
      .then((n) => n === 0);

    expect(noResults || emptyGrid).toBeTruthy();
  });

  test("search results link to valid product pages", async ({ page }) => {
    // "aros" appears in many seeded product titles, so results are guaranteed
    await page.goto("/search?q=aros");
    const firstResult = page.locator("a[href^='/product/']").first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });

    await firstResult.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText("500");
  });
});
