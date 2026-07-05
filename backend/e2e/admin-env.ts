import { readFileSync } from "node:fs";
import path from "node:path";

function readEnvFile(envPath: string): Record<string, string> {
  try {
    const values: Record<string, string> = {};
    const contents = readFileSync(envPath, "utf-8");

    for (const rawLine of contents.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const equalsIndex = line.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = line.slice(0, equalsIndex).trim();
      const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key) {
        values[key] = value;
      }
    }

    return values;
  } catch {
    return {};
  }
}

export function resolveAdminCredentials(
  env: NodeJS.ProcessEnv = process.env,
  envPath = path.resolve(process.cwd(), ".env")
): { email: string; password: string } {
  const fileEnv = readEnvFile(envPath);

  return {
    email: env.ADMIN_EMAIL ?? env.MEDUSA_ADMIN_EMAIL ?? fileEnv.MEDUSA_ADMIN_EMAIL ?? "admin@aurorapormayor.com",
    password: env.ADMIN_PASSWORD ?? env.MEDUSA_ADMIN_PASSWORD ?? fileEnv.MEDUSA_ADMIN_PASSWORD ?? "supersecret",
  };
}

