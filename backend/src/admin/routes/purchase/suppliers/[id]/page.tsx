"use client"

import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { sdk } from "../../../../lib/client"

type Supplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

type SupplierDetailResponse = {
  supplier: Supplier
  fill_rate: number | null
  fill_rate_meta: {
    total_ordered: number
    total_received: number
    po_count: number
  }
}

const SupplierDetailPage = () => {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery<SupplierDetailResponse>({
    queryKey: ["supplier-detail", id],
    queryFn: () => sdk.client.fetch(`/admin/purchase/suppliers/${id}`) as Promise<SupplierDetailResponse>,
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Loading...</Text>
      </Container>
    )
  }

  if (isError || !data?.supplier) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Supplier not found.</Text>
      </Container>
    )
  }

  const { supplier, fill_rate, fill_rate_meta } = data

  const fillRateColor =
    fill_rate === null
      ? ("grey" as const)
      : fill_rate >= 95
      ? ("green" as const)
      : fill_rate >= 80
      ? ("orange" as const)
      : ("red" as const)

  return (
    <div className="flex flex-col gap-4 p-6">
      <Container className="p-6">
        <Heading level="h1">{supplier.name}</Heading>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {supplier.email && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">Email</Text>
              <Text>{supplier.email}</Text>
            </div>
          )}
          {supplier.phone && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">Phone</Text>
              <Text>{supplier.phone}</Text>
            </div>
          )}
          {supplier.address && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">Address</Text>
              <Text>{supplier.address}</Text>
            </div>
          )}
          {supplier.notes && (
            <div className="col-span-2 md:col-span-3">
              <Text size="small" className="text-ui-fg-subtle">Notes</Text>
              <Text>{supplier.notes}</Text>
            </div>
          )}
        </div>
      </Container>

      {/* Fill Rate KPI */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Fill Rate</Heading>
        <div className="flex items-center gap-4">
          <div>
            <Text size="small" className="text-ui-fg-subtle">Fill rate</Text>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-3xl font-semibold">
                {fill_rate !== null ? `${fill_rate}%` : "—"}
              </span>
              <Badge color={fillRateColor} size="2xsmall">
                {fill_rate === null
                  ? "No data"
                  : fill_rate >= 95
                  ? "Excellent"
                  : fill_rate >= 80
                  ? "Good"
                  : "Below target"}
              </Badge>
            </div>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              {fill_rate_meta.po_count === 0
                ? "No received purchase orders yet."
                : `${fill_rate_meta.total_received} of ${fill_rate_meta.total_ordered} units received across ${fill_rate_meta.po_count} PO${fill_rate_meta.po_count !== 1 ? "s" : ""}`}
            </Text>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default SupplierDetailPage
