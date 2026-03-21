import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { z } from "zod"
import { requireRole, ROLES } from "../lib/rbac"

// --- Supplier schemas ---

export const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type CreateSupplierSchema = z.infer<typeof CreateSupplierSchema>

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type UpdateSupplierSchema = z.infer<typeof UpdateSupplierSchema>

// --- Purchase Order schemas ---

const PurchaseOrderItemSchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive(),
})

export const CreatePurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  expected_delivery_date: z.string().optional().nullable(),
  items: z.array(PurchaseOrderItemSchema).min(1),
})
export type CreatePurchaseOrderSchema = z.infer<typeof CreatePurchaseOrderSchema>

const ReceivePurchaseOrderItemSchema = z.object({
  id: z.string().min(1),
  received_quantity: z.number().int().nonnegative(),
})

export const ReceivePurchaseOrderSchema = z.object({
  location_id: z.string().min(1),
  // Per-item received quantities. Omit for full receipt (received = ordered).
  items: z.array(ReceivePurchaseOrderItemSchema).optional(),
})
export type ReceivePurchaseOrderSchema = z.infer<typeof ReceivePurchaseOrderSchema>

// --- Fulfillment schemas ---

export const ConfirmPackSchema = z.object({
  packed_weight: z.number().positive(),
  packed_dimensions: z.string().min(1).optional(),
})
export type ConfirmPackSchema = z.infer<typeof ConfirmPackSchema>

export const DispatchOrderSchema = z.object({
  tracking_number: z.string().min(1),
})
export type DispatchOrderSchema = z.infer<typeof DispatchOrderSchema>

export const GetListSchema = createFindParams()

