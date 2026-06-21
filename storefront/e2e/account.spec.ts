import { test, expect } from "@playwright/test";

import {
  cancelOrderById,
  deleteCustomerByEmail,
  deleteProductById,
  registerCustomerApi,
  seedDeliveredOrder,
  type StoreCustomer,
} from "./_customer";

/**
 * Account workflow E2E (browser) — proves the customer-facing UI:
 *   1. Registering through the /auth form creates an account and lands on the
 *      account home (greeting + empty order list).
 *   2. A delivered order shows up on the account home with the correct status
 *      (payment validated + delivered) in the tracking stepper.
 */
test.describe("Account — registration and order history (UI)", () => {
  let cleanupEmail: string | null = null;
  let cleanupOrderId: string | null = null;
  let cleanupProductId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (cleanupOrderId) {
      await cancelOrderById(request, cleanupOrderId);
      cleanupOrderId = null;
    }
    if (cleanupProductId) {
      await deleteProductById(request, cleanupProductId);
      cleanupProductId = null;
    }
    if (cleanupEmail) {
      await deleteCustomerByEmail(request, cleanupEmail);
      cleanupEmail = null;
    }
  });

  test("registering through the form lands on the account home with an empty order list", async ({ page }) => {
    const email = `e2e-ui-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.com`;
    cleanupEmail = email;

    await page.goto("/auth");
    await page.getByRole("button", { name: /registrarme/i }).click();
    await page.getByLabel(/nombre/i).fill("Aurora");
    await page.getByLabel(/apellido/i).fill("Cliente");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill("supersecret");
    await page.locator('main button[type="submit"]').click();

    await expect(page).toHaveURL(/\/account/, { timeout: 15000 });
    await expect(page.getByText(/Hola, Aurora/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Aún no tienes pedidos/i)).toBeVisible();
  });

  test("a delivered order appears on the account home with the correct status", async ({ page, request }) => {
    const customer: StoreCustomer = await registerCustomerApi(request, { firstName: "Aurora", lastName: "Pedido" });
    cleanupEmail = customer.email;
    const { orderId, productId } = await seedDeliveredOrder(request, customer);
    cleanupOrderId = orderId;
    cleanupProductId = productId;

    // Log in through the UI as that customer.
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(customer.email);
    await page.getByLabel(/contraseña/i).fill(customer.password);
    await page.locator('main button[type="submit"]').click();

    await expect(page).toHaveURL(/\/account/, { timeout: 15000 });
    await expect(page.getByText(/Hola, Aurora/)).toBeVisible({ timeout: 10000 });

    // The order card and its completed status steps render.
    await expect(page.getByText(/Pedido #/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pago validado").first()).toBeVisible();
    await expect(page.getByText("Entregado").first()).toBeVisible();
  });
});
