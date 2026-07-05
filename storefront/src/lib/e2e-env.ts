import { readFileSync } from "node:fs";
import path from "node:path";

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

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
}

function readEnvFile(envPath: string): Record<string, string> {
  try {
    return parseEnvFile(readFileSync(envPath, "utf-8"));
  } catch {
    return {};
  }
}

export function readEnvVarFromFile(envPath: string, key: string): string | undefined {
  return readEnvFile(envPath)[key];
}

export function resolveStorefrontPublishableKey(
  env: NodeJS.ProcessEnv = process.env,
  envPath = path.resolve(process.cwd(), ".env.development")
): string | undefined {
  return env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? readEnvVarFromFile(envPath, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
}

export function resolveBackendAdminCredentials(
  env: NodeJS.ProcessEnv = process.env,
  envPath = path.resolve(process.cwd(), "../backend/.env")
): { email: string; password: string } {
  const fileEnv = readEnvFile(envPath);

  return {
    email: env.ADMIN_EMAIL ?? env.MEDUSA_ADMIN_EMAIL ?? fileEnv.MEDUSA_ADMIN_EMAIL ?? "admin@aurorapormayor.com",
    password: env.ADMIN_PASSWORD ?? env.MEDUSA_ADMIN_PASSWORD ?? fileEnv.MEDUSA_ADMIN_PASSWORD ?? "supersecret",
  };
}