// Exported for policy snapshot tests — defineMiddlewares may transform the
// config in ways that make method inspection unreliable; import this directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: any[] = [
    // Supplier list — purchasing only
    {
      matcher: "/admin/purchase/suppliers",
      method: "GET",
      middlewares: [
        requireRole([ROLES.PURCHASING]),
        validateAndTransformQuery(GetListSchema, {
          defaults: ["id", "name", "email", "phone", "address", "notes", "created_at"],
          isList: true,
          defaultLimit: 50,
        }),
      ],
    },
    {
      matcher: "/admin/purchase/suppliers",
      method: "POST",
      middlewares: [requireRole([ROLES.PURCHASING]), validateAndTransformBody(CreateSupplierSchema)],
    },
    {
      matcher: "/admin/purchase/suppliers/:id",
      method: "POST",
      middlewares: [requireRole([ROLES.PURCHASING]), validateAndTransformBody(UpdateSupplierSchema)],
    },
    {
      matcher: "/admin/purchase/suppliers/:id",
      method: "GET",
      middlewares: [requireRole([ROLES.PURCHASING])],
    },
    {
      matcher: "/admin/purchase/suppliers/:id",
      method: "DELETE",
      middlewares: [requireRole([ROLES.PURCHASING])],
    },
    // Purchase order list — purchasing + inventory (read)
    {
      matcher: "/admin/purchase/orders",
      method: "GET",
      middlewares: [
        requireRole([ROLES.PURCHASING, ROLES.INVENTORY]),
        validateAndTransformQuery(GetListSchema, {
          defaults: [
            "id",
            "supplier_id",
            "reference_number",
            "status",
            "notes",
            "expected_delivery_date",
            "discrepancy_count",
            "created_at",
          ],
          isList: true,
          defaultLimit: 50,
        }),
      ],
    },
    {
      matcher: "/admin/purchase/orders",
      method: "POST",
      middlewares: [requireRole([ROLES.PURCHASING]), validateAndTransformBody(CreatePurchaseOrderSchema)],
    },
    {
      matcher: "/admin/purchase/orders/:id",
      method: "GET",
      middlewares: [requireRole([ROLES.PURCHASING, ROLES.INVENTORY])],
    },
    {
      matcher: "/admin/purchase/orders/:id/submit",
      method: "POST",
      middlewares: [requireRole([ROLES.PURCHASING])],
    },
    {
      matcher: "/admin/purchase/orders/:id/cancel",
      method: "POST",
      middlewares: [requireRole([ROLES.PURCHASING])],
    },
    // Receive a PO — inventory + purchasing
    {
      matcher: "/admin/purchase/orders/:id/receive",
      method: "POST",
      middlewares: [requireRole([ROLES.INVENTORY, ROLES.PURCHASING]), validateAndTransformBody(ReceivePurchaseOrderSchema)],
    },

    // ── Fulfillment lifecycle ─────────────────────────────────────────────────
    // Inventory role: full CRUD (pick, pack, dispatch).
    // Customer service: read-only (GET).
    {
      matcher: "/admin/fulfillment/kpis",
      method: "GET",
      middlewares: [requireRole([ROLES.INVENTORY, ROLES.CUSTOMER_SERVICE])],
    },
    {
      matcher: "/admin/fulfillment/orders",
      method: "GET",
      middlewares: [requireRole([ROLES.INVENTORY, ROLES.CUSTOMER_SERVICE])],
    },
    {
      matcher: "/admin/fulfillment/orders/:id",
      method: "GET",
      middlewares: [requireRole([ROLES.INVENTORY, ROLES.CUSTOMER_SERVICE])],
    },
    {
      matcher: "/admin/fulfillment/orders/:id/pick",
      method: "POST",
      middlewares: [requireRole([ROLES.INVENTORY])],
    },
    {
      matcher: "/admin/fulfillment/orders/:id/pack",
      method: "POST",
      middlewares: [requireRole([ROLES.INVENTORY]), validateAndTransformBody(ConfirmPackSchema)],
    },
    {
      matcher: "/admin/fulfillment/orders/:id/dispatch",
      method: "POST",
      middlewares: [requireRole([ROLES.INVENTORY]), validateAndTransformBody(DispatchOrderSchema)],
    },

    // ── Medusa native: Orders ─────────────────────────────────────────────────
    // Customer service manages orders; no other non-admin role needs access.
    {
      matcher: "/admin/orders*",
      middlewares: [requireRole([ROLES.CUSTOMER_SERVICE])],
    },

    // ── Medusa native: Products ───────────────────────────────────────────────
    // Purchasing + inventory: read-only (GET) to check stock/variants.
    // Marketing: full CRUD for catalog management.
    {
      matcher: "/admin/products*",
      method: "GET",
      middlewares: [requireRole([ROLES.PURCHASING, ROLES.INVENTORY, ROLES.MARKETING])],
    },
    {
      matcher: "/admin/products*",
      method: ["POST", "DELETE"],
      middlewares: [requireRole([ROLES.MARKETING])],
    },

    // ── Medusa native: Customers ──────────────────────────────────────────────
    {
      matcher: "/admin/customers*",
      middlewares: [requireRole([ROLES.CUSTOMER_SERVICE])],
    },

    // ── Medusa native: Inventory / stock locations ────────────────────────────
    {
      matcher: "/admin/inventory*",
      middlewares: [requireRole([ROLES.INVENTORY])],
    },
    {
      matcher: "/admin/stock-locations*",
      middlewares: [requireRole([ROLES.INVENTORY])],
    },
    {
      matcher: "/admin/reservations*",
      middlewares: [requireRole([ROLES.INVENTORY])],
    },

    // ── Medusa native: Pricing ────────────────────────────────────────────────
    {
      matcher: "/admin/price-lists*",
      middlewares: [requireRole([ROLES.PURCHASING])],
    },

    // ── Medusa native: Promotions / discounts ─────────────────────────────────
    {
      matcher: "/admin/promotions*",
      middlewares: [requireRole([ROLES.MARKETING])],
    },
    {
      matcher: "/admin/campaigns*",
      middlewares: [requireRole([ROLES.MARKETING])],
    },

    // NOTE: Admin-only Medusa settings routes (/admin/users*, /admin/invites*,
    // /admin/regions*, /admin/store*, /admin/sales-channels*, /admin/shipping-options*,
    // /admin/fulfillment*) are intentionally NOT protected by requireRole here.
    // These routes opt out of Medusa's global authMiddleware and apply their own
    // authenticate() middleware at the route level. Our requireRole runs before that,
    // so auth_context would always be undefined — breaking login and API calls.
    // Medusa's built-in policies already restrict these routes to admin users.
]

export default defineMiddlewares({ routes })
