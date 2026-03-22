import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const ORDER_SEED_SOURCES = ["aurelia_dummy_v1", "aurelia_demo_v2"] as const;
const DEMO_CUSTOMER_DOMAIN = "@aurelia-demo.local";
const BULK_PRODUCT_HANDLE_PREFIX = "aurelia-dummy-";
const PROMOTION_CODES = [
  "AURELIA10",
  "SUMMER15",
  "BIENVENIDA20",
  "VIP25",
  "MAYOREO30",
  "NAVIDAD2024",
  "BLACKFRIDAY35",
  "LIQUIDACION40",
] as const;
const PRICE_LIST_TITLES = [
  "Precios VIP — Temporada 2025",
  "Precios Mayoristas 2025",
] as const;
const SALES_CHANNEL_NAMES = [
  "Mayoristas Web",
  "Instagram Shop",
  "WhatsApp Ventas",
  "Feria y Eventos",
] as const;
const CUSTOMER_GROUP_NAMES = [
  "VIP",
  "Mayoristas",
  "Retail",
  "Nuevos Clientes",
  "B2B Corporativo",
] as const;

export default async function resetDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderModuleService: any = container.resolve(Modules.ORDER);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerModuleService: any = container.resolve(Modules.CUSTOMER);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promotionModuleService: any = container.resolve(Modules.PROMOTION);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pricingModuleService: any = container.resolve(Modules.PRICING);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productModuleService: any = container.resolve(Modules.PRODUCT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesChannelModuleService: any = container.resolve(Modules.SALES_CHANNEL);

  logger.info("Resetting Aurelia demo data...");

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
  });
  const orderIds = (orders as Array<{ id?: string | null; metadata?: Record<string, unknown> | null }>)
    .filter((order) => {
      const seedSource = order.metadata?.seed_source;
      return typeof seedSource === "string" && ORDER_SEED_SOURCES.includes(seedSource as (typeof ORDER_SEED_SOURCES)[number]);
    })
    .map((order) => order.id)
    .filter((id): id is string => Boolean(id));

  if (orderIds.length) {
    await orderModuleService.deleteOrders(orderIds);
    logger.info(`Deleted ${orderIds.length} seeded orders.`);
  } else {
    logger.info("No seeded orders found.");
  }

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  });
  const customerIds = (customers as Array<{ id?: string | null; email?: string | null }>)
    .filter((customer) => String(customer.email ?? "").endsWith(DEMO_CUSTOMER_DOMAIN))
    .map((customer) => customer.id)
    .filter((id): id is string => Boolean(id));

  if (customerIds.length) {
    await customerModuleService.deleteCustomers(customerIds);
    logger.info(`Deleted ${customerIds.length} demo customers.`);
  } else {
    logger.info("No demo customers found.");
  }

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  }).catch(() => ({ data: [] }));
  const priceListIds = (priceLists as Array<{ id?: string | null; title?: string | null }>)
    .filter((priceList) => PRICE_LIST_TITLES.includes(String(priceList.title ?? "") as (typeof PRICE_LIST_TITLES)[number]))
    .map((priceList) => priceList.id)
    .filter((id): id is string => Boolean(id));

  if (priceListIds.length) {
    await pricingModuleService.deletePriceLists(priceListIds);
    logger.info(`Deleted ${priceListIds.length} demo price lists.`);
  } else {
    logger.info("No demo price lists found.");
  }

  const existingPromotions = await promotionModuleService
    .listPromotions({ code: [...PROMOTION_CODES] })
    .catch(() => []);
  const promotionIds = (existingPromotions as Array<{ id?: string | null }>)
    .map((promotion) => promotion.id)
    .filter((id): id is string => Boolean(id));

  if (promotionIds.length) {
    await promotionModuleService.deletePromotions(promotionIds);
    logger.info(`Deleted ${promotionIds.length} demo promotions.`);
  } else {
    logger.info("No demo promotions found.");
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const bulkProductIds = (products as Array<{ id?: string | null; handle?: string | null }>)
    .filter((product) => String(product.handle ?? "").startsWith(BULK_PRODUCT_HANDLE_PREFIX))
    .map((product) => product.id)
    .filter((id): id is string => Boolean(id));

  if (bulkProductIds.length) {
    await productModuleService.deleteProducts(bulkProductIds);
    logger.info(`Deleted ${bulkProductIds.length} bulk demo products.`);
  } else {
    logger.info("No bulk demo products found.");
  }

  const existingSalesChannels = await salesChannelModuleService.listSalesChannels({});
  const demoSalesChannelIds = (existingSalesChannels as Array<{ id?: string | null; name?: string | null }>)
    .filter((channel) => SALES_CHANNEL_NAMES.includes(String(channel.name ?? "") as (typeof SALES_CHANNEL_NAMES)[number]))
    .map((channel) => channel.id)
    .filter((id): id is string => Boolean(id));

  if (demoSalesChannelIds.length) {
    await salesChannelModuleService.deleteSalesChannels(demoSalesChannelIds);
    logger.info(`Deleted ${demoSalesChannelIds.length} demo sales channels.`);
  } else {
    logger.info("No demo sales channels found.");
  }

  const existingGroups = await customerModuleService.listCustomerGroups({});
  const customerGroupIds = (existingGroups as Array<{ id?: string | null; name?: string | null }>)
    .filter((group) => CUSTOMER_GROUP_NAMES.includes(String(group.name ?? "") as (typeof CUSTOMER_GROUP_NAMES)[number]))
    .map((group) => group.id)
    .filter((id): id is string => Boolean(id));

  if (customerGroupIds.length) {
    await customerModuleService.deleteCustomerGroups(customerGroupIds);
    logger.info(`Deleted ${customerGroupIds.length} demo customer groups.`);
  } else {
    logger.info("No demo customer groups found.");
  }

  logger.info("Demo data reset complete.");
}
