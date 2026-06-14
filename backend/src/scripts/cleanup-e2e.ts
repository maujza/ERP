/**
 * cleanup-e2e.ts — removes the test-scoped catalog created by seed-e2e.ts
 *
 * Run with:
 *   cd backend && npx medusa exec src/scripts/cleanup-e2e.ts
 *   (or `npm run cleanup:e2e`)
 *
 * Deletes exactly what seed-e2e.ts provisioned: products tagged
 * metadata.e2e="true" (or with an "e2e-" handle prefix) and inventory items
 * whose SKU starts with "E2E-". Invoked by each Playwright suite's
 * globalTeardown so the database returns to its pre-run state. Safe to run when
 * nothing was provisioned — it is a no-op in that case.
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  deleteCollectionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function cleanupE2EData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventoryModuleService: any = container.resolve(Modules.INVENTORY);

  // ── Delete tagged E2E products ──────────────────────────────────────────────
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata"],
  });
  const productIds = (products as Array<{ id: string; handle?: string | null; metadata?: Record<string, unknown> | null }>)
    .filter((p) => p?.metadata?.e2e === "true" || String(p.handle ?? "").startsWith("e2e-"))
    .map((p) => p.id);

  if (productIds.length > 0) {
    // Delete one at a time: a product referenced by a (test) order whose
    // inventory reservation is still open cannot have its inventory item
    // deleted, which would otherwise fail the whole batch and the teardown.
    let deleted = 0;
    for (const id of productIds) {
      try {
        await deleteProductsWorkflow(container).run({ input: { ids: [id] } });
        deleted += 1;
      } catch (e) {
        logger.warn(
          `cleanup-e2e: could not delete product ${id} (likely referenced by a test order): ${(e as Error).message}`
        );
      }
    }
    logger.info(`cleanup-e2e: deleted ${deleted}/${productIds.length} E2E product(s).`);
  } else {
    logger.info("cleanup-e2e: no E2E products to delete.");
  }

  // ── Delete E2E-tagged collections (only ones seed-e2e introduced) ───────────
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "metadata"],
  });
  const collectionIds = (collections as Array<{ id: string; metadata?: Record<string, unknown> | null }>)
    .filter((c) => c?.metadata?.e2e === "true")
    .map((c) => c.id);

  if (collectionIds.length > 0) {
    await deleteCollectionsWorkflow(container).run({ input: { ids: collectionIds } });
    logger.info(`cleanup-e2e: deleted ${collectionIds.length} E2E collection(s).`);
  }

  // ── Delete E2E-tagged categories (only ones seed-e2e introduced) ────────────
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "metadata"],
  });
  const categoryIds = (categories as Array<{ id: string; metadata?: Record<string, unknown> | null }>)
    .filter((c) => c?.metadata?.e2e === "true")
    .map((c) => c.id);

  if (categoryIds.length > 0) {
    await deleteProductCategoriesWorkflow(container).run({ input: categoryIds });
    logger.info(`cleanup-e2e: deleted ${categoryIds.length} E2E category(ies).`);
  }

  // ── Delete orphaned E2E inventory items ─────────────────────────────────────
  const { data: invItems } = await query.graph({ entity: "inventory_item", fields: ["id", "sku"] });
  const e2eItemIds = (invItems as Array<{ id: string; sku?: string | null }>)
    .filter((i) => String(i.sku ?? "").startsWith("E2E-"))
    .map((i) => i.id);

  if (e2eItemIds.length > 0) {
    await inventoryModuleService
      .deleteInventoryItems(e2eItemIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((e: any) => logger.warn(`cleanup-e2e: inventory delete warning: ${e?.message}`));
    logger.info(`cleanup-e2e: deleted ${e2eItemIds.length} E2E inventory item(s).`);
  }

  logger.info("cleanup-e2e: complete.");
}
