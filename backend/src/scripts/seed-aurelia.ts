/**
 * Aurelia Jewelry — Argentina seed script
 *
 * Run with:
 *   cd backend && npx medusa exec src/scripts/seed-aurelia.ts
 *
 * Creates:
 *   • Argentina region (ARS)
 *   • Buenos Aires stock location + shipping options
 *   • Jewelry product categories (Aros, Collares, Pulseras, Sets, Kits)
 *   • 10 Aurelia jewelry products with ARS pricing and metadata
 *   • AURELIA10 promotion (10 % off whole order)
 *
 * After running, update .env.local with the logged Argentina Region ID.
 */

import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createCustomersWorkflow,
  createInventoryLevelsWorkflow,
  createOrderPaymentCollectionWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  markPaymentCollectionAsPaid,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedAureliaData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderModuleService: any = container.resolve(Modules.ORDER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promotionService: any = container.resolve(Modules.PROMOTION);
  const storeModuleService = container.resolve(Modules.STORE);

  // ── 1. Sales Channel ────────────────────────────────────────────────────────
  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });
  if (!defaultSalesChannel) {
    logger.error("Default Sales Channel not found. Run the main seed script first.");
    return;
  }

  // ── 1b. Add ARS to store's supported currencies ──────────────────────────────
  logger.info("Adding ARS to store supported currencies...");
  const [store] = await storeModuleService.listStores();
  // Fetch currencies via query to get full data (listStores doesn't load relations)
  const { data: storeData } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.*"],
    filters: { id: store.id },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingCurrencies: { currency_code: string; is_default: boolean }[] = (storeData[0] as any)?.supported_currencies ?? [];
  const hasArs = existingCurrencies.some((c) => c.currency_code === "ars");
  if (!hasArs) {
    // Keep existing currencies; on fresh install default to ARS only
    const currencyList = existingCurrencies.length > 0
      ? [...existingCurrencies.map((c) => ({ currency_code: c.currency_code, is_default: c.is_default })), { currency_code: "ars", is_default: false }]
      : [{ currency_code: "ars", is_default: true }];
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { supported_currencies: currencyList },
      },
    });
    logger.info("Added ARS to store supported currencies.");
  } else {
    logger.info("ARS already in store supported currencies.");
  }

  // ── 2. Argentina Region (ARS) ────────────────────────────────────────────────
  logger.info("Seeding Argentina region (ARS)...");
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const argRegionExisting = existingRegions.find((r: any) => r.currency_code === "ars");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let argentinaRegion: { id: string } = argRegionExisting as any;

  if (!argRegionExisting) {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Argentina",
            currency_code: "ars",
            countries: ["ar"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    argentinaRegion = regionResult[0];
    logger.info(`Created Argentina region: ${argentinaRegion.id}`);
  } else {
    logger.info(`Argentina region already exists: ${argentinaRegion.id}`);
  }

  // Tax region for Argentina
  await createTaxRegionsWorkflow(container)
    .run({ input: [{ country_code: "ar", provider_id: "tp_system" }] })
    .catch(() => {}); // ignore if already exists

  // ── 3. Buenos Aires Stock Location ────────────────────────────────────────────
  logger.info("Seeding Buenos Aires stock location...");
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baExisting = existingLocations.find((l: any) => l.name === "Buenos Aires");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baLocation: { id: string } = baExisting as any;

  if (!baExisting) {
    const { result: locationResult } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Buenos Aires",
            address: { city: "Buenos Aires", country_code: "AR", address_1: "CABA" },
          },
        ],
      },
    });
    baLocation = locationResult[0];

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: baLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: baLocation.id, add: [defaultSalesChannel.id] },
    });
    logger.info(`Created Buenos Aires stock location: ${baLocation.id}`);
  } else {
    logger.info(`Buenos Aires stock location already exists: ${baLocation.id}`);
  }

  // ── 4. Argentina Shipping Options ─────────────────────────────────────────────
  logger.info("Seeding Argentina shipping options...");
  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    name: "Argentina delivery",
  });

  if (!existingFulfillmentSets.length) {
    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
    let shippingProfile = shippingProfiles[0] ?? null;

    if (!shippingProfile) {
      const { result } = await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
      });
      shippingProfile = result[0];
    }

    const argFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Argentina delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Argentina",
          geo_zones: [{ country_code: "ar", type: "country" }],
        },
      ],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: baLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: argFulfillmentSet.id },
    });

    const serviceZoneId = argFulfillmentSet.service_zones[0].id;

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Correo Argentino (3-5 días hábiles)",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Estándar", description: "Envío en 3-5 días hábiles.", code: "standard_ar" },
          prices: [
            { currency_code: "ars", amount: 3900 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "OCA Express (24-48h)",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Express", description: "Envío en 24-48 horas.", code: "express_ar" },
          prices: [
            { currency_code: "ars", amount: 7200 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Retiro en showroom CABA",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Retiro", description: "Retiro en nuestro showroom (sin costo).", code: "pickup_ar" },
          prices: [
            { currency_code: "ars", amount: 0 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info("Created Argentina shipping options (Correo Argentino, OCA Express, Retiro showroom).");
  } else {
    logger.info("Argentina shipping options already exist.");
  }

  // ── 5. Product Categories ─────────────────────────────────────────────────────
  logger.info("Seeding Aurelia product categories...");
  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingCatNames = new Set(existingCats.map((c: any) => c.name));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingCats.forEach((c: any) => { categoryMap[c.name] = c.id; });

  const jewelryCategories = ["Aros", "Collares", "Pulseras", "Sets", "Kits"];
  const categoriesToCreate = jewelryCategories.filter((name) => !existingCatNames.has(name));

  if (categoriesToCreate.length > 0) {
    const { result: newCats } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate.map((name) => ({ name, is_active: true })),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newCats.forEach((c: any) => { categoryMap[c.name] = c.id; });
    logger.info(`Created categories: ${categoriesToCreate.join(", ")}`);
  } else {
    logger.info("Jewelry categories already exist.");
  }

  // ── 5b. Product Collections ───────────────────────────────────────────────────
  // Collections are the merchandising surface that drives the storefront's
  // "Colecciones" section, header nav, and catalog filters. They are created as
  // always-on infrastructure (like categories) so those surfaces are
  // backend-driven and non-empty even with an empty product catalog. Staff
  // assign products to a collection in the Admin UI; the storefront reflects it.
  logger.info("Seeding Aurelia product collections...");
  const collectionTitles = ["Novedades", "Best Sellers", "Esenciales", "Fiesta", "Kits"];
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  });
  const collectionMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingCollections.forEach((c: any) => { collectionMap[c.title] = c.id; });

  const collectionsToCreate = collectionTitles.filter((title) => !collectionMap[title]);
  if (collectionsToCreate.length > 0) {
    const { result: newCollections } = await createCollectionsWorkflow(container).run({
      input: {
        collections: collectionsToCreate.map((title) => ({ title })),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newCollections.forEach((c: any) => { collectionMap[c.title] = c.id; });
    logger.info(`Created collections: ${collectionsToCreate.join(", ")}`);
  } else {
    logger.info("Aurelia collections already exist.");
  }

  // Demo catalog (products, inventory, promotions, customers, orders) is gated
  // behind SEED_DEMO_DATA. Everything above (sales channel, ARS currency,
  // Argentina region, tax, Buenos Aires stock location, shipping options,
  // categories, collections) is always created so the stack is fully usable with
  // an empty catalog. Set SEED_DEMO_DATA=true to seed the demo data.
  if (process.env.SEED_DEMO_DATA !== "true") {
    logger.info(
      "SEED_DEMO_DATA is not 'true' — skipping Aurelia demo catalog (products, inventory, promotions, customers, orders). Infrastructure is ready."
    );
    return;
  }

  // ── 6. Jewelry Products ───────────────────────────────────────────────────────
  logger.info("Seeding Aurelia jewelry products...");
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle));

  // Reuse the existing default shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  const shippingProfile = shippingProfiles[0];

  type AureliaProduct = {
    title: string;
    handle: string;
    description: string;
    metadata: { category: string; subcategory: string; brand: string };
    categoryName: string;
    price: number;
    images: string[];
    variants: { title: string; sku: string }[];
  };

  const aureliaProducts: AureliaProduct[] = [
    {
      title: "Aros Siena Dorado",
      handle: "aros-siena-dorado",
      description:
        "Aros tono dorado con detalle central texturizado. Livianos y de larga duración. Cierre tipo gancho. Incluyen caja Aurelia.",
      metadata: { category: "Aros", subcategory: "Novedades", brand: "Aurelia Core" },
      categoryName: "Aros",
      price: 18900,
      images: [
        "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "ARS-SIE-01-U" }],
    },
    {
      title: "Aros Argolla Fina Plateada",
      handle: "aros-argolla-fina-plateada",
      description:
        "Argollas finas tono plateado. Clásicas, versátiles y de uso diario. Disponibles en tres tamaños para distintos estilos.",
      metadata: { category: "Aros", subcategory: "Esenciales", brand: "Aurelia Core" },
      categoryName: "Aros",
      price: 12500,
      images: [
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [
        { title: "S - Chica (20 mm)", sku: "ARS-ARG-01-S" },
        { title: "M - Mediana (30 mm)", sku: "ARS-ARG-01-M" },
        { title: "L - Grande (40 mm)", sku: "ARS-ARG-01-L" },
      ],
    },
    {
      title: "Aros Perla Baroque",
      handle: "aros-perla-baroque",
      description:
        "Aros con perlas de agua dulce estilo baroque. Irregulares y únicas, ideales para look de fiesta o evento especial.",
      metadata: { category: "Aros", subcategory: "Fiesta", brand: "Lumiere" },
      categoryName: "Aros",
      price: 28000,
      images: [
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "ARS-PER-01-U" }],
    },
    {
      title: "Collar Luna Minimalista",
      handle: "collar-luna-minimalista",
      description:
        "Collar delicado con dije luna en baño dorado 18k. Cadena ajustable de 40 a 45 cm. Ideal para regalo o reventa individual.",
      metadata: { category: "Collares", subcategory: "Best Sellers", brand: "Lumiere" },
      categoryName: "Collares",
      price: 24500,
      images: [
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "COL-LUN-01-U" }],
    },
    {
      title: "Collar Capas Boho",
      handle: "collar-capas-boho",
      description:
        "Collar de múltiples capas con detalles de piedras semi-preciosas y metales mixtos. Tendencia boho para primavera-verano.",
      metadata: { category: "Collares", subcategory: "Novedades", brand: "Aurelia Studio" },
      categoryName: "Collares",
      price: 32000,
      images: [
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "COL-CAP-01-U" }],
    },
    {
      title: "Pulsera Boreal",
      handle: "pulsera-boreal",
      description:
        "Pulsera artesanal con hilos naturales y dije metálico. Ajustable para cualquier muñeca. Colores neutros, fácil combinación.",
      metadata: { category: "Pulseras", subcategory: "Esenciales", brand: "Boreal" },
      categoryName: "Pulseras",
      price: 15800,
      images: [
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "PUL-BOR-01-U" }],
    },
    {
      title: "Pulsera Eslabón Dorada",
      handle: "pulsera-eslabon-dorada",
      description:
        "Pulsera de eslabones en baño dorado 18k. Resistente al agua y de uso diario. Best seller sostenido temporada tras temporada.",
      metadata: { category: "Pulseras", subcategory: "Best Sellers", brand: "Lumiere" },
      categoryName: "Pulseras",
      price: 19500,
      images: [
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "PUL-ESL-01-U" }],
    },
    {
      title: "Set Vitrina Mix x5",
      handle: "set-vitrina-mix-x5",
      description:
        "Set de 5 piezas combinables: 2 pares de aros, 1 collar, 1 pulsera y 1 anillo. Presentación premium en caja para vitrina.",
      metadata: { category: "Sets", subcategory: "Best Sellers", brand: "Aurelia Studio" },
      categoryName: "Sets",
      price: 89000,
      images: [
        "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [
        { title: "Mix Dorado", sku: "SET-VIT-01-DO" },
        { title: "Mix Plateado", sku: "SET-VIT-01-PL" },
      ],
    },
    {
      title: "Set Colección Perlas",
      handle: "set-coleccion-perlas",
      description:
        "Set con aros, collar y pulsera de perlas cultivadas. Presentación en estuche premium. Ideal para regalo corporativo o reventa de alta gama.",
      metadata: { category: "Sets", subcategory: "Novedades", brand: "Lumiere" },
      categoryName: "Sets",
      price: 67000,
      images: [
        "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [{ title: "Única", sku: "SET-PER-01-U" }],
    },
    {
      title: "Kit Showroom Básico x8",
      handle: "kit-showroom-basico-x8",
      description:
        "Kit de 8 piezas variadas para armar o renovar vitrina. Mix de aros, collares y pulseras seleccionados por el equipo Aurelia. Dos versiones tonales.",
      metadata: { category: "Kits", subcategory: "Fiesta", brand: "Aurelia Pro" },
      categoryName: "Kits",
      price: 125000,
      images: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
      ],
      variants: [
        { title: "Kit A - Tonos dorados", sku: "KIT-SHW-01-A" },
        { title: "Kit B - Tonos plateados", sku: "KIT-SHW-01-B" },
      ],
    },
  ];

  const productsToCreate = aureliaProducts.filter((p) => !existingHandles.has(p.handle));

  if (productsToCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((p) => {
          const isMultiVariant = p.variants.length > 1;
          const optionKey = isMultiVariant ? "Variante" : "Modelo";
          return {
            title: p.title,
            handle: p.handle,
            description: p.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: p.metadata as any,
            status: ProductStatus.PUBLISHED,
            thumbnail: p.images[0],
            shipping_profile_id: shippingProfile?.id,
            category_ids: categoryMap[p.categoryName] ? [categoryMap[p.categoryName]] : [],
            collection_id: collectionMap[p.metadata.subcategory] ?? undefined,
            images: p.images.map((url) => ({ url })),
            options: isMultiVariant ? [{ title: "Variante", values: p.variants.map((v) => v.title) }] : [{ title: "Modelo", values: ["Única"] }],
            variants: p.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: { [optionKey]: isMultiVariant ? v.title : "Única" } as Record<string, string>,
              prices: [
                { amount: p.price, currency_code: "ars" },
              ],
            })),
            sales_channels: [{ id: defaultSalesChannel.id }],
          };
        }),
      },
    });
    logger.info(`Created ${productsToCreate.length} Aurelia jewelry products.`);
  } else {
    logger.info("Aurelia jewelry products already exist.");
  }

  // ── 6b. Bulk Dummy Products (storefront depth) ─────────────────────────────
  const BULK_PRODUCT_TARGET = 120;
  const bulkHandlePrefix = "aurelia-dummy-";
  logger.info("Ensuring bulk dummy catalog for storefront exploration...");

  const { data: productsAfterSeed } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const { data: inventoryItemsAfterSeed } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productHandlesAfterSeed = new Set(productsAfterSeed.map((p: any) => p.handle));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingBulkCount = productsAfterSeed.filter((p: any) => String(p.handle || "").startsWith(bulkHandlePrefix)).length;
  const existingBulkSkuMax = (inventoryItemsAfterSeed as Array<{ sku?: string | null }>)
    .reduce((max, item) => {
      const match = String(item.sku ?? "").match(/^DUM-(\d+)-/);
      if (!match) {
        return max;
      }

      return Math.max(max, Number.parseInt(match[1], 10));
    }, 0);
  const missingBulkCount = Math.max(BULK_PRODUCT_TARGET - existingBulkCount, 0);

  if (missingBulkCount > 0) {
    const categoryCycle = ["Aros", "Collares", "Pulseras", "Sets", "Kits"];
    const subcategoryCycle = ["Novedades", "Best Sellers", "Esenciales", "Fiesta"];
    const brandCycle = ["Aurelia Core", "Aurelia Studio", "Lumiere", "Boreal", "Aurelia Pro"];

    const productsToGenerate: AureliaProduct[] = [];
    let candidateIndex = Math.max(existingBulkCount, existingBulkSkuMax) + 1;
    while (productsToGenerate.length < missingBulkCount) {
      const index = candidateIndex;
      const categoryName = categoryCycle[index % categoryCycle.length];
      const basePrice = 11500 + ((index * 1700) % 89000);
      const handle = `${bulkHandlePrefix}${String(index).padStart(3, "0")}`;
      candidateIndex += 1;

      if (productHandlesAfterSeed.has(handle)) {
        continue;
      }

      productsToGenerate.push({
        title: `Aurelia ${categoryName} Demo ${String(index).padStart(3, "0")}`,
        handle,
        description:
          "Producto demo generado para pruebas visuales de dashboard/storefront, navegación por catálogo y simulación de compra.",
        metadata: {
          category: categoryName,
          subcategory: subcategoryCycle[index % subcategoryCycle.length],
          brand: brandCycle[index % brandCycle.length],
        },
        categoryName,
        price: basePrice,
        images: [
          "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80",
        ],
        variants: index % 3 === 0
          ? [
              { title: "S", sku: `DUM-${String(index).padStart(3, "0")}-S` },
              { title: "M", sku: `DUM-${String(index).padStart(3, "0")}-M` },
              { title: "L", sku: `DUM-${String(index).padStart(3, "0")}-L` },
            ]
          : [{ title: "Única", sku: `DUM-${String(index).padStart(3, "0")}-U` }],
      });
    }

    const chunkSize = 25;
    for (let i = 0; i < productsToGenerate.length; i += chunkSize) {
      const chunk = productsToGenerate.slice(i, i + chunkSize);
      await createProductsWorkflow(container).run({
        input: {
          products: chunk.map((p) => {
            const isMultiVariant = p.variants.length > 1;
            const optionKey = isMultiVariant ? "Talle" : "Modelo";
            return {
              title: p.title,
              handle: p.handle,
              description: p.description,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              metadata: p.metadata as any,
              status: ProductStatus.PUBLISHED,
              thumbnail: p.images[0],
              shipping_profile_id: shippingProfile?.id,
              category_ids: categoryMap[p.categoryName] ? [categoryMap[p.categoryName]] : [],
              collection_id: collectionMap[p.metadata.subcategory] ?? undefined,
              images: p.images.map((url) => ({ url })),
              options: isMultiVariant
                ? [{ title: "Talle", values: p.variants.map((v) => v.title) }]
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
      logger.info(`Created ${chunk.length} bulk dummy products (${i + chunk.length}/${productsToGenerate.length}).`);
    }
  } else {
    logger.info(`Bulk dummy products already satisfy target (${existingBulkCount}/${BULK_PRODUCT_TARGET}).`);
  }

  // ── 7. Inventory Levels ────────────────────────────────────────────────────────
  logger.info("Setting inventory levels for Buenos Aires...");
  const { data: allInventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const item of allInventoryItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await query.graph({
      entity: "inventory_level",
      fields: ["id"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: { inventory_item_id: item.id, location_id: baLocation.id } as any,
    }).catch(() => ({ data: [] }));

    if (!existing.length) {
      inventoryLevels.push({
        location_id: baLocation.id,
        stocked_quantity: 500,
        inventory_item_id: item.id,
      });
    }
  }

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
    logger.info(`Set inventory for ${inventoryLevels.length} item(s) at Buenos Aires.`);
  } else {
    logger.info("Inventory levels already set.");
  }

  // ── 8. Promotions ──────────────────────────────────────────────────────────────
  logger.info("Seeding promotions...");
  const promos = [
    { code: "AURELIA10", value: 10 },
    { code: "SUMMER15", value: 15 },
  ] as const

  for (const promo of promos) {
    const existingPromos = await promotionService
      .listPromotions({ code: [promo.code] })
      .catch(() => []);

    if (!existingPromos.length) {
      await promotionService.createPromotions([
        {
          code: promo.code,
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            value: promo.value,
            allocation: "across",
            apply_to_quantity: 1,
          },
        },
      ]);
      logger.info(`Created ${promo.code} promotion — ${promo.value} % descuento en toda la orden.`);
    } else {
      const existingPromo = existingPromos[0]
      if (existingPromo?.status !== "active") {
        await promotionService.updatePromotions({
          id: existingPromo.id,
          status: "active",
        })
        logger.info(`${promo.code} promotion activated.`);
      } else {
        logger.info(`${promo.code} promotion already exists.`);
      }
    }
  }

  // ── 9. Dummy Customers ───────────────────────────────────────────────────────
  const CUSTOMER_TARGET = 180;
  const customerDomain = "aurelia-demo.local";
  logger.info("Ensuring dummy customers...");

  const { data: existingCustomers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingDemoCustomers = existingCustomers.filter((c: any) =>
    String(c.email || "").endsWith(`@${customerDomain}`)
  );
  const customersMissing = Math.max(CUSTOMER_TARGET - existingDemoCustomers.length, 0);

  if (customersMissing > 0) {
    const firstNames = ["Sofía", "Martina", "Valentina", "Camila", "Lucía", "Juana", "Pilar", "Lola", "Emma", "Alma"];
    const lastNames = ["García", "Rodríguez", "Fernández", "López", "Gómez", "Pérez", "Díaz", "Romero", "Torres", "Ruiz"];

    const customersData: Array<{
      email: string;
      first_name: string;
      last_name: string;
    }> = [];
    for (let i = 0; i < customersMissing; i += 1) {
      const idx = existingDemoCustomers.length + i + 1;
      const first = firstNames[idx % firstNames.length];
      const last = lastNames[idx % lastNames.length];

      customersData.push({
        email: `cliente+${String(idx).padStart(4, "0")}@${customerDomain}`,
        first_name: first,
        last_name: last,
      });
    }

    const chunkSize = 50;
    for (let i = 0; i < customersData.length; i += chunkSize) {
      const chunk = customersData.slice(i, i + chunkSize);
      await createCustomersWorkflow(container).run({
        input: {
          customersData: chunk,
        },
      });
      logger.info(`Created ${chunk.length} demo customers (${i + chunk.length}/${customersData.length}).`);
    }
  } else {
    logger.info(`Demo customers already satisfy target (${existingDemoCustomers.length}/${CUSTOMER_TARGET}).`);
  }

  // ── 10. Dummy Orders (dashboard depth) ──────────────────────────────────────
  const ORDER_TARGET = 120;
  const orderSeedSource = "aurelia_dummy_v1";
  logger.info("Ensuring dummy orders for dashboard analytics...");

  // Build email → customer_id map for linking orders to customers
  const { data: allCustomersForOrders } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerIdByEmail = new Map<string, string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allCustomersForOrders as any[])
      .filter((c) => c.email)
      .map((c) => [String(c.email).toLowerCase(), String(c.id)])
  );

  const { data: existingOrders } = await query.graph({
    entity: "order",
    fields: ["id", "email", "metadata"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSeededOrders = existingOrders.filter((o: any) =>
    o?.metadata?.seed_source === orderSeedSource
  );
  const ordersMissing = Math.max(ORDER_TARGET - existingSeededOrders.length, 0);

  if (ordersMissing > 0) {
    const catalogHandles = new Set(aureliaProducts.map((product) => product.handle));
    const priceByHandle = new Map(
      aureliaProducts.map((product) => [product.handle, product.price])
    );
    const { data: catalogVariants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "title",
        "sku",
        "product.id",
        "product.title",
        "product.handle",
      ],
    });

    const productPool = (catalogVariants as Array<{
      id: string;
      title?: string | null;
      sku?: string | null;
      product?: {
        id?: string | null;
        title?: string | null;
        handle?: string | null;
      } | null;
    }>)
      .filter((variant) => {
        const handle = variant.product?.handle;
        return !!handle && catalogHandles.has(handle);
      })
      .map((variant) => {
        const handle = String(variant.product?.handle);
        const productTitle = String(variant.product?.title ?? "Aurelia Demo Product");
        const variantTitle = String(variant.title ?? "");
        const normalizedVariantTitle = variantTitle.trim().toLowerCase();
        const lineTitle =
          !variantTitle ||
          normalizedVariantTitle === "única" ||
          normalizedVariantTitle === "unica"
            ? productTitle
            : `${productTitle} - ${variantTitle}`;

        return {
          variant_id: variant.id,
          variant_title: variantTitle || null,
          variant_sku: variant.sku ?? null,
          product_id: String(variant.product?.id ?? ""),
          product_title: productTitle,
          product_handle: handle,
          title: lineTitle,
          price: priceByHandle.get(handle) ?? 15000,
        };
      })
      .filter((variant) => variant.product_id);

    if (!productPool.length) {
      logger.warn("No linked catalog variants found for dummy orders. Skipping order creation.");
    } else {
      const getRandomInt = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      for (let i = 0; i < ordersMissing; i += 1) {
        const orderIndex = existingSeededOrders.length + i + 1;
        const email = `cliente+${String((orderIndex % CUSTOMER_TARGET) + 1).padStart(4, "0")}@${customerDomain}`;
        const customerId = customerIdByEmail.get(email.toLowerCase());
        const itemCount = getRandomInt(1, 4);

        const items = Array.from({ length: itemCount }).map((_, itemIdx) => {
          const product = productPool[(orderIndex + itemIdx) % productPool.length];
          const quantity = getRandomInt(1, 3);
          const priceJitter = getRandomInt(-1200, 2400);
          const unitPrice = Math.max(7900, product.price + priceJitter);

          return {
            variant_id: product.variant_id,
            product_id: product.product_id,
            product_title: product.product_title,
            product_handle: product.product_handle,
            title: product.title,
            variant_title: product.variant_title,
            variant_sku: product.variant_sku,
            quantity,
            unit_price: unitPrice,
            requires_shipping: true,
            is_discountable: true,
          };
        });

        const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        const shippingAmount = [0, 3900, 7200][orderIndex % 3];
        const orderTotal = itemsTotal + shippingAmount;
        const isPaid = orderIndex % 5 !== 0;
        const isCompleted = orderIndex % 4 === 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createdOrder = await orderModuleService.createOrders({
          region_id: argentinaRegion.id,
          sales_channel_id: defaultSalesChannel.id,
          status: isCompleted ? "completed" : "pending",
          email,
          ...(customerId && { customer_id: customerId }),
          currency_code: "ars",
          shipping_address: {
            first_name: "Aurelia",
            last_name: "Demo",
            address_1: "Av. Santa Fe 1234",
            city: "Buenos Aires",
            country_code: "ar",
            province: "caba",
            postal_code: "C1000",
          },
          billing_address: {
            first_name: "Aurelia",
            last_name: "Demo",
            address_1: "Av. Santa Fe 1234",
            city: "Buenos Aires",
            country_code: "ar",
            province: "caba",
            postal_code: "C1000",
          },
          items,
          shipping_methods: [
            {
              name: shippingAmount === 0 ? "Retiro showroom" : shippingAmount === 3900 ? "Correo Argentino" : "OCA Express",
              amount: shippingAmount,
            },
          ],
          metadata: {
            seed_source: orderSeedSource,
            seed_index: orderIndex,
          },
        } as any);

        // Create a proper payment collection so the Admin UI can capture/mark-as-paid
        if (isPaid && createdOrder?.id) {
          try {
            const { result: payColResult } = await createOrderPaymentCollectionWorkflow(container).run({
              input: { order_id: createdOrder.id, amount: orderTotal },
            });
            const payCol = Array.isArray(payColResult) ? payColResult[0] : payColResult;
            await markPaymentCollectionAsPaid(container).run({
              input: { order_id: createdOrder.id, payment_collection_id: payCol.id },
            });
          } catch (e: unknown) {
            logger.warn(`  ! Payment collection for order ${createdOrder.id} failed: ${(e as Error).message}`);
          }
        }

        if ((i + 1) % 25 === 0 || i === ordersMissing - 1) {
          logger.info(`Created ${i + 1}/${ordersMissing} dummy orders.`);
        }
      }
    }
  } else {
    logger.info(`Dummy orders already satisfy target (${existingSeededOrders.length}/${ORDER_TARGET}).`);
  }

  // ── Ensure the initial admin user has the "admin" role ───────────────────────
  // npx medusa user creates the user with no metadata.role, which causes 403 on
  // all RBAC-protected routes. Find the user by MEDUSA_ADMIN_EMAIL and set role.
  const adminEmail = process.env.MEDUSA_ADMIN_EMAIL || "admin@aurelia.com"
  try {
    const userModule: any = container.resolve(Modules.USER)
    const [adminUser] = await userModule.listUsers({ email: adminEmail })
    if (adminUser) {
      if (adminUser.metadata?.role !== "admin") {
        await userModule.updateUsers([{ id: adminUser.id, metadata: { role: "admin" } }])
        logger.info(`Set metadata.role=admin on ${adminEmail}`)
      } else {
        logger.info(`${adminEmail} already has role=admin`)
      }
    } else {
      logger.warn(`Admin user ${adminEmail} not found — skipping role assignment`)
    }
  } catch (err: any) {
    logger.warn(`Could not set admin role: ${err?.message}`)
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  logger.info("═".repeat(60));
  logger.info("Aurelia seed complete! ✓");
  logger.info("");
  logger.info(`Argentina Region ID: ${argentinaRegion.id}`);
  logger.info("");
  logger.info("Next step — update your .env.local:");
  logger.info(`  NEXT_PUBLIC_MEDUSA_REGION_ID=${argentinaRegion.id}`);
  logger.info("");
  logger.info("Then restart the Next.js dev server.");
  logger.info("═".repeat(60));
}
