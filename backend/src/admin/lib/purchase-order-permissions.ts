import { ROLES, type Role } from "./roles"

export type PurchaseOrderStatus = "draft" | "submitted" | "received" | "cancelled"

export function canCreatePurchaseOrders(role?: Role | null) {
  return role === ROLES.ADMIN || role === ROLES.PURCHASING
}

export function canSubmitPurchaseOrder(
  role: Role | null | undefined,
  status: PurchaseOrderStatus
) {
  return canCreatePurchaseOrders(role) && status === "draft"
}

export function canCancelPurchaseOrder(
  role: Role | null | undefined,
  status: PurchaseOrderStatus
) {
  return canCreatePurchaseOrders(role) && (status === "draft" || status === "submitted")
}

export function canReceivePurchaseOrder(
  role: Role | null | undefined,
  status: PurchaseOrderStatus
) {
  return (
    (role === ROLES.ADMIN || role === ROLES.PURCHASING || role === ROLES.INVENTORY) &&
    status === "submitted"
  )
}
