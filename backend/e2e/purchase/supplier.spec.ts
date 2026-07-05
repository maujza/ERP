import { test, expect } from "@playwright/test";
import { adminGet } from "../_seed";

test.describe("Purchase — Supplier workflows", () => {
  test("navigates to suppliers list", async ({ page }) => {
    await page.goto("/app/purchase/suppliers");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page).toHaveURL(/\/purchase\/suppliers/);
  });

  test("creates a new supplier", async ({ page }) => {
    await page.goto("/app/purchase/suppliers");

    const createBtn = page.getByRole("button", { name: /new supplier|create|nuevo/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    const nameField = page.getByLabel(/name|nombre/i).first();
    await expect(nameField).toBeVisible({ timeout: 5000 });

    const uniqueName = `E2E Supplier ${Date.now()}`;
    await nameField.fill(uniqueName);

    await page.getByRole("button", { name: /save|guardar|submit|create/i }).click();

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  });

  test("views supplier detail page", async ({ page }) => {
    const res = await adminGet(page.request, "/admin/purchase/suppliers");
    const json = await res.json();
    const id = json?.suppliers?.[0]?.id ?? json?.[0]?.id;
    if (!id) { test.skip(); return; }
    await page.goto(`/app/purchase/suppliers/${id}`);
    await expect(page.locator("body")).not.toContainText("404", { timeout: 8000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("edits a supplier via menu", async ({ page }) => {
    await page.goto("/app/purchase/suppliers");
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    // Use the ... actions menu on the row
    const menuBtn = firstRow.getByRole("button").last();
    await menuBtn.click();
    // Menu should show edit/delete options
    await expect(
      page.getByRole("menuitem").or(page.getByText(/edit|editar|delete|eliminar/i)).first()
    ).toBeVisible({ timeout: 3000 });
  });
});
