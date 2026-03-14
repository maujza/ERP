import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EllipsisHorizontal, Tag, Trash, XMark } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Drawer,
  DropdownMenu,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Select,
  Text,
  createDataTableColumnHelper,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { sdk } from "../../../lib/client"

// ─── Types ────────────────────────────────────────────────────────────────────

type Supplier = { id: string; name: string }

type OrderItem = {
  variant_id: string
  quantity: number
  unit_cost: number
  // internal display state — not sent to server
  _product_id?: string
  _product_title?: string
  _variant_title?: string
}

type PurchaseOrder = {
  id: string
  supplier_id: string
  reference_number: string | null
  status: "draft" | "submitted" | "received" | "cancelled"
  notes: string | null
  expected_delivery_date: string | null
  created_at: string
}

type OrderForm = {
  supplier_id: string
  reference_number: string
  notes: string
  expected_delivery_date: string
}

type ProductOption = { id: string; title: string }
type VariantOption = { id: string; title: string; sku: string | null }
type StockLocation = { id: string; name: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "grey" | "blue" | "green" | "red" | "orange"> = {
  draft: "grey",
  submitted: "blue",
  received: "green",
  cancelled: "red",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  received: "Received",
  cancelled: "Cancelled",
}

// ─── ProductVariantPicker ─────────────────────────────────────────────────────

type PickerProps = {
  variantId: string
  productId: string
  productTitle: string
  variantTitle: string
  onVariantChange: (variantId: string) => void
  onProductChange: (productId: string, productTitle: string) => void
  onCreateProduct: () => void
}

const ProductVariantPicker = ({
  variantId,
  productId,
  productTitle,
  variantTitle,
  onVariantChange,
  onProductChange,
  onCreateProduct,
}: PickerProps) => {
  const [query, setQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: searchData } = useQuery({
    queryKey: ["product-search", query],
    queryFn: () =>
      sdk.client.fetch<{ products: ProductOption[] }>("/admin/products", {
        query: { q: query, limit: 8, fields: "id,title" },
      }),
    enabled: query.length >= 1,
  })

  const { data: productDetail } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: () =>
      sdk.client.fetch<{
        product: { id: string; title: string; variants: VariantOption[] }
      }>(`/admin/products/${productId}`),
    enabled: !!productId,
  })

  const handleSelectProduct = (product: ProductOption) => {
    onProductChange(product.id, product.title)
    onVariantChange("")
    setQuery("")
    setDropdownOpen(false)
  }

  const handleClearProduct = () => {
    onProductChange("", "")
    onVariantChange("")
    setQuery("")
  }

  const variants = productDetail?.product?.variants ?? []

  return (
    <div className="flex flex-col gap-y-2">
      {/* Step 1 — Product */}
      <Label className="text-xs text-ui-fg-subtle">Product</Label>
      {productId ? (
        <div className="flex items-center gap-x-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
          <Text size="small" className="flex-1 truncate">
            {productTitle}
          </Text>
          <button
            type="button"
            onClick={handleClearProduct}
            className="text-ui-fg-muted hover:text-ui-fg-base"
          >
            <XMark />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            placeholder="Search product by name…"
            onChange={(e) => {
              setQuery(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          />
          {dropdownOpen && (searchData?.products ?? []).length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg">
              {(searchData?.products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => handleSelectProduct(p)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-ui-bg-subtle"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Variant (only after product selected) */}
      {productId && (
        <>
          <Label className="text-xs text-ui-fg-subtle">Variant</Label>
          {variants.length > 0 ? (
            <Select value={variantId} onValueChange={onVariantChange}>
              <Select.Trigger>
                <Select.Value placeholder="Select variant…" />
              </Select.Trigger>
              <Select.Content>
                {variants.map((v) => (
                  <Select.Item key={v.id} value={v.id}>
                    {v.title}
                    {v.sku ? ` — ${v.sku}` : ""}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              No variants found
            </Text>
          )}
        </>
      )}

      {variantId && (
        <Text size="xsmall" className="font-mono text-ui-fg-muted">
          {variantId}
        </Text>
      )}

      {/* Create new product link */}
      <button
        type="button"
        onClick={onCreateProduct}
        className="text-left text-xs text-ui-fg-interactive hover:underline"
      >
        + New product not in catalog
      </button>
    </div>
  )
}

// ─── Column helper ─────────────────────────────────────────────────────────────

const columnHelper = createDataTableColumnHelper<PurchaseOrder>()

// ─── Page ─────────────────────────────────────────────────────────────────────

const PurchaseOrdersPage = () => {
  const queryClient = useQueryClient()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null)
  const [locationId, setLocationId] = useState("")
  const [createProductForIdx, setCreateProductForIdx] = useState<number | null>(null)
  const [createMode, setCreateMode] = useState<"new_product" | "new_variant">("new_product")
  const [newProductForm, setNewProductForm] = useState({
    title: "",
    variantTitle: "",
    sku: "",
  })
  const [existingProductQuery, setExistingProductQuery] = useState("")
  const [existingProductId, setExistingProductId] = useState("")
  const [existingProductTitle, setExistingProductTitle] = useState("")
  const [existingProductDropdownOpen, setExistingProductDropdownOpen] = useState(false)
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: 15,
  })
  const [orderForm, setOrderForm] = useState<OrderForm>({
    supplier_id: "",
    reference_number: "",
    notes: "",
    expected_delivery_date: "",
  })
  const [items, setItems] = useState<OrderItem[]>([
    { variant_id: "", quantity: 1, unit_cost: 0 },
  ])

  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", limit, offset],
    queryFn: () =>
      sdk.client.fetch<{ orders: PurchaseOrder[]; count: number }>(
        "/admin/purchase/orders",
        { query: { limit, offset } }
      ),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () =>
      sdk.client.fetch<{ suppliers: Supplier[] }>("/admin/purchase/suppliers", {
        query: { limit: 100 },
      }),
  })

  const { data: existingProductSearchData } = useQuery({
    queryKey: ["existing-product-search", existingProductQuery],
    queryFn: () =>
      sdk.client.fetch<{ products: ProductOption[] }>("/admin/products", {
        query: { q: existingProductQuery, limit: 8, fields: "id,title" },
      }),
    enabled: existingProductQuery.length >= 1 && createMode === "new_variant",
  })

  const { data: locationsData } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () =>
      sdk.client.fetch<{ stock_locations: StockLocation[] }>(
        "/admin/stock-locations",
        { query: { limit: 100 } }
      ),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      sdk.client.fetch("/admin/purchase/orders", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Purchase order created")
      setCreateOpen(false)
      resetForm()
    },
    onError: () => toast.error("Failed to create purchase order"),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Purchase order submitted")
    },
    onError: () => toast.error("Failed to submit purchase order"),
  })

  const receiveMutation = useMutation({
    mutationFn: ({ id, location_id }: { id: string; location_id: string }) =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/receive`, {
        method: "POST",
        body: { location_id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Order received — inventory updated")
      setReceiveOrder(null)
      setLocationId("")
    },
    onError: () => toast.error("Failed to receive purchase order"),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Purchase order cancelled")
    },
    onError: () => toast.error("Failed to cancel purchase order"),
  })

  const resetCreateDrawer = () => {
    setCreateProductForIdx(null)
    setCreateMode("new_product")
    setNewProductForm({ title: "", variantTitle: "", sku: "" })
    setExistingProductQuery("")
    setExistingProductId("")
    setExistingProductTitle("")
    setExistingProductDropdownOpen(false)
  }

  const createProductMutation = useMutation({
    mutationFn: async ({
      form,
      mode,
      targetProductId,
    }: {
      form: typeof newProductForm
      mode: "new_product" | "new_variant"
      targetProductId: string
    }) => {
      if (mode === "new_variant") {
        // Add variant to existing product
        const result = await sdk.client.fetch<{
          variant: { id: string; title: string; sku: string | null }
        }>(`/admin/products/${targetProductId}/variants`, {
          method: "POST",
          body: {
            title: form.variantTitle,
            sku: form.sku,
          },
        })
        return {
          id: targetProductId,
          title: existingProductTitle,
          variants: [result.variant],
        }
      }
      // Create brand-new product
      const result = await sdk.client.fetch<{
        product: {
          id: string
          title: string
          variants: Array<{ id: string; title: string; sku: string | null }>
        }
      }>("/admin/products", {
        method: "POST",
        body: {
          title: form.title,
          status: "published",
          variants: [{ title: form.variantTitle, sku: form.sku }],
        },
      })
      return result.product
    },
    onSuccess: (product) => {
      const firstVariant = product.variants?.[0]
      if (createProductForIdx !== null && firstVariant) {
        setItems((prev) =>
          prev.map((item, i) =>
            i === createProductForIdx
              ? {
                  ...item,
                  variant_id: firstVariant.id,
                  _product_id: product.id,
                  _product_title: product.title,
                  _variant_title: firstVariant.title,
                }
              : item
          )
        )
      }
      queryClient.invalidateQueries({ queryKey: ["product-search"] })
      queryClient.invalidateQueries({ queryKey: ["product-variants", product.id] })
      toast.success(
        createMode === "new_variant"
          ? `Variant added to "${product.title}" and selected`
          : `"${product.title}" created and selected`
      )
      resetCreateDrawer()
    },
    onError: () =>
      toast.error(
        createMode === "new_variant" ? "Failed to add variant" : "Failed to create product"
      ),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setOrderForm({ supplier_id: "", reference_number: "", notes: "", expected_delivery_date: "" })
    setItems([{ variant_id: "", quantity: 1, unit_cost: 0 }])
  }

  const getSupplierName = (id: string) =>
    suppliersData?.suppliers.find((s) => s.id === id)?.name || id

  const updateItem = (index: number, patch: Partial<OrderItem>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const addItem = () =>
    setItems((prev) => [...prev, { variant_id: "", quantity: 1, unit_cost: 0 }])

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index))

  const handleCreate = () => {
    if (!orderForm.supplier_id) {
      toast.error("Supplier is required")
      return
    }
    if (items.some((i) => !i.variant_id)) {
      toast.error("All items need a variant selected")
      return
    }
    if (items.some((i) => i.quantity < 1)) {
      toast.error("Quantity must be at least 1")
      return
    }
    createMutation.mutate({
      supplier_id: orderForm.supplier_id,
      reference_number: orderForm.reference_number || null,
      notes: orderForm.notes || null,
      expected_delivery_date: orderForm.expected_delivery_date || null,
      items: items.map(({ variant_id, quantity, unit_cost }) => ({
        variant_id,
        quantity,
        unit_cost,
      })),
    })
  }

  const handleReceive = () => {
    if (!receiveOrder || !locationId.trim()) {
      toast.error("Stock location is required")
      return
    }
    receiveMutation.mutate({ id: receiveOrder.id, location_id: locationId })
  }

  const handleCreateProduct = () => {
    if (createMode === "new_product" && !newProductForm.title.trim()) {
      toast.error("Product title is required")
      return
    }
    if (createMode === "new_variant" && !existingProductId) {
      toast.error("Select an existing product first")
      return
    }
    if (!newProductForm.variantTitle.trim()) {
      toast.error("Variant title is required")
      return
    }
    if (!newProductForm.sku.trim()) {
      toast.error("SKU is required")
      return
    }
    createProductMutation.mutate({
      form: newProductForm,
      mode: createMode,
      targetProductId: existingProductId,
    })
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  const columns = [
    columnHelper.accessor("reference_number", {
      header: "Reference",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("supplier_id", {
      header: "Supplier",
      cell: ({ getValue }) => getSupplierName(getValue()),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue()
        return (
          <Badge size="2xsmall" color={STATUS_COLORS[s] || "grey"}>
            {STATUS_LABELS[s] || s}
          </Badge>
        )
      },
    }),
    columnHelper.accessor("expected_delivery_date", {
      header: "Expected Delivery",
      cell: ({ getValue }) => {
        const v = getValue()
        return v ? new Date(v).toLocaleDateString() : "—"
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const order = row.original
        const canCancel = order.status === "draft" || order.status === "submitted"
        return (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="small" variant="transparent">
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {order.status === "draft" && (
                <DropdownMenu.Item
                  className="gap-x-2"
                  onClick={() => submitMutation.mutate(order.id)}
                >
                  Submit Order
                </DropdownMenu.Item>
              )}
              {order.status === "submitted" && (
                <DropdownMenu.Item
                  className="gap-x-2"
                  onClick={() => setReceiveOrder(order)}
                >
                  Mark as Received
                </DropdownMenu.Item>
              )}
              {order.status === "received" && (
                <DropdownMenu.Item disabled className="gap-x-2 text-ui-fg-muted">
                  Received ✓
                </DropdownMenu.Item>
              )}
              {canCancel && (
                <>
                  <DropdownMenu.Separator />
                  <Prompt>
                    <Prompt.Trigger asChild>
                      <DropdownMenu.Item
                        className="gap-x-2 text-ui-tag-red-text"
                        onSelect={(e) => e.preventDefault()}
                      >
                        Cancel Order
                      </DropdownMenu.Item>
                    </Prompt.Trigger>
                    <Prompt.Content>
                      <Prompt.Header>
                        <Prompt.Title>Cancel Purchase Order</Prompt.Title>
                        <Prompt.Description>
                          Are you sure you want to cancel{" "}
                          <strong>
                            {order.reference_number || order.id}
                          </strong>
                          ? This cannot be undone.
                        </Prompt.Description>
                      </Prompt.Header>
                      <Prompt.Footer>
                        <Prompt.Cancel>Keep</Prompt.Cancel>
                        <Prompt.Action
                          onClick={() => cancelMutation.mutate(order.id)}
                        >
                          Cancel Order
                        </Prompt.Action>
                      </Prompt.Footer>
                    </Prompt.Content>
                  </Prompt>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu>
        )
      },
    }),
  ]

  const table = useDataTable({
    data: data?.orders || [],
    columns,
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: { state: pagination, onPaginationChange: setPagination },
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Purchase Orders</Heading>
        <Button size="small" onClick={() => setCreateOpen(true)}>
          New Order
        </Button>
      </div>

      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      {/* ── Create PO modal ──────────────────────────────────────────────── */}
      <FocusModal open={createOpen} onOpenChange={setCreateOpen}>
        <FocusModal.Content>
          <div className="flex h-full flex-col overflow-hidden">
            <FocusModal.Header>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button
                  size="small"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-2xl">
                <Heading className="mb-6">New Purchase Order</Heading>
                <div className="flex flex-col gap-y-4">
                  {/* Supplier */}
                  <div className="flex flex-col gap-y-2">
                    <Label>Supplier *</Label>
                    <Select
                      value={orderForm.supplier_id}
                      onValueChange={(v) =>
                        setOrderForm({ ...orderForm, supplier_id: v })
                      }
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a supplier" />
                      </Select.Trigger>
                      <Select.Content>
                        {suppliersData?.suppliers.map((s) => (
                          <Select.Item key={s.id} value={s.id}>
                            {s.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>

                  {/* Reference */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="ref">Reference Number</Label>
                    <Input
                      id="ref"
                      value={orderForm.reference_number}
                      onChange={(e) =>
                        setOrderForm({ ...orderForm, reference_number: e.target.value })
                      }
                      placeholder="PO-2026-001"
                    />
                  </div>

                  {/* Delivery date */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="delivery">Expected Delivery Date</Label>
                    <Input
                      id="delivery"
                      type="date"
                      value={orderForm.expected_delivery_date}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          expected_delivery_date: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={orderForm.notes}
                      onChange={(e) =>
                        setOrderForm({ ...orderForm, notes: e.target.value })
                      }
                      placeholder="Additional notes…"
                    />
                  </div>

                  {/* Items */}
                  <div className="flex flex-col gap-y-3">
                    <div className="flex items-center justify-between">
                      <Text size="small" weight="plus">
                        Items *
                      </Text>
                      <Button size="small" variant="secondary" onClick={addItem}>
                        Add Item
                      </Button>
                    </div>

                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-ui-border-base p-4"
                      >
                        <div className="flex items-start gap-x-3">
                          {/* Product → Variant picker */}
                          <div className="flex-1">
                            <ProductVariantPicker
                              variantId={item.variant_id}
                              productId={item._product_id ?? ""}
                              productTitle={item._product_title ?? ""}
                              variantTitle={item._variant_title ?? ""}
                              onVariantChange={(id) =>
                                updateItem(index, { variant_id: id })
                              }
                              onProductChange={(pid, ptitle) =>
                                updateItem(index, {
                                  _product_id: pid,
                                  _product_title: ptitle,
                                  variant_id: "",
                                  _variant_title: "",
                                })
                              }
                              onCreateProduct={() => setCreateProductForIdx(index)}
                            />
                          </div>

                          {/* Qty */}
                          <div className="flex w-24 flex-col gap-y-2">
                            <Label>Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, {
                                  quantity: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </div>

                          {/* Unit cost */}
                          <div className="flex w-32 flex-col gap-y-2">
                            <Label>Unit Cost</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_cost || ""}
                              onChange={(e) =>
                                updateItem(index, {
                                  unit_cost: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </div>

                          {/* Remove */}
                          <div className="mt-6">
                            <IconButton
                              size="small"
                              variant="transparent"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                            >
                              <Trash />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FocusModal.Body>
          </div>
        </FocusModal.Content>
      </FocusModal>

      {/* ── Create Product / Variant drawer ──────────────────────────────── */}
      <Drawer
        open={createProductForIdx !== null}
        onOpenChange={(open) => { if (!open) resetCreateDrawer() }}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {createMode === "new_product" ? "New Product" : "Add Variant to Existing Product"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto p-6">
            <div className="flex flex-col gap-y-4">

              {/* Mode toggle */}
              <div className="flex rounded-md border border-ui-border-base overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCreateMode("new_product")}
                  className={`flex-1 py-2 text-sm transition-colors ${
                    createMode === "new_product"
                      ? "bg-ui-button-neutral text-ui-button-neutral-fg font-medium"
                      : "bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-subtle"
                  }`}
                >
                  New product
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("new_variant")}
                  className={`flex-1 py-2 text-sm transition-colors ${
                    createMode === "new_variant"
                      ? "bg-ui-button-neutral text-ui-button-neutral-fg font-medium"
                      : "bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-subtle"
                  }`}
                >
                  New variant
                </button>
              </div>

              {/* New product — product title */}
              {createMode === "new_product" && (
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="np-title">Product Title *</Label>
                  <Input
                    id="np-title"
                    value={newProductForm.title}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, title: e.target.value })
                    }
                    placeholder="e.g. Gold Chain Necklace"
                  />
                </div>
              )}

              {/* New variant — pick existing product */}
              {createMode === "new_variant" && (
                <div className="flex flex-col gap-y-2">
                  <Label>Existing Product *</Label>
                  {existingProductId ? (
                    <div className="flex items-center gap-x-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
                      <Text size="small" className="flex-1 truncate">
                        {existingProductTitle}
                      </Text>
                      <button
                        type="button"
                        onClick={() => {
                          setExistingProductId("")
                          setExistingProductTitle("")
                          setExistingProductQuery("")
                        }}
                        className="text-ui-fg-muted hover:text-ui-fg-base"
                      >
                        <XMark />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        value={existingProductQuery}
                        placeholder="Search product by name…"
                        onChange={(e) => {
                          setExistingProductQuery(e.target.value)
                          setExistingProductDropdownOpen(true)
                        }}
                        onFocus={() => setExistingProductDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setExistingProductDropdownOpen(false), 150)
                        }
                      />
                      {existingProductDropdownOpen &&
                        (existingProductSearchData?.products ?? []).length > 0 && (
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg">
                            {(existingProductSearchData?.products ?? []).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => {
                                  setExistingProductId(p.id)
                                  setExistingProductTitle(p.title)
                                  setExistingProductQuery("")
                                  setExistingProductDropdownOpen(false)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-ui-bg-subtle"
                              >
                                {p.title}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* Variant title — required */}
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="np-variant">Variant Title *</Label>
                <Input
                  id="np-variant"
                  value={newProductForm.variantTitle}
                  onChange={(e) =>
                    setNewProductForm({ ...newProductForm, variantTitle: e.target.value })
                  }
                  placeholder="e.g. Silver / 42cm / Size M"
                />
              </div>

              {/* SKU — required */}
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="np-sku">SKU *</Label>
                <Input
                  id="np-sku"
                  value={newProductForm.sku}
                  onChange={(e) =>
                    setNewProductForm({ ...newProductForm, sku: e.target.value })
                  }
                  placeholder="CHAIN-GOLD-42CM"
                />
              </div>

            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={createProductMutation.isPending}
                >
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleCreateProduct}
                isLoading={createProductMutation.isPending}
              >
                {createMode === "new_variant" ? "Add Variant & Select" : "Create & Select"}
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      {/* ── Receive Order drawer ──────────────────────────────────────────── */}
      <Drawer
        open={!!receiveOrder}
        onOpenChange={(open) => {
          if (!open) {
            setReceiveOrder(null)
            setLocationId("")
          }
        }}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Mark as Received</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto p-6">
            <div className="flex flex-col gap-y-4">
              <Text size="small" className="text-ui-fg-subtle">
                Receiving: <strong>{receiveOrder?.reference_number || receiveOrder?.id}</strong>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Confirming receipt will update inventory levels for all items in
                this order at the selected stock location.
              </Text>
              <div className="flex flex-col gap-y-2">
                <Label>Stock Location *</Label>
                {(locationsData?.stock_locations ?? []).length > 0 ? (
                  <Select value={locationId} onValueChange={setLocationId}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select stock location" />
                    </Select.Trigger>
                    <Select.Content>
                      {locationsData!.stock_locations.map((loc) => (
                        <Select.Item key={loc.id} value={loc.id}>
                          {loc.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                ) : (
                  <Input
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    placeholder="sloc_…"
                  />
                )}
                <Text size="xsmall" className="text-ui-fg-muted">
                  Manage locations under Settings → Stock Locations
                </Text>
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={receiveMutation.isPending}
                >
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleReceive}
                isLoading={receiveMutation.isPending}
              >
                Confirm Receipt
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Purchase Orders",
  icon: Tag,
})

export default PurchaseOrdersPage
