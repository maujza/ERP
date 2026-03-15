// Shared role constants — used by both the admin UI widgets (Vite bundle)
// and the backend RBAC middleware (rbac.ts).
//
// IMPORTANT: rbac.ts imports from this file. Do NOT import backend-only
// modules here — this file must be safe to import in a Vite/browser context.

export const ROLES = {
  ADMIN: "admin",
  INVENTORY: "inventory",
  PURCHASING: "purchasing",
  MARKETING: "marketing",
  CUSTOMER_SERVICE: "customer_service",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  inventory: "Inventory",
  purchasing: "Purchasing",
  marketing: "Marketing",
  customer_service: "Customer Service",
}
