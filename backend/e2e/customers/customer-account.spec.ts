import { test, expect } from "@playwright/test";

import {
  captureOrderPayment,
  createFreshOrder,
  createOrderableProduct,
  fulfillOrder,
  getPublishableKey,
  registerCustomer,
  type RegisteredCustomer,
} from "../_seed";

/**
 * Customer account workflow E2E (API layer the storefront /account page consumes).
 *
 * Covers: registration creates a usable account, the customer appears correctly
 * in the backend, a customer-linked order shows up in their /store/orders list,
 * and the order's payment/fulfillment status progresses (captured → fulfilled →
 * shipped → delivered) as the account page's tracking stepper expects.
 *
 * Each test registers its own customer (unique email) and deletes it afterwards.
 */
test.describe("Customer account workflow", () => {
  let customer: RegisteredCustomer | null = null;
  let orderIds: string[] = [];
  let productIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Cancel created orders first to release their inventory reservations, so
    // their dedicated products can then be deleted. Delivered orders cannot be
    // cancelled (and hold no reservation) — ignore those failures.
    for (const orderId of orderIds) {
      await request.post(`/admin/orders/${orderId}/cancel`, { data: {} }).catch(() => null);
    }
    for (const productId of productIds) {
      await request.delete(`/admin/products/${productId}`).catch(() => null);
    }
    orderIds = [];
    productIds = [];
    if (customer) {
      await request.delete(`/admin/customers/${customer.customerId}`).catch(() => null);
      customer = null;
    }
  });

  test("registration creates a customer that appears in the backend with name and email", async ({
    request,
  }) => {
    customer = await registerCustomer(request, { firstName: "Valentina", lastName: "Gómez" });

    const res = await request.get(
      `/admin/customers?q=${encodeURIComponent(customer.email)}&fields=id,email,first_name,last_name`
    );
    expect(res.ok(), `admin customer lookup failed (${res.status()})`).toBeTruthy();
    const { customers } = await res.json();
    const found = customers?.find((c: { email?: string }) => c.email === customer!.email);

    expect(found, "the registered customer should exist in the backend").toBeTruthy();
    expect(found.id).toBe(customer.customerId);
    expect(found.first_name).toBe("Valentina");
    expect(found.last_name).toBe("Gómez");
  });

  test("a customer-linked order appears in the customer's store order list", async ({ request }) => {
    customer = await registerCustomer(request);
    const product = await createOrderableProduct(request);
    productIds.push(product.productId);
    const orderId = await createFreshOrder(
      request,
      { token: customer.token, email: customer.email },
      product.variantId
    );
    orderIds.push(orderId);

    const pk = await getPublishableKey(request);
    const headers = { "x-publishable-api-key": pk, Authorization: `Bearer ${customer.token}` };

    // The order must be linked to the customer (account page relies on this).
    const orderRes = await request.get(`/store/orders/${orderId}?fields=id,customer_id`, { headers });
    expect(orderRes.ok(), `store order fetch failed (${orderRes.status()})`).toBeTruthy();
    expect((await orderRes.json()).order.customer_id).toBe(customer.customerId);

    // sdk.store.order.list() — exactly what /account calls — returns it.
    const listRes = await request.get("/store/orders?limit=20&fields=id,display_id", { headers });
    expect(listRes.ok(), `store order list failed (${listRes.status()})`).toBeTruthy();
    const { orders } = await listRes.json();
    expect(orders.some((o: { id: string }) => o.id === orderId), "order should be in the list").toBe(true);
  });

  test("order status progresses to captured + delivered and is visible to the customer", async ({
    request,
  }) => {
    customer = await registerCustomer(request);
    const product = await createOrderableProduct(request);
    productIds.push(product.productId);
    const orderId = await createFreshOrder(
      request,
      { token: customer.token, email: customer.email },
      product.variantId
    );
    orderIds.push(orderId);

    await captureOrderPayment(request, orderId);
    await fulfillOrder(request, orderId, { ship: true, deliver: true });

    const pk = await getPublishableKey(request);
    const headers = { "x-publishable-api-key": pk, Authorization: `Bearer ${customer.token}` };

    const res = await request.get(
      `/store/orders/${orderId}?fields=id,status,payment_status,fulfillment_status`,
      { headers }
    );
    expect(res.ok(), `store order fetch failed (${res.status()})`).toBeTruthy();
    const { order } = await res.json();
    expect(order.payment_status, "payment should be captured").toBe("captured");
    expect(order.fulfillment_status, "fulfillment should be delivered").toBe("delivered");
  });
});
