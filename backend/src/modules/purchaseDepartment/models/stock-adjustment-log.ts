import { model } from "@medusajs/framework/utils"

export const STOCK_ADJUSTMENT_REASON_CODES = [
  "po_receive",
  "order_pick",
  "manual_adjustment",
  "return_restock",
  "correction",
] as const

export type StockAdjustmentReasonCode = (typeof STOCK_ADJUSTMENT_REASON_CODES)[number]

// Append-only audit log for every inventory level change.
// Never updated, never deleted. reason_code + actor_id + delta required.
//
// State diagram (reason_code values):
//
//   PO received ──────────────── po_receive
//   Order line item picked ────── order_pick
//   Return accepted ──────────── return_restock
//   Admin manual edit ─────────── manual_adjustment
//   Data correction ──────────── correction
const StockAdjustmentLog = model.define("stock_adjustment_log", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  location_id: model.text(),
  delta: model.number(),
  reason_code: model.enum([...STOCK_ADJUSTMENT_REASON_CODES]),
  actor_id: model.text().nullable(),
  purchase_order_id: model.text().nullable(),
})

export default StockAdjustmentLog
