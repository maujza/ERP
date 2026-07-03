import { expect, test } from "@playwright/test";

const storefrontUrl = process.env.STOREFRONT_URL || "https://aurorapormayor.com";
const backendUrl =
  process.env.BACKEND_URL || "https://backoffice.aurorapormayor.com";
const posUrl = process.env.POS_URL || "https://pos.aurorapormayor.com";

test.describe("Production smoke tests", () => {
  test("storefront loads products without API errors", async ({ page }) => {
    await page.goto(storefrontUrl);

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
    await expect(page.getByText(/Medusa API error|Failed to fetch/i)).toHaveCount(0);
  });

  test("account page reaches Medusa without a fetch failure", async ({ page }) => {
    await page.goto(`${storefrontUrl}/account`);

    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText(/Medusa API error|Failed to fetch/i)).toHaveCount(0);
    await expect(
      page.getByText(/iniciar sesión|tu cuenta|내 계정|로그인/i).first(),
    ).toBeVisible();
  });

  test("backoffice login is available", async ({ page }) => {
    await page.goto(`${backendUrl}/app/`);

    await expect(page).toHaveTitle(/Aurora Backoffice/i);
    await expect(
      page.getByPlaceholder(/correo electrónico|email/i),
    ).toBeVisible();
  });

  test("POS application loads", async ({ page }) => {
    await page.goto(posUrl);

    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Medusa API allows the storefront origin", async ({ request }) => {
    const response = await request.get(`${backendUrl}/store/regions`, {
      headers: {
        Origin: storefrontUrl,
        "x-publishable-api-key":
          process.env.MEDUSA_PUBLISHABLE_KEY || "",
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["access-control-allow-origin"]).toBe(storefrontUrl);
    expect(response.headers()["access-control-allow-credentials"]).toBe("true");
  });
});
