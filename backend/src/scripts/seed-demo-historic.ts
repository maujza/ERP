/**
 * Aurelia Jewelry — Historic Demo Data Seed
 *
 * Simulates 90 days of real business activity:
 *   • 4 additional sales channels (Mayoristas, Instagram, WhatsApp, Feria)
 *   • 5 customer groups (VIP, Mayoristas, Retail, Nuevos, B2B)
 *   • Customer group assignments (120 customers distributed)
 *   • 2 price lists with discounted variant prices
 *   • 6 marketing promotions/campaigns
 *   • 400 orders distributed over 90 days with varied statuses
 *     - completed (paid + fulfilled)
 *     - pending (awaiting payment)
 *     - paid but not fulfilled
 *     - cancelled
 *     - requires_action
 *
 * Run with:
 *   cd backend && npx medusa exec src/scripts/seed-demo-historic.ts
 *
 * Prerequisites: seed-aurelia.ts must have been run first.
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createPriceListsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seedDemoHistoricData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesChannelModuleService: any = container.resolve(Modules.SALES_CHANNEL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerModuleService: any = container.resolve(Modules.CUSTOMER)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promotionService: any = container.resolve(Modules.PROMOTION)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderModuleService: any = container.resolve(Modules.ORDER)

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const rnd = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

  const hoursAgoDate = (daysAgo: number): Date => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(rnd(8, 20), rnd(0, 59), rnd(0, 59), 0)
    return d
  }

  // ── Guard: requires prior seed ────────────────────────────────────────────────
  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!defaultSalesChannel) {
    logger.error("Default Sales Channel not found. Run seed-aurelia.ts first.")
    return
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const argentinaRegion: any = regions.find((r: any) => r.currency_code === "ars")
  if (!argentinaRegion) {
    logger.error("Argentina region not found. Run seed-aurelia.ts first.")
    return
  }

  // ── 1. Additional sales channels ─────────────────────────────────────────────
  logger.info("━━ Step 1: Sales channels")
  const channelDefs = [
    { name: "Mayoristas Web", description: "Canal exclusivo para compradores mayoristas" },
    { name: "Instagram Shop", description: "Ventas directas vía Instagram Shopping" },
    { name: "WhatsApp Ventas", description: "Atención y ventas por WhatsApp Business" },
    { name: "Feria y Eventos", description: "Ventas en ferias de diseño y eventos presenciales" },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesChannels: Record<string, any> = { "Default Sales Channel": defaultSalesChannel }

  for (const ch of channelDefs) {
    const [existing] = await salesChannelModuleService.listSalesChannels({ name: ch.name })
    if (existing) {
      salesChannels[ch.name] = existing
      logger.info(`  ✓ ${ch.name} (already exists)`)
    } else {
      const [created] = await salesChannelModuleService.createSalesChannels([{
        name: ch.name,
        description: ch.description,
        is_disabled: false,
      }])
      salesChannels[ch.name] = created
      logger.info(`  + Created: ${ch.name}`)
    }
  }

  // ── 2. Customer groups ────────────────────────────────────────────────────────
  logger.info("━━ Step 2: Customer groups")
  const groupDefs = [
    { name: "VIP", description: "Clientes premium, historial de compras elevado" },
    { name: "Mayoristas", description: "Compradores al por mayor — requieren factura" },
    { name: "Retail", description: "Clientes minoristas habituales" },
    { name: "Nuevos Clientes", description: "Registrados en los últimos 30 días" },
    { name: "B2B Corporativo", description: "Empresas y revendedoras corporativas" },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: Record<string, any> = {}
  const existingGroups = await customerModuleService.listCustomerGroups({})

  for (const gd of groupDefs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = existingGroups.find((g: any) => g.name === gd.name)
    if (existing) {
      groups[gd.name] = existing
      logger.info(`  ✓ ${gd.name} (already exists)`)
    } else {
      // createCustomerGroups returns an array when given array input
      const created = await customerModuleService.createCustomerGroups({
        name: gd.name,
        metadata: { description: gd.description },
      })
      groups[gd.name] = created
      logger.info(`  + Created group: ${gd.name}`)
    }
  }

  // ── 3. Assign customers to groups ────────────────────────────────────────────
  logger.info("━━ Step 3: Customer group assignments")
  const { data: allCustomers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const demoCustomers = allCustomers.filter((c: any) =>
    String(c.email ?? "").includes("@aurelia-demo.local")
  )

  const groupSlices: Array<{ group: string; slice: [number, number] }> = [
    { group: "VIP",              slice: [0,   20] },
    { group: "Mayoristas",       slice: [20,  60] },
    { group: "Retail",           slice: [60,  100] },
    { group: "Nuevos Clientes",  slice: [100, 130] },
    { group: "B2B Corporativo",  slice: [130, 150] },
  ]

  for (const { group, slice } of groupSlices) {
    const grp = groups[group]
    if (!grp) continue

    const customers = demoCustomers.slice(slice[0], slice[1])
    if (customers.length === 0) {
      logger.info(`  — ${group}: no customers in range, skipping`)
      continue
    }

    // Check which customers are already in this group
    const existingMemberships = await customerModuleService.listCustomerGroupCustomers({
      customer_group_id: grp.id,
    }).catch(() => [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alreadyInGroup = new Set(existingMemberships.map((m: any) => m.customer_id))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toAssign = customers.filter((c: any) => !alreadyInGroup.has(c.id))
    if (toAssign.length === 0) {
      logger.info(`  ✓ ${group}: all ${customers.length} customers already assigned`)
      continue
    }

    await customerModuleService.addCustomerToGroup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toAssign.map((c: any) => ({
        customer_id: c.id,
        customer_group_id: grp.id,
      }))
    )
    logger.info(`  + ${group}: assigned ${toAssign.length} customers`)
  }

  // ── 4. Price lists ────────────────────────────────────────────────────────────
  logger.info("━━ Step 4: Price lists")

  // Query variant IDs for the main jewelry catalog
  const jewelryHandles = [
    "aros-siena-dorado", "aros-argolla-fina-plateada", "aros-perla-baroque",
    "collar-luna-minimalista", "collar-capas-boho", "pulsera-boreal",
    "pulsera-eslabon-dorada", "set-vitrina-mix-x5", "set-coleccion-perlas",
    "kit-showroom-basico-x8",
  ]

  const { data: allVariants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "product.handle"],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jewelryVariants = allVariants.filter((v: any) =>
    jewelryHandles.includes(v?.product?.handle ?? "")
  )

  // Prices from seed-aurelia: static map as fallback
  const staticPrices: Record<string, number> = {
    "aros-siena-dorado": 18900,
    "aros-argolla-fina-plateada": 12500,
    "aros-perla-baroque": 28000,
    "collar-luna-minimalista": 24500,
    "collar-capas-boho": 32000,
    "pulsera-boreal": 15800,
    "pulsera-eslabon-dorada": 19500,
    "set-vitrina-mix-x5": 89000,
    "set-coleccion-perlas": 67000,
    "kit-showroom-basico-x8": 125000,
  }

  const priceListDefs = [
    {
      title: "Precios VIP — Temporada 2025",
      description: "Descuentos exclusivos para clientes del grupo VIP. 15% off en toda la colección principal.",
      type: "sale" as const,
      status: "active" as const,
      rules: groups["VIP"] ? { customer_group_id: [groups["VIP"].id] } : undefined,
      discount: 0.15,
    },
    {
      title: "Precios Mayoristas 2025",
      description: "Precios de costo para compradores mayoristas. 25% off. Requiere validación de CUIT.",
      type: "override" as const,
      status: "active" as const,
      rules: groups["Mayoristas"] ? { customer_group_id: [groups["Mayoristas"].id] } : undefined,
      discount: 0.25,
    },
  ]

  // Check existing price lists
  const { data: existingPriceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  }).catch(() => ({ data: [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPriceListTitles = new Set(existingPriceLists.map((pl: any) => pl.title))

  for (const plDef of priceListDefs) {
    if (existingPriceListTitles.has(plDef.title)) {
      logger.info(`  ✓ "${plDef.title}" (already exists)`)
      continue
    }

    // Build variant prices
    const prices = jewelryVariants.map((v: any) => {
      const basePrice = staticPrices[v?.product?.handle ?? ""] ?? 20000
      return {
        variant_id: v.id,
        currency_code: "ars",
        amount: Math.round(basePrice * (1 - plDef.discount)),
      }
    })

    try {
      const plInput: any = {
        title: plDef.title,
        description: plDef.description,
        type: plDef.type,
        status: plDef.status,
        prices,
      }
      if (plDef.rules) {
        plInput.rules = plDef.rules
      }

      await createPriceListsWorkflow(container).run({
        input: { price_lists_data: [plInput] },
      })
      logger.info(`  + Created "${plDef.title}" (${prices.length} variants, -${plDef.discount * 100}%)`)
    } catch (e: any) {
      logger.warn(`  ! Could not create "${plDef.title}": ${e.message}`)
    }
  }

  // ── 5. Marketing promotions ───────────────────────────────────────────────────
  logger.info("━━ Step 5: Marketing promotions")

  const campaigns = [
    { code: "BIENVENIDA20", value: 20, desc: "20% bienvenida nuevos clientes" },
    { code: "VIP25",        value: 25, desc: "25% exclusivo clientes VIP" },
    { code: "MAYOREO30",    value: 30, desc: "30% descuento compra mayorista" },
    { code: "NAVIDAD2024",  value: 25, desc: "Promoción navideña 2024 — 25% off" },
    { code: "BLACKFRIDAY35", value: 35, desc: "Black Friday — 35% en toda la tienda" },
    { code: "LIQUIDACION40", value: 40, desc: "Liquidación temporada anterior — 40% off" },
  ]

  for (const promo of campaigns) {
    const existing = await promotionService
      .listPromotions({ code: [promo.code] })
      .catch(() => [])

    if (existing.length > 0) {
      logger.info(`  ✓ ${promo.code} (already exists)`)
      continue
    }

    await promotionService.createPromotions([{
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
    }])
    logger.info(`  + ${promo.code} — ${promo.value}% (${promo.desc})`)
  }

  // ── 6. Historic orders (400 over 90 days) ────────────────────────────────────
  logger.info("━━ Step 6: Historic orders (90 days)")

  const ORDER_TARGET = 400
  const SEED_SOURCE = "aurelia_demo_v2"

  const { data: existingOrders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alreadySeeded = existingOrders.filter((o: any) =>
    o?.metadata?.seed_source === SEED_SOURCE
  )
  const ordersToCreate = Math.max(ORDER_TARGET - alreadySeeded.length, 0)

  if (ordersToCreate === 0) {
    logger.info(`  Already at target: ${alreadySeeded.length}/${ORDER_TARGET}`)
  } else {
    logger.info(`  Creating ${ordersToCreate} orders...`)

    // Product pool
    const productPool = [
      { title: "Aros Siena Dorado",         price: 18900 },
      { title: "Aros Argolla Fina Plateada", price: 12500 },
      { title: "Aros Perla Baroque",         price: 28000 },
      { title: "Collar Luna Minimalista",    price: 24500 },
      { title: "Collar Capas Boho",          price: 32000 },
      { title: "Pulsera Boreal",             price: 15800 },
      { title: "Pulsera Eslabón Dorada",     price: 19500 },
      { title: "Set Vitrina Mix x5",         price: 89000 },
      { title: "Set Colección Perlas",       price: 67000 },
      { title: "Kit Showroom Básico x8",     price: 125000 },
      { title: "Aurelia Aros Trendy",        price: 14900 },
      { title: "Aurelia Collar Fino",        price: 22500 },
      { title: "Aurelia Pulsera Doble",      price: 17800 },
      { title: "Aurelia Set Primavera",      price: 54000 },
    ]

    const shippingOptions = [
      { name: "Correo Argentino (3-5 días hábiles)", amount: 3900 },
      { name: "OCA Express (24-48h)",                amount: 7200 },
      { name: "Retiro en showroom CABA",             amount: 0    },
    ]

    const addresses = [
      { first_name: "María",    last_name: "García",     address_1: "Av. Santa Fe 1234",     city: "Buenos Aires", country_code: "ar", province: "caba", postal_code: "C1059" },
      { first_name: "Valentina",last_name: "López",      address_1: "Corrientes 3456",        city: "Buenos Aires", country_code: "ar", province: "caba", postal_code: "C1194" },
      { first_name: "Camila",   last_name: "Rodríguez",  address_1: "Av. Rivadavia 5678",     city: "Buenos Aires", country_code: "ar", province: "caba", postal_code: "C1406" },
      { first_name: "Sofía",    last_name: "Fernández",  address_1: "Cabildo 890",            city: "Buenos Aires", country_code: "ar", province: "caba", postal_code: "C1426" },
      { first_name: "Lucía",    last_name: "Martínez",   address_1: "Av. Callao 234",         city: "Córdoba",      country_code: "ar", province: "cor",  postal_code: "X5000" },
      { first_name: "Martina",  last_name: "Díaz",       address_1: "San Martín 567",         city: "Rosario",      country_code: "ar", province: "sf",   postal_code: "S2000" },
      { first_name: "Pilar",    last_name: "González",   address_1: "Peatonal 789",           city: "Mendoza",      country_code: "ar", province: "men",  postal_code: "M5500" },
      { first_name: "Emma",     last_name: "Ruiz",       address_1: "Belgrano 123",           city: "La Plata",     country_code: "ar", province: "ba",   postal_code: "B1900" },
      { first_name: "Alma",     last_name: "Torres",     address_1: "San Juan 456",           city: "Salta",        country_code: "ar", province: "sal",  postal_code: "A4400" },
      { first_name: "Juana",    last_name: "Romero",     address_1: "Mitre 321",              city: "Tucumán",      country_code: "ar", province: "tuc",  postal_code: "T4000" },
    ]

    const salesChannelList = Object.values(salesChannels)

    /**
     * Order status distribution (out of 100):
     *  0-39  → completed   (paid + fulfilled)
     * 40-64  → pending     (awaiting payment)
     * 65-84  → pending     with transaction (paid, not yet fulfilled)
     * 85-92  → canceled
     * 93-99  → requires_action
     */
    const getOrderConfig = (idx: number) => {
      const r = idx % 100
      if (r < 40) return { status: "completed",       hasTx: true  }
      if (r < 65) return { status: "pending",          hasTx: false }
      if (r < 85) return { status: "pending",          hasTx: true  }
      if (r < 93) return { status: "canceled",         hasTx: false }
      return            { status: "requires_action",   hasTx: false }
    }

    /**
     * Date distribution: growing business trend
     *  25% of orders  → days 60-89 ago  (early growth)
     *  32% of orders  → days 30-59 ago  (expansion)
     *  43% of orders  → days  0-29 ago  (peak activity)
     */
    const getDateRange = (i: number, total: number): [number, number] => {
      const pct = i / total
      if (pct < 0.25) return [60, 89]
      if (pct < 0.57) return [30, 59]
      return [0, 29]
    }

    interface BackdateRecord { id: string; targetDate: Date }
    const ordersToBackdate: BackdateRecord[] = []

    let createdCount = 0
    let globalIdx = alreadySeeded.length

    for (let i = 0; i < ordersToCreate; i++) {
      globalIdx++
      const { status, hasTx } = getOrderConfig(globalIdx)

      const customer = allCustomers.length > 0
        ? allCustomers[globalIdx % allCustomers.length]
        : null
      const email = (customer as any)?.email ?? `demo+${globalIdx}@aurelia-demo.local`
      const customerId: string | undefined = (customer as any)?.id

      const sc = salesChannelList[globalIdx % salesChannelList.length]
      const address = addresses[globalIdx % addresses.length]
      const shipping = shippingOptions[globalIdx % shippingOptions.length]

      const itemCount = rnd(1, 4)
      const items = Array.from({ length: itemCount }).map((_, k) => {
        const product = productPool[(globalIdx + k) % productPool.length]
        const qty = rnd(1, 3)
        const jitter = rnd(-2000, 3500)
        return {
          title: product.title,
          quantity: qty,
          unit_price: Math.max(8000, product.price + jitter),
        }
      })

      const itemsTotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
      const orderTotal = itemsTotal + shipping.amount

      const [dMin, dMax] = getDateRange(i, ordersToCreate)
      const targetDate = hoursAgoDate(rnd(dMin, dMax))

      try {
        const created = await orderModuleService.createOrders({
          region_id: argentinaRegion.id,
          sales_channel_id: sc.id,
          status,
          email,
          ...(customerId && { customer_id: customerId }),
          currency_code: "ars",
          shipping_address: { ...address },
          billing_address:  { ...address },
          items,
          shipping_methods: [{ name: shipping.name, amount: shipping.amount }],
          ...(hasTx && {
            transactions: [{
              amount: orderTotal,
              currency_code: "ars",
              reference: "payment",
              reference_id: `demo-pay-${globalIdx}`,
            }],
          }),
          metadata: {
            seed_source: SEED_SOURCE,
            seed_index:  globalIdx,
          },
        } as any) as any

        const orderId = created?.id
        if (orderId) {
          ordersToBackdate.push({ id: orderId, targetDate })
        }
        createdCount++
      } catch (e: any) {
        logger.warn(`  ! Order ${globalIdx} failed: ${e.message}`)
      }

      if ((createdCount > 0 && createdCount % 50 === 0) || i === ordersToCreate - 1) {
        logger.info(`  Progress: ${createdCount}/${ordersToCreate} orders created`)
      }
    }

    // ── 7. Backdate orders via pg ─────────────────────────────────────────────
    if (ordersToBackdate.length > 0) {
      logger.info(`━━ Step 7: Backdating ${ordersToBackdate.length} orders`)
      try {
        // pg is available as a transitive dependency of @medusajs/framework
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pgModule = require("pg")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pgClient: any = new pgModule.Client({
          connectionString: process.env.DATABASE_URL,
        })
        await pgClient.connect()

        let backdated = 0
        for (const { id, targetDate } of ordersToBackdate) {
          await pgClient.query(
            `UPDATE "order" SET created_at = $1, updated_at = $1 WHERE id = $2`,
            [targetDate.toISOString(), id]
          ).catch(() => {
            // Fallback: try with schema prefix
            return pgClient.query(
              `UPDATE public."order" SET created_at = $1, updated_at = $1 WHERE id = $2`,
              [targetDate.toISOString(), id]
            )
          })
          backdated++
        }

        await pgClient.end()
        logger.info(`  ✓ Backdated ${backdated} orders across 90-day window`)
      } catch (e: any) {
        logger.warn(`  ! Could not backdate order dates: ${e.message}`)
        logger.warn("  Orders were created but show today's date in charts.")
        logger.warn("  Ensure DATABASE_URL is set and pg is available in node_modules.")
      }
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  logger.info("═".repeat(60))
  logger.info("Demo historic seed complete! ✓")
  logger.info("")
  logger.info("What was created:")
  logger.info("  4 sales channels  → Mayoristas Web, Instagram, WhatsApp, Feria")
  logger.info("  5 customer groups → VIP, Mayoristas, Retail, Nuevos, B2B")
  logger.info("  120 customers     → distributed across groups")
  logger.info("  2 price lists     → VIP -15%, Mayoristas -25%")
  logger.info("  6 promotions      → BIENVENIDA20, VIP25, MAYOREO30, NAVIDAD2024,")
  logger.info("                       BLACKFRIDAY35, LIQUIDACION40")
  logger.info("  400 orders        → spread over 90 days, mixed statuses")
  logger.info("")
  logger.info("Open the Medusa Admin to explore the data:")
  logger.info("  http://localhost:9000/app")
  logger.info("═".repeat(60))
}
