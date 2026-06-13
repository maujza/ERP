/**
 * seed-e2e.ts — test-scoped catalog provisioning for the E2E suites
 *
 * Run with:
 *   cd backend && npx medusa exec src/scripts/seed-e2e.ts
 *   (or `npm run seed:e2e`)
 *
 * Unlike seed-aurelia.ts (the full demo catalog, gated by SEED_DEMO_DATA), this
 * script creates a *small, tagged* set of products that the Playwright suites
 * need to exercise the storefront and admin flows. Each product carries
 * metadata.e2e="true" and an "E2E-" SKU prefix so cleanup-e2e.ts can remove
 * exactly what was provisioned — the data exists only for the lifetime of a
 * test run (globalSetup → tests → globalTeardown).
 *
 * It reuses the infrastructure created by the main seed (sales channel, ARS
 * region, Buenos Aires stock location, shipping options, categories,
 * collections) and only adds products + inventory. It is idempotent: products
 * already present (by handle) are skipped.
 */

import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/** Products provisioned for the E2E suites. Spread across categories so the
 *  catalog category filter has options, and across collections so the
 *  backend-driven "Colecciones" surfaces render. One has multiple variants to
 *  exercise the variant/quantity selectors. */
const E2E_PRODUCTS = [
  { title: "Aros E2E Aurora", handle: "e2e-aros-aurora", category: "Aros", collection: "Novedades", price: 18900, variants: [{ title: "Única", sku: "E2E-AROS-01-U" }] },
  { title: "Collar E2E Aurora", handle: "e2e-collar-aurora", category: "Collares", collection: "Best Sellers", price: 24500, variants: [{ title: "Única", sku: "E2E-COLL-01-U" }] },
  { title: "Pulsera E2E Aurora", handle: "e2e-pulsera-aurora", category: "Pulseras", collection: "Esenciales", price: 15800, variants: [{ title: "Única", sku: "E2E-PULS-01-U" }] },
  {
    title: "Set E2E Aurora", handle: "e2e-set-aurora", category: "Sets", collection: "Fiesta", price: 67000,
    variants: [
      { title: "Mix Dorado", sku: "E2E-SET-01-DO" },
      { title: "Mix Plateado", sku: "E2E-SET-01-PL" },
    ],
  },
] as const;

const E2E_IMAGE =
  "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80";

export default async function seedE2EData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  // ── Resolve infrastructure (must already exist from the main seed) ──────────
  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });
  if (!defaultSalesChannel) {
    logger.error("Default Sales Channel not found — run the main seed before seed-e2e.");
    return;
  }

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baLocation = (locations as any[]).find((l) => l.name === "Buenos Aires") ?? locations[0];
  if (!baLocation) {
    logger.error("No stock location found — run the main seed before seed-e2e.");
    return;
  }

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  const shippingProfile = shippingProfiles[0];

  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "name"] });
  const categoryMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cats as any[]).forEach((c) => { categoryMap[c.name] = c.id; });

  const { data: cols } = await query.graph({ entity: "product_collection", fields: ["id", "title"] });
  const collectionMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cols as any[]).forEach((c) => { collectionMap[c.title] = c.id; });

  // Ensure the collections referenced by the E2E products exist. In a normal
  // deploy the main seed already created them (infra) and we reuse them; on a
  // bare DB we create them here, tagged metadata.e2e so cleanup removes only the
  // ones this script introduced. Required for the storefront "Colecciones"
  // surfaces and the catalog collection filter to have data under test.
  const neededCollections = [...new Set(E2E_PRODUCTS.map((p) => p.collection))];
  const collectionsToCreate = neededCollections.filter((title) => !collectionMap[title]);
  if (collectionsToCreate.length > 0) {
    const { result: newCollections } = await createCollectionsWorkflow(container).run({
      input: {
        collections: collectionsToCreate.map((title) => ({
          title,
          metadata: { e2e: "true" } as Record<string, string>,
        })),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newCollections as any[]).forEach((c) => { collectionMap[c.title] = c.id; });
    logger.info(`seed-e2e: created ${collectionsToCreate.length} E2E collection(s): ${collectionsToCreate.join(", ")}.`);
  }

  // ── Create the tagged E2E products (idempotent by handle) ───────────────────
  const { data: existingProducts } = await query.graph({ entity: "product", fields: ["id", "handle"] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingHandles = new Set((existingProducts as any[]).map((p) => p.handle));
  const toCreate = E2E_PRODUCTS.filter((p) => !existingHandles.has(p.handle));

  if (toCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: toCreate.map((p) => {
          const isMultiVariant = p.variants.length > 1;
          const optionKey = isMultiVariant ? "Variante" : "Modelo";
          return {
            title: p.title,
            handle: p.handle,
            description: `Producto E2E para pruebas automatizadas (${p.category}). Se elimina al finalizar la corrida.`,
            metadata: { e2e: "true", category: p.category } as Record<string, string>,
            status: ProductStatus.PUBLISHED,
            thumbnail: E2E_IMAGE,
            shipping_profile_id: shippingProfile?.id,
            category_ids: categoryMap[p.category] ? [categoryMap[p.category]] : [],
            collection_id: collectionMap[p.collection] ?? undefined,
            images: [{ url: E2E_IMAGE }],
            options: isMultiVariant
              ? [{ title: "Variante", values: p.variants.map((v) => v.title) }]
              : [{ title: "Modelo", values: ["Única"] }],
            variants: p.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: { [optionKey]: isMultiVariant ? v.title : "Única" } as Record<string, string>,
              prices: [{ amount: p.price, currency_code: "ars" }],
            })),
            sales_channels: [{ id: defaultSalesChannel.id }],
          };
        }),
      },
    });
    logger.info(`seed-e2e: created ${toCreate.length} E2E product(s).`);
  } else {
    logger.info("seed-e2e: E2E products already exist.");
  }

  // ── Inventory levels for the E2E variants at Buenos Aires ────────────────────
  const { data: invItems } = await query.graph({ entity: "inventory_item", fields: ["id", "sku"] });
  const e2eItems = (invItems as Array<{ id: string; sku?: string | null }>).filter((i) =>
    String(i.sku ?? "").startsWith("E2E-")
  );

  const levels: CreateInventoryLevelInput[] = [];
  for (const item of e2eItems) {
    const { data: existing } = await query
      .graph({
        entity: "inventory_level",
        fields: ["id"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filters: { inventory_item_id: item.id, location_id: baLocation.id } as any,
      })
      .catch(() => ({ data: [] }));
    if (!existing.length) {
      levels.push({ location_id: baLocation.id, stocked_quantity: 100, inventory_item_id: item.id });
    }
  }

  if (levels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } });
    logger.info(`seed-e2e: set inventory for ${levels.length} E2E item(s).`);
  }

  logger.info("seed-e2e: complete.");
}
