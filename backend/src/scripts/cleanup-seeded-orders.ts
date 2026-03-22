import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const ORDER_SEED_SOURCES = [
  "aurelia_dummy_v1",
  "aurelia_demo_v2",
] as const;

export default async function cleanupSeededOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderModuleService: any = container.resolve(Modules.ORDER);

  logger.info(
    `Looking for seeded orders with sources: ${ORDER_SEED_SOURCES.join(", ")}`
  );

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "metadata"],
  });

  const seededOrders = (orders as Array<{
    id?: string | null;
    display_id?: number | null;
    metadata?: Record<string, unknown> | null;
  }>).filter((order) => {
    const seedSource = order.metadata?.seed_source;
    return typeof seedSource === "string" && ORDER_SEED_SOURCES.includes(seedSource as (typeof ORDER_SEED_SOURCES)[number]);
  });

  if (!seededOrders.length) {
    logger.info("No seeded orders found. Nothing to delete.");
    return;
  }

  const orderIds = seededOrders
    .map((order) => order.id)
    .filter((id): id is string => Boolean(id));

  await orderModuleService.deleteOrders(orderIds);

  const summaries = seededOrders
    .slice(0, 10)
    .map((order) => `#${order.display_id ?? "?"}:${order.id}`)
    .join(", ");

  logger.info(`Deleted ${orderIds.length} seeded orders.`);
  logger.info(`Sample deleted orders: ${summaries}`);
}
