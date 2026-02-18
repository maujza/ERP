# ADR-2026-02-18 — ERP Operations: Roles, Physical→ERP Mapping, and Operational Rules

- **Status:** Proposed
- **Date:** 2026-02-18
- **ID:** 2026-02-18-erp-ops
- **Scope:** Daily Operations / Receiving / Inventory / Customer Service / Purchasing / Marketing

---

## 1. Executive Summary
Define a minimal operational specification describing:
- role responsibilities
- mandatory mapping between real-world events and ERP events
- non-negotiable operational policies
- SKU conventions and baseline automations

**Golden Rule:**  
If a real-world event is not recorded in the ERP → it did not happen.

---

## 2. Context / Problem
The bijouterie wholesale operation includes:
- manual warehouse handling
- mixed assortment purchasing
- inconsistent administrative records
- high traceability risk

Without strict physical ↔ digital mapping, the ERP loses reliability and the business loses control over stock, costs, and returns.

---

## 3. Decision
Adopt an operational contract that:

1. Defines role responsibilities (ERP vs real life)
2. Enforces 1:1 mapping between physical and ERP events
3. Establishes immutable operational policies
4. Standardizes SKU structure and minimal alerts

This ADR defines behavior, not implementation.

---

## 4. Roles and Responsibilities

### ADMIN (System Owner)
**ERP**
- create users & permissions
- create vendors
- create products
- configure taxes & shipping
- review logs & reports
- correct operational errors

**Real Life**
- validate product data before publishing
- define prices with Marketing
- train staff
- maintain backups

**Must NOT**
- fulfill orders
- receive goods
- handle customer tickets

---

### CUSTOMER (Storefront User)
**ERP**
- no direct usage (system generated records)

**Real Life**
- places orders
- receives package
- reports issues to Customer Service

---

### INVENTORY (Warehouse)
**ERP**
- receive purchase orders
- count units
- record discrepancies
- stock adjustments (with reason)
- assign locations
- picking & packing
- dispatch orders
- inspect returns and restock

**Real Life**
- unload goods
- count items
- basic QC inspection
- store items
- pack and ship orders

**Forbidden**
- create products
- change prices
- delete movements

---

### PURCHASING — MERCHANDISE
**ERP**
- create purchase orders
- upload costs & catalogs
- update shipment status

**Real Life**
- negotiate with suppliers
- collect product photos
- coordinate shipment
- notify warehouse

**Rule**
All purchases must exist in ERP within **48 hours**

---

### PURCHASING — OPERATIONS
**ERP**
- create supply orders
- upload invoices

**Real Life**
- detect shortages
- request quotes
- purchase supplies

---

### MARKETING
**ERP**
- edit descriptions
- upload photos
- create promotions & coupons
- view sales analytics

**Restriction**
Cannot access cost_price

---

### CUSTOMER SERVICE
**ERP**
- search orders
- create tickets
- approve returns
- generate return labels
- process refunds (within threshold)

**Real Life**
- communicate with customer
- coordinate with inventory

---

## 5. Physical → ERP Event Mapping

```yaml
container_arrived:
  action: mark_po_arrived
  actor: purchasing

goods_counted:
  action: receive_po_items
  actor: inventory
  required_fields: [po_id, sku, counted_qty, discrepancy_flag, photos?]

order_placed_online:
  action: create_sales_order
  actor: system

items_picked:
  action: set_order_picking
  actor: inventory

package_packed:
  action: set_order_packed
  actor: inventory
  required_fields: [package_weight, dimensions]

courier_collected:
  action: set_order_dispatched
  actor: inventory
  required_fields: [tracking_number, courier]

customer_complaint:
  action: create_ticket
  actor: customer_service

return_arrived:
  action: receive_rma
  actor: inventory
  required_fields: [rma_id, photos, disposition_suggested]
````

### Invariants

* Cannot receive PO without physical count
* Cannot dispatch without tracking number
* Stock adjustment requires reason_code + operator + timestamp

---

## 6. SKU Standard

Format:

```
{BRAND}-{PLATING}-{STONE}-{NNNNN}
Example: AR-GP-CR-00125
```

Also store:

* vendor_sku
* barcode

---

## 7. Minimum Automations

* low_stock → notify purchasing & inventory
* aged_stock (>60 days unsold) → notify marketing
* packed_not_shipped (>24h) → notify inventory
* return_not_inspected (>48h) → notify inventory manager

---

## 8. Operational Policies (Non-Negotiable)

* Never receive goods without counting
* Never adjust stock without reason
* Never refund without inspection
* Only Admin can change prices
* No hard deletes (use cancel/void with audit trail)

---

## 9. Operational Checklists

### Receiving

* verify container seal
* unload and separate
* count each SKU
* attach damage photos
* assign storage location

### Picking & Packing

* generate pick list
* verify SKU
* weigh & measure
* print label
* dispatch with tracking

### Returns

* open package
* inspect and photograph
* assign disposition (resell / repair / scrap)
* update stock

---

## 10. Operational KPIs

* pick accuracy
* fulfillment lead time
* stock variance
* returns per SKU
* RMA resolution time

---

## 11. Consequences

This ADR acts as an operational contract.

Future technical implementation MUST enforce:

* state transitions
* required fields
* invariant validation

Violations must generate incidents.

---

## 12. Suggested Next Steps (If Implemented)

1. Define event JSON schema
2. Enforce transition validation server-side
3. Implement alerts
4. Create product import template
5. Print warehouse SOP

---

## 13. Purpose

Single source of truth for humans and automation agents interacting with ERP operations.

**Current state:** Proposed — pending operational review
