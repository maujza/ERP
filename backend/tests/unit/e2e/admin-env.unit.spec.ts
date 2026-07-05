import path from "node:path";
import { resolveAdminCredentials } from "../../../e2e/admin-env";

describe("backend e2e admin credentials", () => {
  const fixturesDir = path.resolve(process.cwd(), "tests/unit/e2e/fixtures");

  it("reads credentials from backend .env when Playwright vars are unset", () => {
    expect(resolveAdminCredentials({}, path.join(fixturesDir, "backend.env"))).toEqual({
      email: "admin@example.com",
      password: "from-backend-env",
    });
  });

  it("prefers explicit Playwright env vars over backend .env", () => {
    expect(
      resolveAdminCredentials(
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
});

