import { test, expect } from "@playwright/test";

test.describe("Auth page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.getByText(/iniciar sesión/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.locator('main button[type="submit"]')).toBeVisible();
  });

  test("switches to signup form", async ({ page }) => {
    await page.getByRole("button", { name: /registrarme/i }).click();
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/apellido/i)).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("noexiste@aurelia.com");
    await page.getByLabel(/contraseña/i).fill("wrongpassword");
    await page.locator('main button[type="submit"]').click();
    await expect(page.getByText(/error|inválid|incorrect|autenticación/i)).toBeVisible({ timeout: 5000 });
  });

  test("link back to catalog is present", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Ir a tienda" })).toBeVisible();
  });
});
