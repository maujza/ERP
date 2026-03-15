import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

// Role constants live in admin/lib/roles.ts so they are importable by both
// the backend (here) and the admin UI Vite bundle (widgets).
export { ROLES, type Role } from "../admin/lib/roles"
import { ROLES, type Role } from "../admin/lib/roles"

// ─── Route permission matrix ──────────────────────────────────────────────────
//
//  Role is stored as user.metadata.role (single string, lowercase).
//  Set via: PATCH /admin/users/:id  { metadata: { role: "purchasing" } }
//
//  Legend: ✓ = allowed  r = read-only (GET)  – = denied
//
//  ┌──────────────────────────┬───────┬───────────┬───────────┬──────────┬──────────────┐
//  │ Route group              │ admin │ purchasing│ inventory │ marketing│ customer_svc │
//  ├──────────────────────────┼───────┼───────────┼───────────┼──────────┼──────────────┤
//  │ /admin/purchase/suppliers│   ✓   │     ✓     │     –     │    –     │      –       │
//  │ /admin/purchase/orders   │   ✓   │     ✓     │  r+receive│    –     │      –       │
//  │ /admin/orders            │   ✓   │     –     │     –     │    –     │      ✓       │
//  │ /admin/products          │   ✓   │     r     │     r     │    ✓     │      –       │
//  │ /admin/customers         │   ✓   │     –     │     –     │    –     │      ✓       │
//  │ /admin/inventory         │   ✓   │     –     │     ✓     │    –     │      –       │
//  │ /admin/price-lists       │   ✓   │     ✓     │     –     │    –     │      –       │
//  │ /admin/promotions        │   ✓   │     –     │     –     │    ✓     │      –       │
//  │ /admin/users + invites   │   ✓   │     –     │     –     │    –     │      –       │
//  │ /admin/regions + store   │   ✓   │     –     │     –     │    –     │      –       │
//  │ /admin/sales-channels    │   ✓   │     –     │     –     │    –     │      –       │
//  └──────────────────────────┴───────┴───────────┴───────────┴──────────┴──────────────┘
//
//  "admin" role bypasses every requireRole check regardless of allowedRoles.
//  Users with no metadata.role set → 403 (explicit fail, not pass-through).

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Extract the canonical role from user metadata.
 * Reads metadata.role only (single string, normalized to lowercase).
 * Returns null if the key is missing, the wrong type, or an unrecognised value.
 */
export function getRoleFromMetadata(
  metadata: Record<string, unknown> | undefined
): Role | null {
  if (!metadata) return null
  const candidate = metadata.role
  if (typeof candidate !== "string") return null
  const normalized = candidate.trim().toLowerCase()
  const valid = Object.values(ROLES) as string[]
  return valid.includes(normalized) ? (normalized as Role) : null
}

// ─── DB helper ────────────────────────────────────────────────────────────────

type MedusaScope = {
  resolve: (key: string) => {
    graph: (input: {
      entity: string
      fields: string[]
      filters: { id: string }
    }) => Promise<{ data: Array<{ metadata?: Record<string, unknown> }> }>
  }
}

/**
 * Fetch the role for a user by actor_id.
 * Returns null on any error so the middleware can safely 403 instead of 500.
 */
export async function getUserRole(
  actorId: string,
  scope: MedusaScope
): Promise<Role | null> {
  try {
    const query = scope.resolve("query")
    const { data } = await query.graph({
      entity: "user",
      fields: ["id", "metadata"],
      filters: { id: actorId },
    })
    return getRoleFromMetadata(data[0]?.metadata)
  } catch {
    // Fail safe: any DB/resolution error → deny access
    return null
  }
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Express-compatible middleware that enforces role-based access.
 *
 * - "admin" role always passes regardless of allowedRoles.
 * - Users with no role set → 403 (explicit, not silent pass-through).
 * - DB errors → 403 (fail safe).
 *
 * Usage in middlewares.ts:
 *   middlewares: [requireRole([ROLES.PURCHASING])]
 */
export function requireRole(
  allowedRoles: Role[]
): (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => Promise<void> {
  return async (req, res, next) => {
    const authReq = req as AuthenticatedMedusaRequest
    const role = await getUserRole(authReq.auth_context.actor_id, req.scope as MedusaScope)

    if (role === ROLES.ADMIN || (role !== null && allowedRoles.includes(role))) {
      return next()
    }

    res.status(403).json({ message: "Forbidden" })
  }
}
