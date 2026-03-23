import { MedusaError } from "@medusajs/framework/utils"
import { GET } from "../../../../../src/api/admin/purchase/orders/[id]/route"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po_01",
    supplier_id: "sup_01",
    status: "draft",
    items: [],
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeItemsWithVariants(items: Record<string, unknown>[] = []) {
  return items
}

function makeReq({
  orderId = "po_01",
  order = makeOrder() as ReturnType<typeof makeOrder> | null,
  itemsWithVariants = [] as Record<string, unknown>[],
}: {
  orderId?: string
  order?: ReturnType<typeof makeOrder> | null
  itemsWithVariants?: Record<string, unknown>[]
} = {}) {
  const purchaseService = {
    retrievePurchaseOrder: order
      ? jest.fn().mockResolvedValue(order)
      : jest.fn().mockRejectedValue(new Error("Not found")),
  }

  const query = {
    graph: jest.fn().mockResolvedValue({ data: itemsWithVariants }),
  }

  return {
    params: { id: orderId },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) return purchaseService
        if (key === "query") return query
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    _purchaseService: purchaseService,
    _query: query,
  } as any
}

function makeRes() {
  return { json: jest.fn().mockReturnThis() } as any
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("GET /admin/purchase/orders/:id", () => {
  it("returns the purchase order for the given id", async () => {
    const order = makeOrder({ id: "po_01" })
    const items = [{ id: "poi_01", variant_id: "var_01", quantity: 5 }]
    const req = makeReq({ orderId: "po_01", order, itemsWithVariants: items })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("order")
    expect(payload.order).toMatchObject({ id: "po_01" })
  })

  it("includes items fetched via query.graph (with variant data)", async () => {
    const order = makeOrder({ id: "po_01", items: [] })
    const items = [
      { id: "poi_01", variant_id: "var_01", quantity: 5, product_variant: { id: "var_01", title: "S" } },
    ]
    const req = makeReq({ orderId: "po_01", order, itemsWithVariants: items })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload.order.items).toEqual(items)
  })

  it("queries purchase_order_item graph with the order id filter", async () => {
    const order = makeOrder({ id: "po_99" })
    const req = makeReq({ orderId: "po_99", order })
    const res = makeRes()

    await GET(req, res)

    expect(req._query.graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "purchase_order_item",
        filters: { purchase_order_id: "po_99" },
      })
    )
  })

  it("throws NOT_FOUND when the order does not exist", async () => {
    const req = makeReq({ orderId: "po_missing", order: null })
    const res = makeRes()

    await expect(GET(req, res)).rejects.toThrow(MedusaError)
  })

  it("retrieves the order with relations including items", async () => {
    const order = makeOrder()
    const req = makeReq({ order })
    const res = makeRes()

    await GET(req, res)

    expect(req._purchaseService.retrievePurchaseOrder).toHaveBeenCalledWith(
      "po_01",
      expect.objectContaining({ relations: expect.arrayContaining(["items"]) })
    )
  })

  it("replaces the base order.items with enriched itemsWithVariants", async () => {
    const order = makeOrder({ items: [{ id: "poi_01", quantity: 1 }] })
    const enrichedItems = [{ id: "poi_01", quantity: 1, product_variant: { id: "var_01" } }]
    const req = makeReq({ order, itemsWithVariants: enrichedItems })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    // Items should be the enriched version from the query
    expect(payload.order.items).toEqual(enrichedItems)
  })
})
