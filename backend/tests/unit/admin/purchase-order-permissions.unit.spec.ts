import {
  canCancelPurchaseOrder,
  canCreatePurchaseOrders,
  canReceivePurchaseOrder,
  canSubmitPurchaseOrder,
} from "../../../src/admin/lib/purchase-order-permissions"
import { ROLES } from "../../../src/admin/lib/roles"

describe("purchase order permissions", () => {
  describe("canCreatePurchaseOrders", () => {
    it("allows admin and purchasing roles", () => {
      expect(canCreatePurchaseOrders(ROLES.ADMIN)).toBe(true)
      expect(canCreatePurchaseOrders(ROLES.PURCHASING)).toBe(true)
    })

    it("denies inventory and missing roles", () => {
      expect(canCreatePurchaseOrders(ROLES.INVENTORY)).toBe(false)
      expect(canCreatePurchaseOrders(undefined)).toBe(false)
      expect(canCreatePurchaseOrders(null)).toBe(false)
    })
  })

  describe("canSubmitPurchaseOrder", () => {
    it("allows admin and purchasing users to submit draft orders", () => {
      expect(canSubmitPurchaseOrder(ROLES.ADMIN, "draft")).toBe(true)
      expect(canSubmitPurchaseOrder(ROLES.PURCHASING, "draft")).toBe(true)
    })

    it("denies non-draft orders and read-only roles", () => {
      expect(canSubmitPurchaseOrder(ROLES.PURCHASING, "submitted")).toBe(false)
      expect(canSubmitPurchaseOrder(ROLES.INVENTORY, "draft")).toBe(false)
    })
  })

  describe("canCancelPurchaseOrder", () => {
    it("allows admin and purchasing users to cancel draft and submitted orders", () => {
      expect(canCancelPurchaseOrder(ROLES.ADMIN, "draft")).toBe(true)
      expect(canCancelPurchaseOrder(ROLES.PURCHASING, "submitted")).toBe(true)
    })

    it("denies received orders and inventory users", () => {
      expect(canCancelPurchaseOrder(ROLES.PURCHASING, "received")).toBe(false)
      expect(canCancelPurchaseOrder(ROLES.INVENTORY, "draft")).toBe(false)
    })
  })

  describe("canReceivePurchaseOrder", () => {
    it("allows admin, purchasing, and inventory users to receive submitted orders", () => {
      expect(canReceivePurchaseOrder(ROLES.ADMIN, "submitted")).toBe(true)
      expect(canReceivePurchaseOrder(ROLES.PURCHASING, "submitted")).toBe(true)
      expect(canReceivePurchaseOrder(ROLES.INVENTORY, "submitted")).toBe(true)
    })

    it("denies draft orders and unrelated roles", () => {
      expect(canReceivePurchaseOrder(ROLES.INVENTORY, "draft")).toBe(false)
      expect(canReceivePurchaseOrder(ROLES.MARKETING, "submitted")).toBe(false)
      expect(canReceivePurchaseOrder(undefined, "submitted")).toBe(false)
    })
  })
})
