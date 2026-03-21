import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../modules/purchaseDepartment/service"

const LEAD_TIME_WINDOW_DAYS = 30
const STUCK_THRESHOLD_MS = 24 * 60 * 60 * 1000

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const fulfillmentService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const windowStart = new Date(Date.now() - LEAD_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS)

  // Fetch all fulfillment records (small dataset for a jewelry store)
  const allRecords = await fulfillmentService.listFulfillmentRecords({})

  // Avg lead time: dispatched records created within the last 30 days
  const recentDispatched = allRecords.filter(
    (r: any) =>
      r.status === "dispatched" &&
      new Date(r.created_at) >= windowStart
  )

  let avgLeadTimeMinutes: number | null = null
  if (recentDispatched.length > 0) {
    const totalMs = recentDispatched.reduce((sum: number, r: any) => {
      const createdAt = new Date(r.created_at).getTime()
      const updatedAt = new Date(r.updated_at).getTime()
      return sum + (updatedAt - createdAt)
    }, 0)
    avgLeadTimeMinutes = Math.round(totalMs / recentDispatched.length / (60 * 1000))
  }

  // Orders stuck in picking >24h
  const stuckInPicking = allRecords.filter(
    (r: any) =>
      r.status === "picking" &&
      new Date(r.updated_at) < stuckCutoff
  )

  res.json({
    avg_lead_time_minutes: avgLeadTimeMinutes,
    stuck_in_picking_count: stuckInPicking.length,
    stuck_in_picking_orders: stuckInPicking.map((r: any) => r.order_id),
    dispatched_count_30d: recentDispatched.length,
  })
}
