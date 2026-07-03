import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_AUTH_FILE = path.join(__dirname, "../.auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL || "admin@aurorapormayor.com";
  const password = process.env.ADMIN_PASSWORD || "supersecret";

  await page.goto("/app");

  await page.getByPlaceholder(/correo electrónico/i).fill(email);
  await page.getByPlaceholder(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /continuar con email/i }).click();

  await expect(page).toHaveURL(/\/app\/(dashboard|orders|products|aurora-dashboard|purchase|fulfillment|team-tasks)/, {
    timeout: 20000,
  });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
