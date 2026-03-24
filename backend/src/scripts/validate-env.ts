/**
 * validate-env.ts
 *
 * Validates that the publishable API key and region ID in .env.local match
 * the live database. Run after any DB rebuild to catch stale credentials
 * before they cause a broken storefront.
 *
 * Usage (from repo root):
 *   cd backend && npx medusa exec ./src/scripts/validate-env.ts
 *
 * Or from the Docker host:
 *   docker compose exec backend npx medusa exec ./src/scripts/validate-env.ts
 */

import * as fs from "fs"
import * as path from "path"

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../../.env.local")
  if (!fs.existsSync(envPath)) {
    return {}
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  const result: Record<string, string> = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    result[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }
  return result
}

export default async function validateEnv({ container }: { container: any }) {
  const logger = container.resolve("logger")

  logger.info("=== validate-env: checking .env.local against live DB ===")

  const env = loadEnvLocal()
  let passed = 0
  let failed = 0

  // ── 1. Publishable key ────────────────────────────────────────────────────
  const localKey = env["NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"]
  if (!localKey) {
    logger.warn("  [SKIP] NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY not found in .env.local")
  } else {
    const apiKeyService = container.resolve("apiKeyModuleService")
    const { api_keys } = await apiKeyService.listApiKeys({ type: "publishable" }, { take: 50 })
    const match = api_keys.find((k: any) => k.token === localKey)
    if (match) {
      logger.info(`  [OK]   Publishable key matches DB entry: "${match.title}"`)
      passed++
    } else {
      logger.error(
        `  [FAIL] Publishable key in .env.local (${localKey.slice(0, 10)}...) ` +
          `is NOT in the database. ` +
          `Valid key(s): ${api_keys.map((k: any) => k.token.slice(0, 10) + "...").join(", ")}`
      )
      failed++
    }
  }

  // ── 2. Region ID ─────────────────────────────────────────────────────────
  const localRegion = env["NEXT_PUBLIC_MEDUSA_REGION_ID"]
  if (!localRegion) {
    logger.warn("  [SKIP] NEXT_PUBLIC_MEDUSA_REGION_ID not found in .env.local")
  } else {
    const regionService = container.resolve("regionModuleService")
    const { regions } = await regionService.listRegions({ id: localRegion }, { take: 1 })
    if (regions.length > 0) {
      logger.info(`  [OK]   Region ID matches DB entry: "${regions[0].name}"`)
      passed++
    } else {
      const { regions: all } = await regionService.listRegions({}, { take: 10 })
      logger.error(
        `  [FAIL] Region ID in .env.local (${localRegion}) is NOT in the database. ` +
          `Available region(s): ${all.map((r: any) => `${r.id} (${r.name})`).join(", ")}`
      )
      failed++
    }
  }

  // ── 3. Admin user ─────────────────────────────────────────────────────────
  const adminEmail = env["MEDUSA_ADMIN_EMAIL"] ?? process.env.MEDUSA_ADMIN_EMAIL ?? "admin@aurelia.com"
  const userService = container.resolve("userModuleService")
  const { users } = await userService.listUsers({ email: adminEmail }, { take: 1 })
  if (users.length > 0) {
    logger.info(`  [OK]   Admin user exists: ${adminEmail}`)
    passed++
  } else {
    logger.error(`  [FAIL] Admin user "${adminEmail}" not found in DB. Run: npx medusa user -e ${adminEmail} -p <password>`)
    failed++
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  logger.info(`=== validate-env: ${passed} passed, ${failed} failed ===`)

  if (failed > 0) {
    logger.error(
      "One or more checks failed. See docs/medusa-auth-keys.md for the refresh procedure."
    )
    process.exitCode = 1
  }
}
