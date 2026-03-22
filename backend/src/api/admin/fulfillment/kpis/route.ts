import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../modules/purchaseDepartment/service"

const LEAD_TIME_WINDOW_DAYS = 30
const STUCK_THRESHOLD_MS = 24 * 60 * 60 * 1000

type FulfillmentRecordRow = {
  id: string
  order_id: string
  status: string
  created_at: string | Date
  updated_at: string | Date
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const fulfillmentService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const windowStart = new Date(Date.now() - LEAD_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS)

  // Two targeted queries instead of fetching all records
  const [recentDispatched, stuckInPicking] = await Promise.all([
    fulfillmentService.listFulfillmentRecords({
      status: "dispatched",
    }) as Promise<FulfillmentRecordRow[]>,
    fulfillmentService.listFulfillmentRecords({
      status: "picking",
    }) as Promise<FulfillmentRecordRow[]>,
  ])

  // Filter dispatched records to the last 30 days in JS (MikroORM filter syntax varies by version)
  const recentDispatchedInWindow = recentDispatched.filter(
    (r) => new Date(r.created_at) >= windowStart
  )

  // Filter picking records stuck beyond the threshold
  const stuck = stuckInPicking.filter(
    (r) => new Date(r.updated_at) < stuckCutoff
  )

  let avgLeadTimeMinutes: number | null = null
  if (recentDispatchedInWindow.length > 0) {
    const totalMs = recentDispatchedInWindow.reduce((sum, r) => {
      const createdAt = new Date(r.created_at).getTime()
      const updatedAt = new Date(r.updated_at).getTime()
      return sum + (updatedAt - createdAt)
    }, 0)
    avgLeadTimeMinutes = Math.round(totalMs / recentDispatchedInWindow.length / (60 * 1000))
  }

  res.json({
    avg_lead_time_minutes: avgLeadTimeMinutes,
    stuck_in_picking_count: stuck.length,
    stuck_in_picking_orders: stuck.map((r) => r.order_id),
    dispatched_count_30d: recentDispatchedInWindow.length,
  })
}
