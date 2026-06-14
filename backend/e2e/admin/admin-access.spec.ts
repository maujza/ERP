import { test, expect } from "@playwright/test"

test.describe("Admin RBAC bootstrap", () => {
  test("the provisioned admin can access protected native resources", async ({ request }) => {
    for (const path of ["/admin/orders?limit=1", "/admin/products?limit=1", "/admin/customers?limit=1"]) {
      const response = await request.get(path)
      expect(response.status(), `${path} should not be rejected by RBAC`).toBe(200)
    }
  })

  test("the orders page renders without the route error boundary", async ({ page }) => {
    await page.goto("/app/orders")
    await expect(page.getByText("An error occurred")).not.toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/app\/orders/)
  })
})
