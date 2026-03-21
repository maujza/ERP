/**
 * Policy snapshot tests for middlewares.ts.
 *
 * Verifies that the route permission config assigns the correct roles to each
 * route matcher — catching regressions that the requireRole unit tests can't
 * catch (those only test the logic, not the configuration).
 *
 * We import `routes` directly (not the default export) because defineMiddlewares
 * may transform the config in ways that make method inspection unreliable.
 */

import { routes } from "../../../src/api/middlewares"

type RouteEntry = (typeof routes)[number]

// Probe which non-admin roles a middleware array allows by calling it with
// each role and checking whether next() is invoked.
async function getAllowedRoles(
  middlewares: RouteEntry["middlewares"]
): Promise<string[]> {
  const candidates = ["purchasing", "inventory", "marketing", "customer_service"]
  const allowed: string[] = []

  for (const role of candidates) {
    const fakeScope = {
      resolve: () => ({
        graph: async () => ({ data: [{ metadata: { role } }] }),
      }),
    }
    const req = { auth_context: { actor_id: "user_01" }, scope: fakeScope }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    let nextCalled = false

    // Only call the first middleware (requireRole). Validators after it may
    // throw on a missing body/query — we only care about the auth decision.
    await (middlewares[0] as any)(req, res, () => { nextCalled = true })

    if (nextCalled) allowed.push(role)
  }

  return allowed
}

function findEntry(
  matcher: string,
  method?: string | string[]
): RouteEntry | undefined {
  return routes.find((r) => {
    if (r.matcher !== matcher) return false
    if (method === undefined) return r.method === undefined
    if (Array.isArray(method)) {
      return Array.isArray(r.method) && r.method.join() === method.join()
    }
    return r.method === method
  })
}

// ─── Purchase module (regression guard) ──────────────────────────────────────

describe("purchase module route guards", () => {
  it("GET /admin/purchase/suppliers → [purchasing]", async () => {
    const e = findEntry("/admin/purchase/suppliers", "GET")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["purchasing"])
  })

  it("GET /admin/purchase/orders → [purchasing, inventory]", async () => {
    const e = findEntry("/admin/purchase/orders", "GET")!
    const roles = await getAllowedRoles(e.middlewares)
    expect(roles).toContain("purchasing")
    expect(roles).toContain("inventory")
  })
})

// ─── Medusa native: orders ────────────────────────────────────────────────────

describe("orders route guards", () => {
  it("/admin/orders* (all methods) → [customer_service]", async () => {
    const e = findEntry("/admin/orders*")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["customer_service"])
  })
})

// ─── Medusa native: products ──────────────────────────────────────────────────

describe("products route guards", () => {
  it("GET /admin/products* → [purchasing, inventory, marketing]", async () => {
    const e = findEntry("/admin/products*", "GET")!
    const roles = await getAllowedRoles(e.middlewares)
    expect(roles).toContain("purchasing")
    expect(roles).toContain("inventory")
    expect(roles).toContain("marketing")
    expect(roles).not.toContain("customer_service")
  })

  it("POST+DELETE /admin/products* → [marketing] only", async () => {
    const e = findEntry("/admin/products*", ["POST", "DELETE"])!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["marketing"])
  })
})

// ─── Medusa native: customers ─────────────────────────────────────────────────

describe("customers route guards", () => {
  it("/admin/customers* → [customer_service]", async () => {
    const e = findEntry("/admin/customers*")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["customer_service"])
  })
})

// ─── Medusa native: inventory ─────────────────────────────────────────────────

describe("inventory route guards", () => {
  it("/admin/inventory* → [inventory]", async () => {
    const e = findEntry("/admin/inventory*")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["inventory"])
  })
})

// ─── Medusa native: pricing ───────────────────────────────────────────────────

describe("pricing route guards", () => {
  it("/admin/price-lists* → [purchasing]", async () => {
    const e = findEntry("/admin/price-lists*")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["purchasing"])
  })
})

// ─── Medusa native: promotions ────────────────────────────────────────────────

describe("promotions route guards", () => {
  it("/admin/promotions* → [marketing]", async () => {
    const e = findEntry("/admin/promotions*")!
    expect(await getAllowedRoles(e.middlewares)).toEqual(["marketing"])
  })
})

// NOTE: Admin-only settings routes (/admin/users*, /admin/invites*, etc.) are
// not in the routes array — see middlewares.ts for the explanation.
// Those routes rely on Medusa's built-in policy-based access control.
