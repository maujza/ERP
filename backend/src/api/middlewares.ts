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

export default defineMiddlewares({
  routes: [
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
  ],
})
