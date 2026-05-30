/**
 * notification-recipients.ts — Shared helper: resolve admin user IDs by role
 *
 * Used by subscribers and jobs to find which admin users should receive a
 * notification (e.g., "who has the purchasing role?").
 *
 * How it works:
 *   1. Queries all admin users from the database via Medusa's `query` service
 *   2. Filters to those whose metadata.role matches one of the requested roles
 *   3. Returns their user IDs, which the caller passes to the notification module
 *
 * Results are cached per role-set for 60 seconds to avoid a DB query on every
 * event. Role changes take effect within 60 s — acceptable for notifications.
 *
 * Role lookup reads metadata.role only (consistent with rbac.ts).
 * The legacy metadata.notification_roles key is no longer supported.
 *
 * Exports:
 *   getRecipientsByRole  — main function, returns string[] of user IDs
 *   clearRecipientsCache — empties the TTL cache (used in tests for isolation)
 */

type QueryContainer = {
  resolve: (key: string) => {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }
}

type UserRow = {
  id: string
  metadata?: Record<string, unknown>
}

type CacheEntry = { ids: string[]; expiresAt: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 1000

/** Clear the recipients cache. Intended for use in tests to ensure test isolation. */
export function clearRecipientsCache(): void {
  cache.clear()
}

function cacheKey(roles: string[]): string {
  return [...roles].sort().join(",")
}

function readRole(metadata: Record<string, unknown> | undefined): string | null {
  const role = metadata?.role
  if (typeof role === "string") return role.trim().toLowerCase()
  return null
}

/**
 * Returns user IDs whose metadata.role matches one of the given roles.
 * Results are cached per role-set for 60 seconds.
 */
export async function getRecipientsByRole(
  container: QueryContainer,
  roles: string[]
): Promise<string[]> {
  const key = cacheKey(roles)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now < cached.expiresAt) return cached.ids

  const query = container.resolve("query")
  const { data: allUsers } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
  })

  const ids = (allUsers as UserRow[])
    .filter((u) => {
      const role = readRole(u.metadata)
      return role !== null && roles.includes(role)
    })
    .map((u) => u.id)

  cache.set(key, { ids, expiresAt: now + CACHE_TTL_MS })
  return ids
}
