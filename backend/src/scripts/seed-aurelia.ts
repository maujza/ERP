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
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedAureliaData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
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
    // Keep existing currencies; ensure there's always a default (EUR from original seed)
    const currencyList = existingCurrencies.length > 0
      ? [...existingCurrencies.map((c) => ({ currency_code: c.currency_code, is_default: c.is_default })), { currency_code: "ars", is_default: false }]
      : [{ currency_code: "eur", is_default: true }, { currency_code: "usd", is_default: false }, { currency_code: "ars", is_default: false }];
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
        "https://images.unsplash.com/photo-1601821765780-754fa98637be?auto=format&fit=crop&w=600&q=80",
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
        "https://images.unsplash.com/photo-1573408301185-9519f94815d6?auto=format&fit=crop&w=600&q=80",
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
        "https://images.unsplash.com/photo-1574552875619-64b98f26edce?auto=format&fit=crop&w=600&q=80",
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
        "https://images.unsplash.com/photo-1561661882-a8e58a9cc5a7?auto=format&fit=crop&w=600&q=80",
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
          return {
            title: p.title,
            handle: p.handle,
            description: p.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: p.metadata as any,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile?.id,
            category_ids: categoryMap[p.categoryName] ? [categoryMap[p.categoryName]] : [],
            images: p.images.map((url) => ({ url })),
            options: isMultiVariant ? [{ title: "Variante", values: p.variants.map((v) => v.title) }] : [{ title: "Modelo", values: ["Única"] }],
            variants: p.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: isMultiVariant ? { Variante: v.title } : { Modelo: "Única" },
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

  // ── 8. AURELIA10 Promotion (10 % off entire order) ────────────────────────────
  logger.info("Seeding AURELIA10 promotion...");
  const existingPromos = await promotionService
    .listPromotions({ code: ["AURELIA10"] })
    .catch(() => []);

  if (!existingPromos.length) {
    await promotionService.createPromotions([
      {
        code: "AURELIA10",
        type: "standard",
        is_automatic: false,
        application_method: {
          type: "percentage",
          target_type: "order",
          value: 10,
          allocation: "across",
          apply_to_quantity: 1,
        },
      },
    ]);
    logger.info("Created AURELIA10 promotion — 10 % descuento en toda la orden.");
  } else {
    logger.info("AURELIA10 promotion already exists.");
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
