# ADR-2026-02-15 — Easy Inventory (Visual Recognition + OCR)

- Status: Proposed
- Date: 2026-02-15
- Decision ID: easy-inventory
- Scope: Inventory Ingestion / Initial Stock Registration
- Implementation Horizon: Undefined (Conceptual Reference)

---

## 1. Problem Context

Some warehouses receive goods in mixed bulk bags with no reliable classification or count.

The traditional administrative flow:

purchase_order → goods_receipt → item_registration → stock

does not occur or is unreliable due to:

- purchases by weight or assortments
- catalogs inconsistent with received goods
- manual restocking decisions ("by eye")
- abandoned or unused backoffice systems

Result:

Initial inventory load is slow, operator-dependent, and costly.  
Systems are often abandoned because maintaining accurate data requires excessive manual effort.

Goal:

Allow a system to operate even when structured administrative processes do not exist.

This ADR does NOT initiate development.  
It records a conceptual approach for future evaluation.

---

## 2. Proposed Decision

Evaluate an inventory ingestion workflow based on image capture from a device
(phone, webcam, or camera connected to PC).

Operator workflow:

identify product via image → enter quantity → register

Product identification will rely on existing vision services (no custom model training).

Recognition fallback chain:

1. barcode_or_qr_detected
2. OCR_detected_label
3. match_vendor_catalog_image
4. match_local_catalog_image
5. create_internal_sku_auto

The system MUST NOT depend on an accurate preexisting catalog.

---

## 3. Operational Behavior

### Input
image_capture_event

### Output
inventory_record_created

### Required Fields
- quantity
- confidence_source
- timestamp
- operator_id

### confidence_source enum
barcode | ocr | vendor_match | local_match | manual_generated

---

## 4. Alternatives Considered

### Manual Catalog Entry
Operator identifies item and searches catalog.

Rejected because:
- high operational time
- repetitive work
- requires trained personnel

---

### Perfect Purchasing Registration
Every purchase generates inventory automatically.

Rejected because:
- not viable for bulk / mixed imports
- real world variability breaks assumption

---

### Train Custom Vision Models
Higher accuracy but requires:
- dataset maintenance
- ML operations cost
- ongoing retraining

Rejected at conceptual stage due to cost/benefit ratio.

---

## 5. Rationale

The approach:

- removes administrative preconditions
- reduces expert knowledge requirement
- tolerates real-world inconsistencies
- leverages mature SaaS technology
- minimizes operational friction

This is an adoption enabler, not a micro-optimization.

---

## 6. Known Risks

### Catalog Drift
Supplier images differ from actual products.

Mitigation:
Allow creation of local visual catalog from photographed real stock.

---

### Watermarks / Visual Variations
May break image matching.

Fallback:
OCR or auto-SKU generation.

---

### Weight-based Purchasing
Inventory may not start unit-based.

System records observed units without forcing accounting model change.

---

### Initial Stock Trust
Each record MUST store identification origin for traceability.

---

### External Dependency
Relies on third-party APIs (vision/OCR).

Risk accepted due to intermittent usage pattern.

---

## 7. Cost Order of Magnitude

OCR:
~1.5 USD / 1000 images

Image recognition:
~0.5–1 USD / 1000 images

Expected usage pattern keeps cost low.

---

## 8. Non-Goals

This system does NOT aim to:

- replace ERP purchasing workflows
- ensure accounting correctness
- enforce supplier discipline
- provide perfect recognition accuracy

It only enables system bootstrap in chaotic environments.

---

## 9. Future Evaluation Criteria

A future implementation should be reconsidered if:

- inventory initialization exceeds acceptable operational effort
- system adoption fails due to friction
- catalog maintenance becomes operational bottleneck

---

## 10. Final Statement

This ADR records a conceptual strategy to enable inventory system adoption
in environments lacking structured administrative processes.

No implementation timeline is defined.
