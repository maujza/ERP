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

export const ReceivePurchaseOrderSchema = z.object({
  location_id: z.string().min(1),
})
export type ReceivePurchaseOrderSchema = z.infer<typeof ReceivePurchaseOrderSchema>

export const GetListSchema = createFindParams()

// Exported for policy snapshot tests — defineMiddlewares may transform the
// config in ways that make method inspection unreliable; import this directly.
export const routes: Parameters<typeof defineMiddlewares>[0]["routes"] = [
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

    // ── Medusa native: Admin-only settings ────────────────────────────────────
    // Team management, regions, store settings — admin superuser only.
    // requireRole([]) means no non-admin role is allowed; admin bypasses as usual.
    {
      matcher: "/admin/users*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/invites*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/regions*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/store*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/sales-channels*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/shipping-options*",
      middlewares: [requireRole([])],
    },
    {
      matcher: "/admin/fulfillment*",
      middlewares: [requireRole([])],
    },
]

export default defineMiddlewares({ routes })
