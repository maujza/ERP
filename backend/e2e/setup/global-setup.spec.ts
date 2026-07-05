import { test as setup, expect } from "@playwright/test";
import path from "path";
import { resolveAdminCredentials } from "../admin-env";

const ADMIN_AUTH_FILE = path.join(__dirname, "../.auth/admin.json");
const ADMIN_JWT_STORAGE_KEY = "medusa_auth_token";

setup("authenticate as admin", async ({ page, request }) => {
  const { email, password } = resolveAdminCredentials();
  const adminBaseUrl = process.env.ADMIN_BASE_URL?.replace(/\/app\/?$/, "");

  if (!adminBaseUrl) {
    throw new Error("ADMIN_BASE_URL is not set.");
  }

  const loginRes = await request.post(`${adminBaseUrl}/auth/user/emailpass`, {
    data: { email, password },
  });
  expect(loginRes.ok(), `admin login failed (${loginRes.status()}): ${await loginRes.text()}`).toBeTruthy();
  const { token } = (await loginRes.json()) as { token?: string };
  expect(token, "admin auth token expected").toBeTruthy();

  await page.addInitScript(([storageKey, authToken]) => {
    window.localStorage.setItem(storageKey, authToken);
  }, [ADMIN_JWT_STORAGE_KEY, token!]);

  await page.goto("/app");

  await expect(page).toHaveURL(/\/app\/(dashboard|orders|products|aurora-dashboard|purchase|fulfillment|team-tasks)/, {
    timeout: 20000,
  });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
