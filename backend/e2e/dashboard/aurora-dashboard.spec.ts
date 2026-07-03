import { test, expect } from "@playwright/test";

test.describe("Aurora Dashboard", () => {
  test("dashboard page loads without errors", async ({ page }) => {
    await page.goto("/app/aurora-dashboard");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page).toHaveURL(/\/aurora-dashboard/);
  });

  test("dashboard renders without unhandled errors", async ({ page }) => {
    await page.goto("/app/aurora-dashboard");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("Unhandled error");
  });

  test("KPI tiles are present", async ({ page }) => {
    await page.goto("/app/aurora-dashboard");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.getByText("Revenue total")).toBeVisible({ timeout: 5000 });
  });

  test("chart element renders", async ({ page }) => {
    await page.goto("/app/aurora-dashboard");
    await page.waitForTimeout(2000);
    const chart = page.locator("svg, canvas").first();
    await expect(chart).toBeVisible({ timeout: 5000 });
  });
});
