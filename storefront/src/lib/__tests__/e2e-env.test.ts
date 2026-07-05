import path from "node:path";
import { describe, expect, it } from "vitest";
import { readEnvVarFromFile, resolveBackendAdminCredentials, resolveStorefrontPublishableKey } from "../e2e-env";

describe("storefront e2e env helpers", () => {
  const fixturesDir = path.resolve(process.cwd(), "src/lib/__tests__/fixtures");

  it("reads a publishable key from a synced storefront env file", () => {
    expect(
      resolveStorefrontPublishableKey({}, path.join(fixturesDir, "storefront.env.development"))
    ).toBe("pk_test_synced");
  });

  it("prefers process env over the synced storefront env file", () => {
    expect(
      resolveStorefrontPublishableKey(
        { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_from_process" },
        path.join(fixturesDir, "storefront.env.development")
      )
    ).toBe("pk_from_process");
  });

  it("reads Medusa admin credentials from backend/.env when Playwright env vars are missing", () => {
    expect(
      resolveBackendAdminCredentials({}, path.join(fixturesDir, "backend.env"))
    ).toEqual({
      email: "admin@example.com",
      password: "from-backend-env",
    });
  });

  it("prefers explicit Playwright env vars over backend/.env", () => {
    expect(
      resolveBackendAdminCredentials(
        {
          ADMIN_EMAIL: "ops@example.com",
          ADMIN_PASSWORD: "from-process",
        },
        path.join(fixturesDir, "backend.env")
      )
    ).toEqual({
      email: "ops@example.com",
      password: "from-process",
    });
  });

  it("parses quoted values from env files", () => {
    expect(
      readEnvVarFromFile(path.join(fixturesDir, "quoted.env"), "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
    ).toBe("pk_quoted_value");
  });
});

